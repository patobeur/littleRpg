import * as THREE from 'three';
import { state } from '../State.js';

export function addNature(type, x = 0, z = 0) {
    // Get metadata from cache
    const metadata = window.natureMetadata?.get(type);
    const fbxFile = metadata?.fbx || `${type}.fbx`;
    const scale = metadata?.scale || 1;

    const group = new THREE.Group();
    group.userData = { type: 'nature', natureType: type, id: `${type}_${Date.now()}`, isRoot: true };
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);

    // Load the nature FBX model from natures folder
    const modelPath = `/models/natures/${fbxFile}`;

    state.loader.load(modelPath, (fbx) => {
        fbx.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });
        group.add(fbx);
        // FBX is default 1, we set group scale. BUT we need 0.01 base. 
        // Either set group to 0.01 * scale, OR set FBX to 0.01
        fbx.scale.setScalar(0.01);
        console.log(`Loaded nature: ${type} from ${fbxFile} with scale ${scale}`);
    }, undefined, (err) => {
        console.error(`Could not load ${modelPath}:`, err);
        // Fallback to green cone
        const geo = new THREE.ConeGeometry(0.5, 2, 8);
        geo.translate(0, 1, 0);
        const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({ color: 0x228b22 })
        );
        group.add(mesh);
    });

    state.scene.add(group);
    state.objects.push(group);
    return group;
}

export function addPlaceholder(type, x, z, color) {
    const group = new THREE.Group();
    group.userData = { type: type, id: `${type}_${Date.now()}_${Math.random()}`, isRoot: true };
    group.position.set(x, 0, z);

    if (type === 'tree') {
        // Add temporary placeholder cone while loading
        const tempGeo = new THREE.ConeGeometry(0.5, 2, 8);
        tempGeo.translate(0, 1, 0);
        const tempMesh = new THREE.Mesh(
            tempGeo,
            new THREE.MeshStandardMaterial({ color: 0x228b22, transparent: true, opacity: 0.5 })
        );
        group.add(tempMesh);

        // Choose a random tree model
        const treeModels = ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5'];
        const randomTree = treeModels[Math.floor(Math.random() * treeModels.length)];
        const modelPath = `/models/natures/${randomTree}.fbx`; // Changed from /structures/ to /natures/

        state.loader.load(modelPath, (fbx) => {
            // Remove temporary placeholder
            group.remove(tempMesh);

            fbx.scale.setScalar(0.01);
            fbx.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
            group.add(fbx);
            console.log(`Loaded tree: ${randomTree}`);
        }, undefined, (err) => {
            console.error(`Could not load ${modelPath}:`, err);
            // Keep the green cone as fallback
            tempMesh.material.opacity = 1.0; // Make it fully visible
        });
    } else {
        // For non-tree placeholders, use the cone
        const geo = new THREE.ConeGeometry(0.5, 2, 8);
        geo.translate(0, 1, 0);
        const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({ color: color })
        );
        group.add(mesh);
    }

    state.scene.add(group);
    state.objects.push(group);
    return group; // Now returns the group
}
