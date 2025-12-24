import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { setModelOpacity } from '../Utils.js';

export class PlayerManager {
    constructor(game) {
        this.game = game;
        this.playerData = new Map(); // Store { model, mixer, actions, currentActionName, targetPosition, ... }
        this.mixers = [];
        this.localCharacterId = null;
        this.targetModel = null;
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
                // this.game.entityManager.models.set(player.characterId, fbx); // Legacy model tracking if needed, or just use playerData

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
                console.log(`[PlayerManager] Radius for ${player.name}: ${calculatedRadius}`);

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
}
