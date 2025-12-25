import * as THREE from 'three';

/**
 * Manages environment elements like roads and trees
 */
export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.roads = [];
        this.trees = [];
    }

    /**
     * Create roads on the scene
     * @param {Array} roadsList - List of road configurations
     */
    createRoads(roadsList) {
        if (this.roads) this.roads.forEach(m => this.scene.remove(m));
        this.roads = [];

        if (!roadsList) return;

        const mat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, side: THREE.DoubleSide });

        roadsList.forEach(r => {
            const len = r.len || 6;
            const geo = new THREE.PlaneGeometry(6, len);
            const mesh = new THREE.Mesh(geo, mat);

            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.z = r.rot;

            mesh.position.set(r.x, 0.02, r.z);
            if (r.scale) mesh.scale.setScalar(r.scale);

            mesh.receiveShadow = true;
            mesh.name = "road";
            this.scene.add(mesh);
            this.roads.push(mesh);
        });
        console.log(`[EnvironmentManager] Created ${this.roads.length} roads`);
    }

    /**
     * Create trees on the scene by loading FBX models
     * @param {Array} treeList - List of tree configurations
     */
    async createTrees(treeList) {
        if (this.trees) this.trees.forEach(m => this.scene.remove(m));
        this.trees = [];

        if (!treeList) return;

        const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
        const loader = new FBXLoader();

        for (const t of treeList) {
            const group = new THREE.Group();
            group.position.set(t.x, 0, t.z);
            group.name = "tree";

            try {
                // Determine which FBX to load from tree data
                // Priority: t.fbx > `${t.type}.fbx` > 'tree.fbx' (default)
                const fbxFile = t.fbx || (t.type ? `${t.type}.fbx` : 'tree.fbx');
                const fbxPath = `/natures/${fbxFile}`;

                // Load actual FBX tree model
                const fbx = await new Promise((resolve, reject) => {
                    loader.load(fbxPath, resolve, undefined, reject);
                });

                fbx.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                group.add(fbx);

                // Apply scale to the group (default 1 for FBX models)
                const scale = t.scale !== undefined ? t.scale : 1;
                group.scale.setScalar(scale);

                console.log('Loaded tree FBX with scale:', scale, group);
            } catch (err) {
                console.error('Failed to load tree FBX, using fallback:', err);
                // Fallback to simple geometry
                const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6);
                const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
                const leavesGeo = new THREE.ConeGeometry(1.5, 3, 6);
                const leavesMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });

                const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                trunk.position.y = 0.75;
                trunk.castShadow = true;
                trunk.receiveShadow = true;
                group.add(trunk);

                const leaves = new THREE.Mesh(leavesGeo, leavesMat);
                leaves.position.y = 2.5;
                leaves.castShadow = true;
                leaves.receiveShadow = true;
                group.add(leaves);

                if (t.scale) group.scale.setScalar(t.scale);
            }

            this.scene.add(group);
            this.trees.push(group);
        }

        console.log(`[EnvironmentManager] Created ${this.trees.length} trees`);
    }
}
