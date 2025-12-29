import * as THREE from 'three';
import { state } from '../State.js';

export function saveMap() {
    const name = document.getElementById('mapName').value || 'untitled';
    const isLastMap = document.getElementById('isLastMap').checked;

    const data = {
        name: name,
        isLastMap: isLastMap,
        structures: [],
        spawns: [],
        teleportZones: [],
        enemies: [],
        roads: [],
        trees: [],
        npcs: [],
        containers: [],
        lights: [],
        sceneSettings: {
            bgColor: document.getElementById('bgColor')?.value || '#111111',
            fogColor: document.getElementById('fogColor')?.value || '#111111',
            fogNear: parseFloat(document.getElementById('fogNear')?.value) || 20,
            fogFar: parseFloat(document.getElementById('fogFar')?.value) || 100,
            ambColor: document.getElementById('ambColor')?.value || '#ffffff',
            ambInt: parseFloat(document.getElementById('ambInt')?.value) || 0.6,
            // Sun Settings
            sunColor: document.getElementById('sunColor')?.value,
            sunInt: parseFloat(document.getElementById('sunInt')?.value),
            sunX: parseFloat(document.getElementById('sunX')?.value),
            sunY: parseFloat(document.getElementById('sunY')?.value),
            sunZ: parseFloat(document.getElementById('sunZ')?.value)
        }
    };

    // Calculate map size based on object positions
    let maxDistance = 25; // Minimum default

    // Counters for index-based spawn/teleport assignment
    let spawnIndex = 0;
    let exitIndex = 0;

    state.objects.forEach(obj => {
        const type = obj.userData.type;
        const pos = obj.position;
        const rot = obj.rotation;
        const scale = obj.scale.x; // Assume uniform

        // Calculate distance from center
        let distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

        // For roads, calculate the endpoint positions considering rotation
        if (type === 'road') {
            const len = obj.userData.len || 6;
            const halfLen = (len * scale) / 2;

            // Road extends along Z axis locally, then rotated by rot.y
            // Calculate both endpoints
            const endpoint1X = pos.x + Math.sin(rot.y) * halfLen;
            const endpoint1Z = pos.z + Math.cos(rot.y) * halfLen;
            const endpoint2X = pos.x - Math.sin(rot.y) * halfLen;
            const endpoint2Z = pos.z - Math.cos(rot.y) * halfLen;

            const dist1 = Math.sqrt(endpoint1X * endpoint1X + endpoint1Z * endpoint1Z);
            const dist2 = Math.sqrt(endpoint2X * endpoint2X + endpoint2Z * endpoint2Z);

            distance = Math.max(dist1, dist2);
        }

        // Add some margin for object size/collision
        const margin = (type === 'structure' || type === 'house') ? 5 :
            (type === 'road') ? 3 : 2;
        maxDistance = Math.max(maxDistance, distance + margin);

        if (type === 'house' || type === 'structure') {
            data.structures.push({
                type: type,
                x: pos.x, y: pos.y, z: pos.z,
                scale: scale,
                rot: rot.y, // Save Y rotation in radians
                rotation: { z: THREE.MathUtils.radToDeg(rot.y) } // Save Y rot as Z for legacy compat
            });
        } else if (type === 'spawn') {
            spawnIndex++; // Increment index for each spawn
            data.spawns.push({
                x: pos.x, y: pos.y, z: pos.z,
                scale: scale,
                index: spawnIndex, // Use array-based index instead of class
                color: obj.userData.color // Keep color for visual display
            });
        } else if (type === 'exit') {
            exitIndex++; // Increment index for each teleport
            data.teleportZones.push({
                x: pos.x, y: pos.y, z: pos.z,
                radius: 1.5 * scale, // Exit torus radius approx
                index: exitIndex, // Use array-based index instead of class
                color: obj.userData.color // Keep color for visual display
            });
        } else if (type === 'enemy') {
            data.enemies.push({ type: obj.userData.enemyType, x: pos.x, y: pos.y, z: pos.z, scale: scale, rot: rot.y });
        } else if (type === 'road') {
            data.roads.push({
                x: pos.x, z: pos.z,
                rot: rot.y,
                len: obj.userData.len || 6, // Default len if missing
                scale: scale
            });
        } else if (type === 'tree' || type === 'nature') {
            // Get nature metadata if available
            const natureType = obj.userData.natureType || 'tree';
            const metadata = window.natureMetadata?.get(natureType);
            const fbxFile = metadata?.fbx || `${natureType}.fbx`;

            data.trees.push({
                x: pos.x,
                z: pos.z,
                scale: scale,
                type: natureType,  // Save the nature type
                fbx: fbxFile,       // Save the FBX filename
                rot: rot.y,
                y: pos.y
            });
        } else if (type === 'light') {
            data.lights.push({
                x: pos.x, y: pos.y, z: pos.z,
                color: obj.userData.color,
                distance: obj.userData.distance,
                decay: obj.userData.decay,
                intensity: obj.userData.intensity
            });
        } else if (type === 'npc') {
            data.npcs.push({
                x: pos.x, y: pos.y, z: pos.z,
                scale: scale,
                npcType: obj.userData.npcType,
                dialogueId: obj.userData.dialogueId,
                interactionRadius: obj.userData.interactionRadius || 2.0
            });
        } else if (type === 'container') {
            data.containers.push({
                x: pos.x, y: pos.y, z: pos.z,
                scale: scale,
                containerType: obj.userData.containerType
            });
        }
    });

    // Round up to nearest 5 and add safety margin
    data.mapSize = Math.ceil(maxDistance / 5) * 5 + 10;

    console.log(`Map size calculated: ${data.mapSize} (based on max distance: ${maxDistance.toFixed(2)})`);

    fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data })
    })
        .then(r => r.json())
        .then(res => alert(res.message))
        .catch(err => alert('Error saving map'));
}
