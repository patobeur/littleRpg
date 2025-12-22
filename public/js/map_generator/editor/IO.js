import * as THREE from 'three';
import { state } from './State.js';
import { addStructureResult, addSpawnAt, addEnemyAt, addPlaceholder, addRoad } from './Objects.js';

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

export function saveMap() {
    const name = document.getElementById('mapName').value || 'untitled';
    const data = {
        name: name,
        structures: [],
        spawns: [],
        enemies: [],
        roads: [],
        trees: []
    };

    state.objects.forEach(obj => {
        const type = obj.userData.type;
        const pos = obj.position;
        const rot = obj.rotation;
        const scale = obj.scale.x; // Assume uniform

        if (type === 'house' || type === 'structure') {
            data.structures.push({
                type: type,
                x: pos.x, z: pos.z,
                scale: scale,
                rotation: { z: THREE.MathUtils.radToDeg(rot.y) } // Save Y rot as Z for legacy compat or simplified
            });
        } else if (type === 'spawn') {
            data.spawns.push({ x: pos.x, z: pos.z, scale: scale });
        } else if (type === 'enemy') {
            data.enemies.push({ type: obj.userData.enemyType, x: pos.x, z: pos.z, scale: scale });
        } else if (type === 'road') {
            data.roads.push({
                x: pos.x, z: pos.z,
                rot: rot.y,
                len: obj.userData.len || 6, // Default len if missing
                scale: scale
            });
        } else if (type === 'tree') {
            data.trees.push({ x: pos.x, z: pos.z, scale: scale });
        }
    });

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
        mapData.spawns.forEach(s => {
            const obj = addSpawnAt(s.x, s.z);
            if (s.scale) obj.scale.setScalar(s.scale);
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
            // addPlaceholder returns nothing, need to modify it or find the obj?
            // Actually Objects.js addPlaceholder adds to array.
            // We can assume the last added object is it, or update addPlaceholder to return it.
            // Let's trust addPlaceholder for now or update it?
            // It's synchronous.
            addPlaceholder('tree', t.x, t.z, 0x228b22);
            const obj = state.objects[state.objects.length - 1];
            if (obj && t.scale) obj.scale.setScalar(t.scale);
        });
    }
}
