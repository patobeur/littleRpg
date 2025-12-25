import * as THREE from 'three';
import { meshCache } from '../MeshCache.js';

export class StructureManager {
    constructor(game) {
        this.game = game;
        this.structures = new Map(); // id -> { model, stats, radius }
    }

    async loadStructures(structureList) {
        console.log(`[StructureManager] Loading ${structureList.length} structures...`);

        // Clear existing structures
        this.structures.forEach(s => {
            if (s.model) this.game.sceneManager.scene.remove(s.model);
        });
        this.structures.clear();

        for (const structDef of structureList) {
            const modelPath = structDef.modelPath || `/structures/${structDef.type}.fbx`;

            try {
                // Use centralized mesh cache to get a clone
                const fbx = await meshCache.clone(modelPath);
                console.log(`[StructureManager] ✓ Model ready for ${structDef.id} (${structDef.type})`);

                // Create a container group to match Editor logic
                const group = new THREE.Group();
                // FIXE: Force Y=0 (Editor logic) - structDef.position.y peut être négatif
                group.position.set(structDef.position.x, 0, structDef.position.z);

                const finalScale = structDef.scale || 1;
                // Apply intrinsic rotation/scale to the model
                fbx.scale.setScalar(finalScale);
                // Rotation -90° X pour tous les FBX (comme dans l'éditeur)
                fbx.rotation.x = -Math.PI / 2;

                // Add shadow props
                fbx.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Safe material side setting (handle arrays)
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.side = THREE.DoubleSide);
                            } else {
                                child.material.side = THREE.DoubleSide;
                            }
                        }
                    }
                });

                fbx.name = structDef.type;
                console.log(fbx);
                group.add(fbx);

                // NOTE: Group rotation désactivée car elle entre en conflit avec fbx.rotation.x = -PI/2
                // L'éditeur gère rotation via le Group, mais ici on l'applique directement au FBX

                this.game.sceneManager.scene.add(group);


                this.structures.set(structDef.id, {
                    id: structDef.id,
                    model: group, // Store group as the main model object
                    stats: structDef.stats,
                    radius: structDef.radius || 3
                });

            } catch (err) {
                console.error(`Failed to load structure ${structDef.id}:`, err);
            }
        }

    }
}
