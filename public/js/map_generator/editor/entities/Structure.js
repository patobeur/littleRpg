import * as THREE from 'three';
import { state } from '../State.js';

export function addStructureResult(type, x, z) {
    return new Promise((resolve) => {
        // Get metadata from cache
        const metadata = window.structureMetadata?.get(type);
        const fbxFile = metadata?.fbx || `${type}.fbx`; // Fallback to type.fbx
        const scale = metadata?.scale || 1;

        const modelPath = `/models/structures/${fbxFile}`;
        const group = new THREE.Group();
        group.userData = { type: type, id: `${type}_${Date.now()}`, isRoot: true };

        state.loader.load(modelPath, (fbx) => {
            fbx.scale.setScalar(0.01 * scale);
            if (type === 'house') {
                fbx.rotation.x = -Math.PI / 2;
            }
            fbx.traverse(c => { if (c.isMesh) c.castShadow = true; });
            group.add(fbx);
            resolve(group); // Resolve after load
        }, undefined, (err) => {
            console.error(`Failed to load ${modelPath}:`, err);
            const geom = new THREE.BoxGeometry(2, 2, 2);
            geom.translate(0, 1, 0); // Pivot at bottom
            const mesh = new THREE.Mesh(
                geom,
                new THREE.MeshStandardMaterial({ color: 0x885522 })
            );
            group.add(mesh);
            resolve(group);
        });

        group.position.set(x, 0, z); // Always 0
        state.scene.add(group);
        state.objects.push(group);
    });
}

export async function addStructure(type, x = 0, z = 0) {
    return addStructureResult(type, x, z);
}
