import * as THREE from 'three';
import { state } from './State.js';

export function addStructureResult(type, x, z) {
    return new Promise((resolve) => {
        const modelPath = `/structures/${type}.fbx`;
        const group = new THREE.Group();
        group.userData = { type: type, id: `${type}_${Date.now()}`, isRoot: true };

        state.loader.load(modelPath, (fbx) => {
            fbx.scale.setScalar(1);
            if (type === 'house') {
                fbx.rotation.x = -Math.PI / 2;
            }
            fbx.traverse(c => { if (c.isMesh) c.castShadow = true; });
            group.add(fbx);
            resolve(group); // Resolve after load
        }, undefined, (err) => {
            console.error(err);
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshStandardMaterial({ color: 0x885522 })
            );
            mesh.position.y = 1;
            group.add(mesh);
            resolve(group);
        });

        group.position.set(x, 0, z);
        state.scene.add(group);
        state.objects.push(group);
        // DO NOT resolve here if we wait for load, but logically group is added immediately.
        // If caller needs dimensions, wait for load. 
        // Current usage: caller rotates. Group rotation is fine.
        resolve(group);
    });
}

export async function addStructure(type, x = 0, z = 0) {
    return addStructureResult(type, x, z);
}

export function addSpawnAt(x, z) {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    mesh.userData = { type: 'spawn', id: `spawn_${Date.now()}`, isRoot: true };
    mesh.position.set(x, 1, z);
    state.scene.add(mesh);
    state.objects.push(mesh);
    return mesh;
}

export function addEnemyAt(type, x, z) {
    const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5, 2, 4),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    mesh.userData = { type: 'enemy', enemyType: type, id: `${type}_${Date.now()}`, isRoot: true };
    mesh.position.set(x, 1, z);
    state.scene.add(mesh);
    state.objects.push(mesh);
    return mesh;
}

export function addSpawn() {
    addSpawnAt(0, 0);
}

export function addEnemy(type) {
    addEnemyAt(type, 2, 2);
}

export function addPlaceholder(type, x, z, color) {
    const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 2, 8),
        new THREE.MeshStandardMaterial({ color: color })
    );
    mesh.position.set(x, 1, z);
    state.scene.add(mesh);
    // state.objects.push(mesh); // Optional
}

export function deleteSelected() {
    if (state.selectedObject) {
        state.scene.remove(state.selectedObject);
        state.gizmo.detach();
        const index = state.objects.indexOf(state.selectedObject);
        if (index > -1) state.objects.splice(index, 1);
        state.selectedObject = null;
    }
}
