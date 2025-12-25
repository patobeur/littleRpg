import * as THREE from 'three';
import { state } from './State.js';

export function addStructureResult(type, x, z) {
    return new Promise((resolve) => {
        // Get metadata from cache
        const metadata = window.structureMetadata?.get(type);
        const fbxFile = metadata?.fbx || `${type}.fbx`; // Fallback to type.fbx
        const scale = metadata?.scale || 1;

        const modelPath = `/structures/${fbxFile}`;
        const group = new THREE.Group();
        group.userData = { type: type, id: `${type}_${Date.now()}`, isRoot: true };

        state.loader.load(modelPath, (fbx) => {
            fbx.scale.setScalar(scale);
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
    // Get metadata from cache
    const metadata = window.enemyMetadata?.get(type);
    const fbxFile = metadata?.fbx || `${type}.fbx`;
    const scale = metadata?.scale || 1;

    const group = new THREE.Group();
    group.userData = { type: 'enemy', enemyType: type, id: `${type}_${Date.now()}`, isRoot: true };
    group.position.set(x, 0, z);

    // Try to load the actual enemy FBX model
    const modelPath = `/enemies/${fbxFile}`;

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

export function addSpawn() {
    addSpawnAt(0, 0);
}

export function addEnemy(type) {
    addEnemyAt(type || 'Alistar', 2, 2);
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
        const modelPath = `/natures/${randomTree}.fbx`; // Changed from /structures/ to /natures/

        state.loader.load(modelPath, (fbx) => {
            // Remove temporary placeholder
            group.remove(tempMesh);

            fbx.scale.setScalar(1);
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

export function addNature(type, x = 0, z = 0) {
    // Get metadata from cache
    const metadata = window.natureMetadata?.get(type);
    const fbxFile = metadata?.fbx || `${type}.fbx`;
    const scale = metadata?.scale || 1;

    const group = new THREE.Group();
    group.userData = { type: 'nature', natureType: type, id: `${type}_${Date.now()}`, isRoot: true };
    group.position.set(x, 0, z);

    // Load the nature FBX model from natures folder
    const modelPath = `/natures/${fbxFile}`;

    state.loader.load(modelPath, (fbx) => {
        fbx.traverse(c => {
            if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;
            }
        });
        group.add(fbx);
        // Apply scale to the GROUP, not the FBX, so it affects all nested meshes
        group.scale.setScalar(scale);
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

export function deleteSelected() {
    if (state.selectedObject) {
        // Empêcher la suppression des spawns et exits (éléments obligatoires)
        const objectType = state.selectedObject.userData?.type;
        if (objectType === 'spawn' || objectType === 'exit') {
            console.warn(`Cannot delete ${objectType}s - they are required elements`);
            return;
        }

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

export function checkAndAddDefaultSpawnsAndExits() {
    // Vérifier si des spawns ou exits existent déjà
    const hasSpawns = state.objects.some(obj => obj.userData.type === 'spawn');
    const hasExits = state.objects.some(obj => obj.userData.type === 'exit');

    if (hasSpawns && hasExits) {
        alert('Spawns and exits already exist in this map.');
        return;
    }

    if (!hasSpawns && !hasExits) {
        // Ajouter tous les spawns et exits par défaut
        addDefaultSpawnsAndExits();
        alert('Default spawns and exits have been added to the map.');
    } else if (!hasSpawns) {
        // Ajouter seulement les spawns
        const colors = [0xff0000, 0x00ff00, 0x0000ff];
        const spawnRadius = 3;
        for (let i = 0; i < 3; i++) {
            const angle = (i * 120) * (Math.PI / 180);
            const x = Math.sin(angle) * spawnRadius;
            const z = Math.cos(angle) * spawnRadius;
            addSpawnAt(x, z, colors[i]);
        }
        alert('Default spawns have been added to the map.');
    } else if (!hasExits) {
        // Ajouter seulement les exits
        const colors = [0xff0000, 0x00ff00, 0x0000ff];
        const exitRadius = 8;
        for (let i = 0; i < 3; i++) {
            const angle = (i * 120 + 60) * (Math.PI / 180);
            const x = Math.sin(angle) * exitRadius;
            const z = Math.cos(angle) * exitRadius;
            addExitAt(x, z, colors[i]);
        }
        alert('Default exits have been added to the map.');
    }
}
