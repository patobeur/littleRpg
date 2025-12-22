import * as THREE from 'three';
import { state } from './State.js';
import { addStructureResult, addSpawnAt, addEnemyAt } from './Objects.js';

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
        enemies: []
    };

    state.objects.forEach(obj => {
        if (obj.userData.type === 'house' || obj.userData.type === 'structure') {
            data.structures.push({
                type: obj.userData.type,
                x: obj.position.x,
                z: obj.position.z,
                rotation: { x: -90, y: 0, z: THREE.MathUtils.radToDeg(obj.rotation.y) }
            });
        } else if (obj.userData.type === 'spawn') {
            data.spawns.push({ x: obj.position.x, z: obj.position.z });
        } else if (obj.userData.type === 'enemy') {
            data.enemies.push({ type: obj.userData.enemyType, x: obj.position.x, z: obj.position.z });
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
            addStructureResult(s.type, s.x, s.z).then(obj => {
                if (obj && s.rotation) {
                    const yRad = THREE.MathUtils.degToRad(s.rotation.z);
                    obj.rotation.y = yRad;
                }
            });
        });
    }

    if (mapData.spawns) {
        mapData.spawns.forEach(s => {
            addSpawnAt(s.x, s.z);
        });
    }

    if (mapData.enemies) {
        mapData.enemies.forEach(e => {
            addEnemyAt(e.type, e.x, e.z);
        });
    }
}
