import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class EnemyManager {
    constructor(game) {
        this.game = game;
        this.enemies = new Map(); // id -> { model, mixer, actions, stats }
        this.mixers = [];
    }

    async loadEnemies(enemyList) {
        console.log(`[EnemyManager] Loading ${enemyList.length} enemies...`);

        // Clear existing enemies
        this.enemies.forEach(e => {
            if (e.model) this.game.sceneManager.scene.remove(e.model);
            if (e.hud) e.hud.remove();
        });
        this.enemies.clear();
        this.mixers = []; // Clear old mixers

        const loader = new FBXLoader();

        for (const enemyState of enemyList) {
            const modelPath = enemyState.modelPath || `/archetypes/${enemyState.type}.fbx`; // Fallback

            try {
                console.log(`Loading model for enemy ${enemyState.name}: ${modelPath}`);
                const fbx = await new Promise((resolve, reject) => {
                    loader.load(modelPath, resolve, undefined, reject);
                });

                fbx.scale.setScalar(0.01 * (enemyState.scale || 1));
                fbx.position.set(enemyState.position.x, enemyState.position.y, enemyState.position.z);

                // Shadows
                fbx.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.game.sceneManager.scene.add(fbx);

                const mixer = new THREE.AnimationMixer(fbx);
                this.mixers.push(mixer);
                const actions = {};

                // 1. Setup Idle (generic load, similar to players)
                if (fbx.animations && fbx.animations.length > 0) {
                    const idleClip = fbx.animations.find(clip =>
                        clip.name.toLowerCase().includes('idle') ||
                        clip.name.toLowerCase().includes('mixamo')
                    ) || fbx.animations[0];
                    actions['idle'] = mixer.clipAction(idleClip);
                }

                // Load specialized animations from config
                if (enemyState.animations) {
                    // Walk
                    if (enemyState.animations.walk_path) {
                        try {
                            const walkPath = `/${enemyState.animations.walk_path}`;
                            const walkFbx = await new Promise((resolve, reject) => {
                                loader.load(walkPath, resolve, undefined, reject);
                            });
                            if (walkFbx.animations && walkFbx.animations.length > 0) {
                                actions['walk'] = mixer.clipAction(walkFbx.animations[0]);
                            }
                        } catch (err) {
                            console.warn(`[EnemyManager] Failed to load walk animation for ${enemyState.name}`, err);
                        }
                    }
                }

                // Use radius from server config
                const calculatedRadius = enemyState.radius || 0.4;
                console.log(`[EnemyManager] Radius for enemy ${enemyState.type}: ${calculatedRadius}`);

                // Create HUD
                const hud = this.createEnemyHUD({
                    id: enemyState.id,
                    name: enemyState.name,
                    level: enemyState.lv || 4,
                    stats: { hp: enemyState.hp, maxHp: enemyState.maxHp }
                });

                this.enemies.set(enemyState.id, {
                    id: enemyState.id,
                    name: enemyState.name,
                    model: fbx,
                    mixer: mixer,
                    actions: actions,
                    currentActionName: 'idle',
                    stats: { hp: enemyState.hp, maxHp: enemyState.maxHp },
                    radius: calculatedRadius,
                    hud: hud
                });

                if (actions['idle']) actions['idle'].play();

            } catch (error) {
                console.error(`Failed to load enemy ${enemyState.name}:`, error);
                // Fallback: Red Box
                const geom = new THREE.BoxGeometry(1, 2, 1);
                const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                const cube = new THREE.Mesh(geom, mat);
                cube.position.set(enemyState.position.x, 1, enemyState.position.z);
                this.game.sceneManager.scene.add(cube);
            }
        }
    }

    update(delta) {
        this.mixers.forEach(mixer => mixer.update(delta));
    }

    // --- HUD Management ---

    createEnemyHUD(enemy) {
        const hud = document.createElement('div');
        hud.className = 'entity-hud';
        hud.id = `hud-${enemy.id}`;

        // Calculate HP %
        const resultHp = enemy.stats.hp !== undefined ? enemy.stats.hp : 100;
        const resultMaxHp = enemy.stats.maxHp !== undefined ? enemy.stats.maxHp : 100;
        const hpPercent = (resultHp / resultMaxHp) * 100;

        hud.innerHTML = `
            <div class="entity-name">${enemy.name} <span class="entity-level">Lv.${enemy.level || 4}</span></div>
            <div class="stat-bar-container"><div class="stat-bar-fill hp-fill" style="width: ${hpPercent}%"></div></div>
            <div class="stat-bar-container"><div class="stat-bar-fill mana-fill" style="width: 100%"></div></div>
        `;

        document.body.appendChild(hud);
        return hud;
    }

    removeEnemyHUD(id) {
        const hud = document.getElementById(`hud-${id}`);
        if (hud) hud.remove();
    }

    updateHUDPositions(camera) {
        for (const [id, enemy] of this.enemies) {
            if (!enemy.model || !enemy.hud) continue;

            const headPos = enemy.model.position.clone();
            // Use stored radius to estimate height, or default
            const heightOffset = (enemy.radius || 0.5) * 4;
            headPos.y += heightOffset;

            // Project 3D to 2D
            headPos.project(camera);

            const x = (headPos.x * .5 + .5) * window.innerWidth;
            const y = (-(headPos.y * .5) + .5) * window.innerHeight;

            // Only show if in front of camera and reasonably close
            if (headPos.z < 1 && headPos.z > -1) {
                enemy.hud.style.display = 'flex';
                enemy.hud.style.left = `${x}px`;
                enemy.hud.style.top = `${y}px`;
            } else {
                enemy.hud.style.display = 'none';
            }
        }
    }

    updateEnemyStats(id, stats) {
        const enemy = this.enemies.get(id);
        if (!enemy || !enemy.hud) return;

        // Update local stats
        if (stats.hp !== undefined) enemy.stats.hp = stats.hp;
        if (stats.maxHp !== undefined) enemy.stats.maxHp = stats.maxHp;

        // Update UI
        const hpFill = enemy.hud.querySelector('.hp-fill');
        const hpPercent = (enemy.stats.hp / enemy.stats.maxHp) * 100;
        if (hpFill) hpFill.style.width = `${Math.max(0, hpPercent)}%`;
    }
}
