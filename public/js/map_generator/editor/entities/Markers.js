import * as THREE from 'three';
import { state } from '../State.js';

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

export function addSpawn() {
    addSpawnAt(0, 0);
}

export function addExitAt(x, z, color = 0x00ffff) {
    const geometry = new THREE.TorusGeometry(1, 0.1, 8, 24);
    geometry.rotateX(Math.PI / 2); // Lay flat

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
    addExitAt(0, 0);
}

export function addDefaultSpawnsAndExits() {
    const maxPlayers = window.gameConfig?.gameSettings?.maxLobbyPlayers || 3;
    const colors = [];

    // Generate colors dynamically
    for (let i = 0; i < maxPlayers; i++) {
        const hue = (i * 360 / maxPlayers) / 360;
        const color = new THREE.Color().setHSL(hue, 1, 0.5);
        colors.push(color.getHex());
    }

    // Spawns in a triangle/polygon (Radius 3)
    const spawnRadius = 3;
    for (let i = 0; i < maxPlayers; i++) {
        const angle = (i * 360 / maxPlayers) * (Math.PI / 180);
        const x = Math.sin(angle) * spawnRadius;
        const z = Math.cos(angle) * spawnRadius;
        addSpawnAt(x, z, colors[i]);
    }

    // Exits in a triangle/polygon (Radius 8)
    const exitRadius = 8;
    for (let i = 0; i < maxPlayers; i++) {
        const angle = ((i * 360 / maxPlayers) + (180 / maxPlayers)) * (Math.PI / 180); // Offset by half step
        const x = Math.sin(angle) * exitRadius;
        const z = Math.cos(angle) * exitRadius;
        addExitAt(x, z, colors[i]);
    }
}

export function checkAndAddDefaultSpawnsAndExits() {
    // Vérifier si des spawns ou exits existent déjà
    const hasSpawns = state.objects.some(obj => obj.userData.type === 'spawn');
    const hasExits = state.objects.some(obj => obj.userData.type === 'exit');

    // Config
    const maxPlayers = window.gameConfig?.gameSettings?.maxLobbyPlayers || 3;
    const colors = [];
    for (let i = 0; i < maxPlayers; i++) {
        const hue = (i * 360 / maxPlayers) / 360;
        const color = new THREE.Color().setHSL(hue, 1, 0.5);
        colors.push(color.getHex());
    }

    if (hasSpawns && hasExits) {
        alert('Spawns and exits already exist in this map.');
        return;
    }

    if (!hasSpawns && !hasExits) {
        // Ajouter tous les spawns et exits par défaut
        addDefaultSpawnsAndExits();
        alert(`Default spawns and exits (${maxPlayers}) have been added to the map.`);
    } else if (!hasSpawns) {
        // Ajouter seulement les spawns
        const spawnRadius = 3;
        for (let i = 0; i < maxPlayers; i++) {
            const angle = (i * 360 / maxPlayers) * (Math.PI / 180);
            const x = Math.sin(angle) * spawnRadius;
            const z = Math.cos(angle) * spawnRadius;
            addSpawnAt(x, z, colors[i]);
        }
        alert(`Default spawns (${maxPlayers}) have been added to the map.`);
    } else if (!hasExits) {
        // Ajouter seulement les exits
        const exitRadius = 8;
        for (let i = 0; i < maxPlayers; i++) {
            const angle = ((i * 360 / maxPlayers) + (180 / maxPlayers)) * (Math.PI / 180);
            const x = Math.sin(angle) * exitRadius;
            const z = Math.cos(angle) * exitRadius;
            addExitAt(x, z, colors[i]);
        }
        alert(`Default exits (${maxPlayers}) have been added to the map.`);
    }
}
