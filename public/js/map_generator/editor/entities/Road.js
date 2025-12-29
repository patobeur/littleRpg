import * as THREE from 'three';
import { state } from '../State.js';

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
