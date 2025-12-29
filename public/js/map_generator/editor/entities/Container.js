import * as THREE from 'three';
import { state } from '../State.js';

export function addContainer(type, x = 0, z = 0) {
    // Get metadata from cache
    const metadata = window.containerMetadata?.get(type);
    const fbxFile = metadata?.fbx || `${type}.fbx`;
    const scale = metadata?.scale || 1;

    const group = new THREE.Group();
    group.userData = { type: 'container', containerType: type, id: `${type}_${Date.now()}`, isRoot: true };
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);

    // Load the container FBX model
    const modelPath = `/models/containers/${fbxFile}`;

    state.loader.load(modelPath, (fbx) => {
        fbx.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });
        group.add(fbx);

        // Apply 0.01 default to FBX
        fbx.scale.setScalar(0.01);
        console.log(`Loaded container: ${type} from ${fbxFile}`);
    }, undefined, (err) => {
        console.error(`Could not load ${modelPath}:`, err);
        // Fallback to Box
        const geo = new THREE.BoxGeometry(1, 1, 1);
        geo.translate(0, 0.5, 0);
        const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({ color: 0xDAA520 }) // Goldenrod
        );
        group.add(mesh);
    });

    state.scene.add(group);
    state.objects.push(group);
    return group;
}
