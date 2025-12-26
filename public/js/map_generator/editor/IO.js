import * as THREE from 'three';
import { state } from './State.js';
import { addStructureResult, addSpawnAt, addExitAt, addEnemyAt, addPlaceholder, addRoad } from './Objects.js';
import { updateEnvironment } from './Scene.js';

export function refreshMapList() {
    const selector = document.getElementById('mapList');
    if (!selector) return;
    selector.innerHTML = '<option>Loading...</option>';

    fetch('/api/maps')
        .then(r => r.json())
        .then(files => {
            selector.innerHTML = '';
            files.forEach(file => {
                const name = file.replace('.json', '');
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                selector.appendChild(opt);
            });
        })
        .catch(err => {
            console.error(err);
            selector.innerHTML = '<option>Error loading list</option>';
        });
}

// Helpers for Class/Color Mapping
function getClassFromColor(color) {
    // Exact or approximate matching
    // Red -> Warrior, Green -> Healer, Blue -> Mage
    if (color === 0xff0000 || color === 0xff4444) return 'Warrior';
    if (color === 0x00ff00 || color === 0x44ff44) return 'Healer';
    if (color === 0x0000ff || color === 0x4444ff || color === 0x00ffff) return 'Mage';
    return 'Warrior'; // Default
}

function getColorFromClass(className) {
    if (className === 'Warrior') return 0xff0000;
    if (className === 'Healer') return 0x00ff00;
    if (className === 'Mage') return 0x0000ff;
    return 0xffffff;
}

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
        sceneSettings: {
            bgColor: document.getElementById('bgColor')?.value || '#111111',
            fogColor: document.getElementById('fogColor')?.value || '#111111',
            fogNear: parseFloat(document.getElementById('fogNear')?.value) || 20,
            fogFar: parseFloat(document.getElementById('fogFar')?.value) || 100,
            ambColor: document.getElementById('ambColor')?.value || '#ffffff',
            ambInt: parseFloat(document.getElementById('ambInt')?.value) || 0.6
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
                rotation: { z: THREE.MathUtils.radToDeg(rot.y) } // Save Y rot as Z for legacy compat or simplified
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
            data.enemies.push({ type: obj.userData.enemyType, x: pos.x, y: pos.y, z: pos.z, scale: scale });
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
                fbx: fbxFile       // Save the FBX filename
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

export function loadSelectedMap() {
    const name = document.getElementById('mapList').value;
    if (!name) return;

    fetch(`/api/maps/${name}`)
        .then(r => r.json())
        .then(data => {
            loadMapData(data);
        })
        .catch(err => {
            console.error(err);
            alert('Failed to load map');
        });
}

function loadMapData(mapData) {
    // Clear Scene
    state.objects.forEach(obj => state.scene.remove(obj));
    state.objects.length = 0; // Clear array
    state.selectedObject = null;
    state.gizmo.detach();
    document.getElementById('mapName').value = mapData.name || 'loaded_map';

    const cb = document.getElementById('isLastMap');
    if (cb) cb.checked = !!mapData.isLastMap;

    if (mapData.structures) {
        mapData.structures.forEach(s => {
            // "Legacy" format stored type 'house' and rot in s.rotation.z (actually Y angle)
            // Or our new simplified format?
            // Let's support both: s.rotation object or s.rot value if we change it.
            // Our saver saves: rotation: { z: deg }
            let rotY = 0;
            if (s.rotation && s.rotation.z !== undefined) rotY = THREE.MathUtils.degToRad(s.rotation.z);
            else if (s.rot) rotY = s.rot;

            addStructureResult(s.type, s.x, s.z).then(obj => {
                if (obj) {
                    obj.rotation.y = rotY;
                    if (s.scale) obj.scale.setScalar(s.scale);
                }
            });
        });
    }

    if (mapData.spawns) {
        mapData.spawns.forEach((s, arrayIndex) => {
            // Determine color for visual display
            let color = s.color;

            // Migration from old format (class-based) to new format (index-based)
            if (!color && s.class) {
                const classToColor = {
                    'Warrior': 0xff0000,  // Red
                    'Healer': 0x00ff00,   // Green
                    'Mage': 0x0000ff      // Blue
                };
                color = classToColor[s.class] || 0xff0000;
            }

            // Fallback color if still missing
            if (!color) {
                const colors = [0xff0000, 0x00ff00, 0x0000ff];
                color = colors[arrayIndex % 3];
            }

            const obj = addSpawnAt(s.x, s.z, color);
            if (s.scale) obj.scale.setScalar(s.scale);
        });
    }

    // Support both 'exits' (old) and 'teleportZones' (new)
    const zones = mapData.teleportZones || mapData.exits;
    if (zones) {
        zones.forEach((e, arrayIndex) => {
            // Determine color for visual display
            let color = e.color;

            // Migration from old format (class-based) to new format (index-based)
            if (!color && e.class) {
                const classToColor = {
                    'Warrior': 0xff0000,  // Red
                    'Healer': 0x00ff00,   // Green
                    'Mage': 0x0000ff      // Blue
                };
                color = classToColor[e.class] || 0xff0000;
            }

            // Fallback color if still missing
            if (!color) {
                const colors = [0xff0000, 0x00ff00, 0x0000ff];
                color = colors[arrayIndex % 3];
            }

            const obj = addExitAt(e.x, e.z, color);
            // If radius is present, derive scale? Default exit radius is ~1.5 at scale 1 (Torus radius 1 + tube 0.1? No, logic above says radius 1.5 * scale)
            // So scale = radius / 1.5
            if (e.radius) obj.scale.setScalar(e.radius / 1.5);
            else if (e.scale) obj.scale.setScalar(e.scale);
        });
    }

    if (mapData.enemies) {
        mapData.enemies.forEach(e => {
            const obj = addEnemyAt(e.type, e.x, e.z);
            if (e.scale) obj.scale.setScalar(e.scale);
        });
    }

    if (mapData.roads) {
        mapData.roads.forEach(r => {
            // Support both old format (from procedural gen) and new save format
            // Procedural: { edges: ... } - handled by buildGeneratedMap
            // Saved: { x, z, rot, len, scale }
            const obj = addRoad(r.len, r.x, r.z, r.rot);
            if (r.scale) obj.scale.setScalar(r.scale);
        });
    }

    if (mapData.trees) {
        mapData.trees.forEach(t => {
            // Use addNature if type is available, otherwise fallback to addPlaceholder
            const natureType = t.type || 'tree';
            const obj = window.addNature ? window.addNature(natureType, t.x, t.z) : null;

            // Fallback to addPlaceholder if addNature not available
            if (!obj) {
                addPlaceholder('tree', t.x, t.z, 0x228b22);
                const fallbackObj = state.objects[state.objects.length - 1];
                if (fallbackObj && t.scale) fallbackObj.scale.setScalar(t.scale);
            } else if (t.scale) {
                obj.scale.setScalar(t.scale);
            }
        });
    }

    // Apply scene settings if present
    if (mapData.sceneSettings) {
        const settings = mapData.sceneSettings;

        // Update VIEW tab inputs
        if (document.getElementById('bgColor')) document.getElementById('bgColor').value = settings.bgColor || '#111111';
        if (document.getElementById('fogColor')) document.getElementById('fogColor').value = settings.fogColor || '#111111';
        if (document.getElementById('fogNear')) document.getElementById('fogNear').value = settings.fogNear || 20;
        if (document.getElementById('fogFar')) document.getElementById('fogFar').value = settings.fogFar || 100;
        if (document.getElementById('ambColor')) document.getElementById('ambColor').value = settings.ambColor || '#ffffff';
        if (document.getElementById('ambInt')) document.getElementById('ambInt').value = settings.ambInt || 0.6;

        // Apply to scene
        updateEnvironment(settings);
    }
}
