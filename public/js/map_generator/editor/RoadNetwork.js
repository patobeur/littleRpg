import * as THREE from 'three';
import { state } from './State.js';

export const RoadNetwork = {
    graph: null,
    config: null,
    nodeMeshMap: new Map(), // map mesh.id -> nodeIndex
    edgeMeshMap: new Map(), // map edgeKey -> mesh

    clear: () => {
        // Remove known meshes from scene and state.objects
        RoadNetwork.nodeMeshMap.forEach((index, id) => {
            const mesh = state.scene.getObjectById(id); // ID is string or int? Map key is id.
            // Wait, map stores ID as key.
            // Better to iterate state.objects? or use the tracked maps if we had references.
            // Actually, clearMap in index.js handles scene removal if filter is correct.
            // But internal maps must be cleared.
        });
        RoadNetwork.nodeMeshMap.clear();
        RoadNetwork.edgeMeshMap.clear();
        RoadNetwork.graph = null;
        if (state.skeletonGroup) {
            state.scene.remove(state.skeletonGroup);
            state.skeletonGroup = null;
        }
    },

    build: (graph, config) => {
        RoadNetwork.graph = graph;
        RoadNetwork.config = config;
        RoadNetwork.nodeMeshMap.clear();
        RoadNetwork.edgeMeshMap.clear();

        const { roadWidth, roadSmooth } = config;
        const material = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
        const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });

        // Skeleton Group
        const skeletonGroup = new THREE.Group();
        skeletonGroup.name = "RoadSkeleton";
        skeletonGroup.visible = false;
        state.scene.add(skeletonGroup);
        state.skeletonGroup = skeletonGroup;

        // 1. Edges w/ Skeleton Lines
        graph.edges.forEach(edge => {
            const nA = graph.nodes[edge.a];
            const nB = graph.nodes[edge.b];

            const dx = nB.x - nA.x;
            const dz = nB.z - nA.z;
            const len = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dx, dz);

            const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(roadWidth, 0.1, len), material);
            roadMesh.position.set((nA.x + nB.x) / 2, 0.05, (nA.z + nB.z) / 2);
            roadMesh.rotation.y = angle;
            roadMesh.userData = {
                type: 'road',
                id: `road_${edge.a}_${edge.b}`,
                isRoot: true,
                edge: edge // Link back to data
            };

            state.scene.add(roadMesh);
            state.objects.push(roadMesh);

            // Map edge key to mesh for updates
            RoadNetwork.edgeMeshMap.set(`${edge.a}_${edge.b}`, roadMesh);
            RoadNetwork.edgeMeshMap.set(`${edge.b}_${edge.a}`, roadMesh);

            // Skeleton Line
            const points = [new THREE.Vector3(nA.x, 0.5, nA.z), new THREE.Vector3(nB.x, 0.5, nB.z)];
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat);
            line.userData = { type: 'skeleton_line', edge: edge };
            skeletonGroup.add(line);
        });

        // 2. Joints w/ Skeleton Nodes
        graph.nodes.forEach((node, index) => {
            const jointGeo = new THREE.CylinderGeometry(roadWidth / 2, roadWidth / 2, 0.1, roadSmooth);
            const jointMesh = new THREE.Mesh(jointGeo, material);
            jointMesh.position.set(node.x, 0.05, node.z);
            jointMesh.userData = {
                type: 'road_joint',
                isRoot: true,
                nodeIndex: index
            };

            state.scene.add(jointMesh);
            state.objects.push(jointMesh);
            RoadNetwork.nodeMeshMap.set(jointMesh.id, index);

            // Skeleton Node (Interactable?)
            const dot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            dot.position.set(node.x, 1.5, node.z);
            dot.userData = { type: 'skeleton_node', nodeIndex: index, isRoot: true }; // Can select skeleton to move too if we want
            skeletonGroup.add(dot);
            state.objects.push(dot);
        });
    },

    updateNode: (mesh) => {
        if (!RoadNetwork.graph) return;

        const index = mesh.userData.nodeIndex;
        if (index === undefined) return;

        const node = RoadNetwork.graph.nodes[index];

        // Update Graph Node
        node.x = mesh.position.x;
        node.z = mesh.position.z;

        // Synchronize Representations
        // 1. If we moved the Skeleton Node, update the Visual Joint
        if (mesh.userData.type === 'skeleton_node') {
            const jointMesh = RoadNetwork.nodeMeshMap.get(
                // We need to find the joint mesh. We mapped ID -> Index, but not Index -> Mesh.
                // Let's search state.objects or improve map. 
                // Since this is infrequent, finding in objects is fine, or we can iterate the map entries.
                // However, iterating map is slow. Let's just lookup by iterating objects for now as there aren't thousands.
                state.objects.find(o => o.userData.type === 'road_joint' && o.userData.nodeIndex === index)?.userData.id
                // Wait, nodeMeshMap keys are IDs. 
            );
            // Actually, simplest is to just search users of this nodeIndex
            const joint = state.objects.find(o => o.userData.type === 'road_joint' && o.userData.nodeIndex === index);
            if (joint) {
                joint.position.set(node.x, 0.05, node.z);
            }
        }

        // 2. If we moved the Visual Joint, update the Skeleton Node
        if (mesh.userData.type === 'road_joint') {
            if (state.skeletonGroup) {
                const skelNode = state.skeletonGroup.children.find(c => c.userData.type === 'skeleton_node' && c.userData.nodeIndex === index);
                if (skelNode) {
                    skelNode.position.set(node.x, 0.5, node.z);
                }
            }
        }

        // Find connected edges
        const connectedEdges = RoadNetwork.graph.edges.filter(e => e.a === index || e.b === index);

        connectedEdges.forEach(edge => {
            const nA = RoadNetwork.graph.nodes[edge.a];
            const nB = RoadNetwork.graph.nodes[edge.b];

            const dx = nB.x - nA.x;
            const dz = nB.z - nA.z;
            const len = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dx, dz);

            // Update Road Mesh
            const roadMesh = RoadNetwork.edgeMeshMap.get(`${edge.a}_${edge.b}`);
            if (roadMesh) {
                roadMesh.position.set((nA.x + nB.x) / 2, 0.05, (nA.z + nB.z) / 2);
                roadMesh.rotation.y = angle;
                roadMesh.scale.z = len / roadMesh.geometry.parameters.depth; // Scale length
            }

            // Update Skeleton Line
            if (state.skeletonGroup) {
                const line = state.skeletonGroup.children.find(c => c.userData.type === 'skeleton_line' && c.userData.edge === edge);
                if (line) {
                    const positions = line.geometry.attributes.position.array;
                    positions[0] = nA.x; positions[1] = 0.5; positions[2] = nA.z;
                    positions[3] = nB.x; positions[4] = 0.5; positions[5] = nB.z;
                    line.geometry.attributes.position.needsUpdate = true;
                }
            }
        });
    }
};
