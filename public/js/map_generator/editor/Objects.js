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
        resolve(group);
    });
}

export async function addStructure(type, x = 0, z = 0) {
    return addStructureResult(type, x, z);
}

export function addSpawnAt(x, z, color = 0x00ff00) {
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    geo.translate(0, 1, 0); // Pivot at bottom
    const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: color })
    );
    mesh.userData = { type: 'spawn', color: color, id: `spawn_${Date.now()}`, isRoot: true };
    mesh.position.set(x, 0, z);
    state.scene.add(mesh);
    state.objects.push(mesh);
    return mesh;
}

export function addEnemyAt(type, x, z) {
    const geo = new THREE.CapsuleGeometry(0.5, 2, 4);
    geo.translate(0, 1.5, 0); // Pivot at bottom (2/2 + 0.5 = 1.5)
    const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    mesh.userData = { type: 'enemy', enemyType: type, id: `${type}_${Date.now()}`, isRoot: true };
    mesh.position.set(x, 0, z);
    state.scene.add(mesh);
    state.objects.push(mesh);
    return mesh;
}

export function addSpawn() {
    addSpawnAt(0, 0);
}

export function addEnemy(type) {
    addEnemyAt(type || 'Alistar', 2, 2);
}

export function addPlaceholder(type, x, z, color) {
    const geo = new THREE.ConeGeometry(0.5, 2, 8);
    geo.translate(0, 1, 0); // Pivot at bottom
    const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: color })
    );

    mesh.userData = { type: type, id: `${type}_${Date.now()}_${Math.random()}`, isRoot: true };
    mesh.position.set(x, 0, z);
    state.scene.add(mesh);
    state.objects.push(mesh);
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

export function addRoad(len, x, z, rot) {
    const material = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    const geo = new THREE.BoxGeometry(6, 0.1, len);
    geo.translate(0, 0.05, 0); // Pivot at bottom
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rot;
    mesh.userData = { type: 'road', len: len, id: `road_${Date.now()}_${Math.random()}`, isRoot: true };

    state.scene.add(mesh);
    state.objects.push(mesh);
    return mesh;
}

export function addExitAt(x, z, color = 0x00ffff) {
    const geometry = new THREE.TorusGeometry(1, 0.1, 8, 24);
    geometry.rotateX(Math.PI / 2); // Lay flat
    // Pivot is center of torus (0,0,0). With rotateX, it is flat on ground.
    // Tube is 0.1. So it goes from -0.1 to 0.1 in Y?
    // If I want it ON ground, I should lift it by 0.05?
    // Or just set pos.y = 0.

    const material = new THREE.MeshStandardMaterial({ color: color, emissive: 0x000000 });
    material.emissive = new THREE.Color(color).multiplyScalar(0.2);

    const mesh = new THREE.Mesh(geometry, material);

    mesh.userData = { type: 'exit', color: color, id: `exit_${Date.now()}_${Math.random()}`, isRoot: true };
    mesh.position.set(x, 0, z);

    state.scene.add(mesh);
    state.objects.push(mesh);
    return mesh;
}

export function addExit() {
    addExitAt(0, 0); // Default Cyan? Or maybe White? Default 0x00ffff
}

export function addDefaultSpawnsAndExits() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff]; // Red, Green, Blue

    // 3 Spawns in a triangle (Radius 3)
    const spawnRadius = 3;
    for (let i = 0; i < 3; i++) {
        const angle = (i * 120) * (Math.PI / 180);
        const x = Math.sin(angle) * spawnRadius;
        const z = Math.cos(angle) * spawnRadius;
        addSpawnAt(x, z, colors[i]);
    }

    // 3 Exits in a triangle (Radius 8)
    const exitRadius = 8;
    for (let i = 0; i < 3; i++) {
        const angle = (i * 120 + 60) * (Math.PI / 180); // Offset by 60 deg
        const x = Math.sin(angle) * exitRadius;
        const z = Math.cos(angle) * exitRadius;
        addExitAt(x, z, colors[i]);
    }
}
