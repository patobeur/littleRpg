import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { setModelOpacity } from './Utils.js';

export class EntityManager {
    constructor(game) {
        this.game = game;
        this.models = new Map();
        this.mixers = [];
        this.playerData = new Map(); // Store { model, mixer, actions, currentActionName, targetPosition, ... }
        this.localCharacterId = null;
        this.targetModel = null;

        // Enemies
        this.enemies = new Map(); // id -> { model, mixer, actions, stats }
        this.structures = new Map(); // id -> { model, stats, radius }
    }

    async loadPlayers(players, localCharacterId) {
        this.localCharacterId = localCharacterId;
        const loader = new FBXLoader();
        const spacing = 4;
        const startX = -(players.length - 1) * spacing / 2;

        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const modelPath = `/archetypes/${player.class.toLowerCase()}.fbx`;

            try {
                console.log(`Loading model for ${player.name}: ${modelPath}`);
                const fbx = await new Promise((resolve, reject) => {
                    loader.load(modelPath, resolve, undefined, reject);
                });

                fbx.scale.setScalar(0.01 * (player.scale || 1));
                fbx.position.set(0, 0, 0); // Position will be set by server
                fbx.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Start invisible
                fbx.visible = false;
                setModelOpacity(fbx, 0);

                this.game.sceneManager.scene.add(fbx);
                this.models.set(player.characterId, fbx);

                const mixer = new THREE.AnimationMixer(fbx);
                this.mixers.push(mixer);
                const actions = {};

                // 1. Setup Idle
                if (fbx.animations && fbx.animations.length > 0) {
                    const idleClip = fbx.animations.find(clip =>
                        clip.name.toLowerCase().includes('idle') ||
                        clip.name.toLowerCase().includes('mixamo')
                    ) || fbx.animations[0];

                    actions['idle'] = mixer.clipAction(idleClip);
                }

                // 2. Load Walk
                const walkPath = `/archetypes/animations/${player.class.toLowerCase()}_Walk.fbx`;
                try {
                    const walkFbx = await new Promise((resolve, reject) => {
                        loader.load(walkPath, resolve, undefined, reject);
                    });
                    if (walkFbx.animations && walkFbx.animations.length > 0) {
                        const walkClip = walkFbx.animations[0];
                        actions['walk'] = mixer.clipAction(walkClip);
                    }
                } catch (err) {
                    console.warn(`No walk animation for ${player.class}`);
                }

                // Use radius from server config
                const calculatedRadius = player.radius || 0.25;
                console.log(`[EntityManager] Radius for ${player.name}: ${calculatedRadius}`);

                // Store player data
                this.playerData.set(player.characterId, {
                    model: fbx,
                    mixer: mixer,
                    actions: actions,
                    currentActionName: 'idle',
                    positionSet: false,
                    radius: calculatedRadius, // Store radius
                    fallbackSpawn: { x: startX + i * spacing, y: 0, z: 0 },
                    disconnected: false
                });

                // Play idle
                if (actions['idle']) {
                    actions['idle'].play();
                }

                if (player.characterId === this.localCharacterId) {
                    this.targetModel = fbx;
                }

            } catch (error) {
                console.error(`Failed to load model for ${player.name}:`, error);
                // Fallback: simple box
                const geom = new THREE.BoxGeometry(1, 2, 1);
                const mat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6 });
                const cube = new THREE.Mesh(geom, mat);
                cube.position.set(startX + i * spacing, 1, 0);
                this.game.sceneManager.scene.add(cube);
            }
        }
    }

    async loadEnemies(enemyList) {
        console.log(`[EntityManager] Loading ${enemyList.length} enemies...`);

        // Clear existing enemies
        this.enemies.forEach(e => {
            if (e.model) this.game.sceneManager.scene.remove(e.model);
        });
        this.enemies.clear();

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
                            console.warn(`[EntityManager] Failed to load walk animation for ${enemyState.name}`, err);
                        }
                    }
                }

                // Use radius from server config
                const calculatedRadius = enemyState.radius || 0.4;
                console.log(`[EntityManager] Radius for enemy ${enemyState.type}: ${calculatedRadius}`);

                // Create HUD
                const hud = this.createEnemyHUD({
                    id: enemyState.id,
                    name: enemyState.name,
                    level: enemyState.lv || 4,
                    stats: { hp: enemyState.hp, maxHp: enemyState.maxHp }
                });

                this.enemies.set(enemyState.id, {
                    id: enemyState.id,
                    name: enemyState.name, // Added name
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

    async loadStructures(structureList) {
        console.log(`[EntityManager] Loading ${structureList.length} structures...`);
        const loader = new FBXLoader();

        // Clear existing structures
        this.structures.forEach(s => {
            if (s.model) this.game.sceneManager.scene.remove(s.model);
        });
        this.structures.clear();

        for (const structDef of structureList) {
            const modelPath = structDef.modelPath || `/structures/${structDef.type}.fbx`;

            try {
                const fbx = await new Promise((resolve, reject) => {
                    loader.load(modelPath, resolve, undefined, reject);
                });

                const finalScale = structDef.scale || 1;
                fbx.scale.setScalar(finalScale); // Removed 0.01 factor
                fbx.position.set(structDef.position.x, structDef.position.y, structDef.position.z);

                // Apply rotation if provided
                if (structDef.rotation) {
                    fbx.rotation.set(
                        THREE.MathUtils.degToRad(structDef.rotation.x),
                        THREE.MathUtils.degToRad(structDef.rotation.y),
                        THREE.MathUtils.degToRad(structDef.rotation.z)
                    );
                }

                fbx.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.game.sceneManager.scene.add(fbx);

                this.structures.set(structDef.id, {
                    id: structDef.id,
                    model: fbx,
                    stats: structDef.stats,
                    radius: structDef.radius || 3
                });
                console.log(`[EntityManager] Loaded structure ${structDef.id} at (${structDef.position.x}, ${structDef.position.y}, ${structDef.position.z}) with scale ${finalScale}`);

            } catch (err) {
                console.error(`Failed to load structure ${structDef.id}:`, err);
            }
        }
    }

    update(delta) {
        this.mixers.forEach(mixer => mixer.update(delta));

        // Interpolation for remote players
        this.playerData.forEach((pd, charId) => {
            if (charId !== this.localCharacterId && pd.positionSet) {
                if (pd.targetPosition) {
                    pd.model.position.lerp(pd.targetPosition, 0.2);
                }
                if (pd.targetRotation !== undefined) {
                    pd.model.rotation.y = THREE.MathUtils.lerp(pd.model.rotation.y, pd.targetRotation, 0.2);
                }
                if (pd.targetAnimation) {
                    this.fadeToAction(charId, pd.targetAnimation, 0.2, pd.targetTimeScale || 1);
                }
            }
        });
    }

    fadeToAction(characterId, name, duration = 0.2, timeScale = 1) {
        const data = this.playerData.get(characterId);
        if (!data || !data.actions[name]) return;

        // If it's the same action, just update timeScale
        if (data.currentActionName === name) {
            data.actions[name].setEffectiveTimeScale(timeScale);
            data.currentTimeScale = timeScale;
            return;
        }

        const currentAction = data.actions[data.currentActionName];
        const nextAction = data.actions[name];

        if (currentAction) currentAction.fadeOut(duration);

        nextAction
            .reset()
            .setEffectiveTimeScale(timeScale)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();

        data.currentActionName = name;
        data.currentTimeScale = timeScale;
    }

    // --- HUD Management ---

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
