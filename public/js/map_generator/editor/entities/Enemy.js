import * as THREE from 'three';
import { state } from '../State.js';

export function addEnemyAt(type, x, z) {
    // Get metadata from cache
    const metadata = window.enemyMetadata?.get(type);
    const fbxFile = metadata?.fbx || `${type}.fbx`;
    const scale = metadata?.scale || 1;

    const group = new THREE.Group();
    group.userData = { type: 'enemy', enemyType: type, id: `${type}_${Date.now()}`, isRoot: true };
    group.position.set(x, 0, z);

    // Try to load the actual enemy FBX model
    const modelPath = `/models/enemies/${fbxFile}`;

    state.loader.load(modelPath, (fbx) => {
        // Apply same scale as game: 0.01 * metadata.scale
        fbx.scale.setScalar(0.01 * scale);
        fbx.traverse(c => { if (c.isMesh) c.castShadow = true; });
        group.add(fbx);
        console.log(`Loaded enemy: ${type} from ${fbxFile} with scale ${0.01 * scale}`);
    }, undefined, (err) => {
        console.warn(`Could not load ${modelPath}, using placeholder`);
        // Fallback to red capsule
        const geo = new THREE.CapsuleGeometry(0.5, 2, 4);
        geo.translate(0, 1.5, 0);
        const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        group.add(mesh);
    });

    state.scene.add(group);
    state.objects.push(group);
    return group;
}

export function addEnemy(type) {
    addEnemyAt(type || 'Alistar', 2, 2);
}
