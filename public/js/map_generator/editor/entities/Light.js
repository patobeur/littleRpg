import * as THREE from 'three';
import { state } from '../State.js';

export function addPointLightAt(x = 0, y = 2, z = 0, color = 0xffaa00, distance = 15, decay = 2, intensity = 1) {
    const group = new THREE.Group();
    // Default intensity 1
    group.userData = {
        type: 'light',
        lightType: 'point',
        color: color,
        distance: distance,
        decay: decay,
        intensity: intensity,
        id: `light_${Date.now()}_${Math.random()}`,
        isRoot: true
    };
    group.position.set(x, y, z);

    // The actual light
    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.castShadow = false; // Disable shadows for performance/WebGL limits
    light.name = "LightSource";
    group.add(light);

    // Helper Mesh (Visual representation)
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({ color: color, wireframe: true })
    );
    sphere.name = "LightHelper";
    group.add(sphere);

    state.scene.add(group);
    state.objects.push(group);
    return group;
}

export function addPointLight() {
    addPointLightAt(0, 5, 0);
}
