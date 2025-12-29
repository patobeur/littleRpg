import * as THREE from 'three';
import { state } from '../State.js';

export function addNPC(type, x, z) {
    if (!type || type === 'undefined' || type === 'Loading...') {
        console.warn('addNPC called without valid type, defaulting to Peter');
        type = 'Peter';
    }
    const fbxFile = `${type}.fbx`;

    const group = new THREE.Group();
    group.userData = {
        type: 'npc',
        npcType: type,
        dialogueId: 0,
        interactionRadius: 2.0, // Default interaction radius
        id: `${type}_${Date.now()}`,
        isRoot: true
    };
    group.position.set(x || 0, 0, z || 0);

    // Interaction Radius Visualizer
    const ringGeo = new THREE.RingGeometry(1.9, 2.0, 32);
    ringGeo.rotateX(-Math.PI / 2); // Lay flat
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = "InteractionRadius";
    ring.position.y = 0.05; // Slightly above ground
    group.add(ring);

    const modelPath = `/models/npc/${fbxFile}`;

    state.loader.load(modelPath, (fbx) => {
        fbx.scale.setScalar(0.01);
        fbx.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });
        group.add(fbx);
        console.log(`Loaded NPC: ${type}`);
    }, undefined, (err) => {
        console.error(`Could not load ${modelPath}:`, err);
        // Fallback
        const geo = new THREE.CapsuleGeometry(0.5, 1.8, 4);
        geo.translate(0, 0.9, 0);
        const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({ color: 0x0000ff })
        );
        group.add(mesh);
    });

    state.scene.add(group);
    state.objects.push(group);
    return group;
}
