import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class InteractableManager {
    constructor(game) {
        this.game = game;
        this.interactables = new Map(); // id -> { model, data }
        this.interactableList = []; // For easy iteration
        this.loader = new FBXLoader();

        this.interactionRange = 2.0;
        this.closestInteractable = null;
    }

    async loadInteractables(list) {
        console.log(`[InteractableManager] Loading ${list.length} interactables...`);

        // Clear existing
        this.interactables.forEach(i => {
            if (i.model) this.game.sceneManager.scene.remove(i.model);
        });
        this.interactables.clear();
        this.interactableList = [];

        for (const data of list) {
            try {
                let model;

                // Load Model
                if (data.model) {
                    // Try exact path from root if starts with /
                    const cleanPath = data.model.startsWith('/') ? data.model : `/${data.model}`;

                    model = await new Promise((resolve, reject) => {
                        this.loader.load(cleanPath, resolve, undefined, reject);
                    });
                    console.log(`[InteractableManager] Loaded model for ${data.id}`);
                } else {
                    // Placeholder Box
                    const geom = new THREE.BoxGeometry(1, 1, 1);
                    const mat = new THREE.MeshStandardMaterial({ color: 0xffff00 });
                    model = new THREE.Mesh(geom, mat);
                }

                model.position.set(data.position.x, data.position.y || 0, data.position.z);
                const baseScale = 0.01;
                const dynamicScale = data.scale || 1;
                model.scale.setScalar(baseScale * dynamicScale);

                // Shadows
                model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Add to scene
                this.game.sceneManager.scene.add(model);
                console.log(`[InteractableManager] ✅ DISPLAYED ${data.name || data.id} at [${model.position.x}, ${model.position.y}, ${model.position.z}]`);

                // Setup Animation (Idle)
                let mixer = null;
                if (model.animations && model.animations.length > 0) {
                    mixer = new THREE.AnimationMixer(model);
                    const clip = model.animations.find(c => c.name.toLowerCase().includes('idle')) || model.animations[0];
                    const action = mixer.clipAction(clip);
                    action.play();
                }

                const interactable = {
                    id: data.id,
                    data: data,
                    model: model,
                    mixer: mixer,
                    position: new THREE.Vector3(data.position.x, data.position.y || 0, data.position.z),
                    time: Math.random() * 100 // Random start time for floating
                };

                // Add Indicator to Scene (not model, to avoid scale issues)
                const indicator = this.createIndicator();
                if (indicator) {
                    indicator.position.copy(model.position);
                    indicator.position.y += 1.0; // 2 meters high
                    this.game.sceneManager.scene.add(indicator);
                    interactable.indicator = indicator;
                }

                this.interactables.set(data.id, interactable);
                this.interactableList.push(interactable);

            } catch (err) {
                console.error(`[InteractableManager] Failed to load ${data.id}:`, err);

                // Fallback: Create indicator anyway so we can interact/debug
                const indicator = this.createIndicator();
                if (indicator) {
                    indicator.position.set(data.position.x, (data.position.y || 0) + 2.0, data.position.z);
                    this.game.sceneManager.scene.add(indicator);

                    const interactable = {
                        id: data.id,
                        data: data,
                        model: null, // No model
                        indicator: indicator,
                        position: new THREE.Vector3(data.position.x, data.position.y || 0, data.position.z),
                        time: Math.random() * 100
                    };
                    this.interactables.set(data.id, interactable);
                    this.interactableList.push(interactable);
                }
            }
        }
    }

    update(delta) {
        // Update Animations & Indicators
        this.interactables.forEach(i => {
            if (i.mixer) i.mixer.update(delta);

            // Floating Indicator Animation
            if (i.indicator) {
                i.time += delta * 2;
                i.indicator.position.copy(i.position);
                i.indicator.position.y += 2.2 + Math.sin(i.time) * 0.1; // Bobbing around 2.2m height from ground
                i.indicator.rotation.y += delta; // Spin
            }
        });

        // Check for nearby interactables
        if (!this.game.entityManager.localCharacterId) return;

        const player = this.game.entityManager.playerData.get(this.game.entityManager.localCharacterId);
        if (!player || !player.model) return;

        const playerPos = player.model.position;
        let closest = null;
        let minDist = Infinity;

        for (const interactable of this.interactableList) {
            const dist = playerPos.distanceTo(interactable.position);
            if (dist <= this.interactionRange && dist < minDist) {
                minDist = dist;
                closest = interactable;
            }
        }

        if (closest !== this.closestInteractable) {
            this.closestInteractable = closest;
            if (closest) {
                this.game.uiManager.showInteractionPrompt(`Appuyez sur E pour interagir avec ${closest.data.name || 'Objet'}`);
            } else {
                this.game.uiManager.hideInteractionPrompt();
            }
        }
    }

    interact() {
        if (this.closestInteractable) {
            console.log(`[Interaction] Interacting with ${this.closestInteractable.id}`);
            this.game.networkManager.socket.emit('player_interact', {
                interactableId: this.closestInteractable.id
            });
        }
    }

    updateState(id, state) {
        const interactable = this.interactables.get(id);
        if (interactable) {
            Object.assign(interactable.data, state);
            // Visual updates (e.g., open chest animation)
            if (state.opened) {
                // Play open anim if exists
            }
        }
    }
    createIndicator() {
        // Yellow Cone pointing down (World Scale)
        const geom = new THREE.ConeGeometry(0.15, 0.4, 8); // 20cm wide, 50cm high
        geom.rotateX(Math.PI); // Point down
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8, depthTest: false }); // depthTest false to see through walls if needed? Maybe just on top.
        const mesh = new THREE.Mesh(geom, mat);
        mesh.renderOrder = 999; // Force render on top
        return mesh;
    }
}
