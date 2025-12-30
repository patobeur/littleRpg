import * as THREE from 'three';
import { state } from '../State.js';
import { updateEnvironment, updateGrid } from '../Scene.js';
import { RoadNetwork } from '../RoadNetwork.js';
import { addStructureResult } from '../entities/Structure.js';
import { addEnemyAt } from '../entities/Enemy.js';
import { addNature, addPlaceholder } from '../entities/Nature.js';
import { addNPC } from '../entities/NPC.js';
import { addContainer } from '../entities/Container.js';
import { addRoad } from '../entities/Road.js';
import { addPointLightAt } from '../entities/Light.js';
import { addSpawnAt, addExitAt } from '../entities/Markers.js';

export function loadSelectedMap() {
    const name = document.getElementById('mapList').value;
    if (!name) return;

    fetch(`/api/maps/${name}`)
        .then(r => {
            if (r.status === 401 || r.status === 403) {
                window.location.href = '/login.html';
                throw new Error('Unauthorized');
            }
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            loadMapData(data);
        })
        .catch(err => {
            console.error(err);
            alert('Failed to load map');
        });
}

export function loadMapData(mapData) {
    // Clear Scene
    state.objects.forEach(obj => state.scene.remove(obj));
    state.objects.length = 0; // Clear array
    state.selectedObject = null;
    state.gizmo.detach();

    // Clear Road Network and Skeleton
    RoadNetwork.clear();

    document.getElementById('mapName').value = mapData.name || 'loaded_map';

    const cb = document.getElementById('isLastMap');
    if (cb) cb.checked = !!mapData.isLastMap;

    // Restore Map Dimensions
    const w = mapData.width || (mapData.mapSize ? Math.round(mapData.mapSize / 5) : 10);
    const d = mapData.depth || (mapData.mapSize ? Math.round(mapData.mapSize / 5) : 10);

    const wInput = document.getElementById('genWidth');
    const dInput = document.getElementById('genDepth');
    if (wInput) wInput.value = w;
    if (dInput) dInput.value = d;

    // Update Grid
    updateGrid(w, d);


    if (mapData.structures) {
        mapData.structures.forEach(s => {
            let rotY = 0;
            if (s.rotation && s.rotation.z !== undefined) rotY = THREE.MathUtils.degToRad(s.rotation.z);
            else if (s.rot) rotY = s.rot;

            addStructureResult(s.type, s.x, s.z).then(obj => {
                if (obj) {
                    obj.rotation.y = rotY;
                    if (s.scale) obj.scale.setScalar(s.scale);
                    if (s.y !== undefined) obj.position.y = s.y;
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
            if (s.y !== undefined) obj.position.y = s.y;
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
            // If radius is present, derive scale? Default exit radius is ~1.5 at scale 1
            if (e.radius) obj.scale.setScalar(e.radius / 1.5);
            else if (e.scale) obj.scale.setScalar(e.scale);
            if (e.y !== undefined) obj.position.y = e.y;
        });
    }

    if (mapData.enemies) {
        mapData.enemies.forEach(e => {
            const obj = addEnemyAt(e.type, e.x, e.z);
            if (e.scale) obj.scale.setScalar(e.scale);
            if (e.y !== undefined) obj.position.y = e.y;
            if (e.rot !== undefined) obj.rotation.y = e.rot;
        });
    }

    if (mapData.roadNetwork) {
        // Load editable Road Network
        const rw = parseFloat(document.getElementById('genRoadWidth')?.value) || 3.5;
        const rs = parseInt(document.getElementById('genRoadSmooth')?.value) || 8;
        RoadNetwork.build(mapData.roadNetwork, { roadWidth: rw, roadSmooth: rs });
    } else if (mapData.roads) {
        // Legacy Load (Dumb Meshes)
        mapData.roads.forEach(r => {
            const obj = addRoad(r.len, r.x, r.z, r.rot);
            if (r.scale) obj.scale.setScalar(r.scale);
            if (r.y !== undefined) obj.position.y = r.y;
        });
    }

    if (mapData.trees) {
        mapData.trees.forEach(t => {
            const natureType = t.type || 'tree';
            let obj;

            // Try to use addNature if available (imported above)
            // But wait, addNature is imported.
            obj = addNature(natureType, t.x, t.z);

            // If for some reason obj is null or fails? addNature returns the group.
            // But addNature logic might differ from original IO logic?
            // Original IO logic: const obj = window.addNature ? window.addNature(...) : null;
            // Now we import it directly.

            // Wait, looking at original objects.js, addNature logic handles creating the group.
            // So we don't need fallback to addPlaceholder inside addNature call logic here ideally.
            // But IO.js had a fallback: if valid obj wasn't returned, use addPlaceholder.

            if (obj) {
                if (t.scale) obj.scale.setScalar(t.scale);
                if (t.y !== undefined) obj.position.y = t.y;
                if (t.rot !== undefined) obj.rotation.y = t.rot;
            } else {
                // Fallback if addNature failed synchronously (unlikely with new structure)
                // But let's keep the fallback logic pattern if addNature might return null?
                // addNature always returns group. So we are good.
            }
        });
    }

    // Apply scene settings if present
    if (mapData.sceneSettings) {
        const settings = mapData.sceneSettings;

        // Update VIEW tab inputs
        if (document.getElementById('bgColor')) document.getElementById('bgColor').value = settings.bgColor || '#111111';
        if (document.getElementById('fogEnabled')) document.getElementById('fogEnabled').checked = !!settings.fogEnabled;
        if (document.getElementById('fogColor')) document.getElementById('fogColor').value = settings.fogColor || '#111111';
        if (document.getElementById('fogNear')) document.getElementById('fogNear').value = settings.fogNear || 20;
        if (document.getElementById('fogFar')) document.getElementById('fogFar').value = settings.fogFar || 100;
        if (document.getElementById('ambColor')) document.getElementById('ambColor').value = settings.ambColor || '#ffffff';
        if (document.getElementById('ambInt')) document.getElementById('ambInt').value = settings.ambInt || 0.6;
        if (document.getElementById('groundColor')) document.getElementById('groundColor').value = settings.groundColor || '#ffffff';

        // Sun
        if (document.getElementById('sunColor')) document.getElementById('sunColor').value = settings.sunColor || '#ffffff';
        if (document.getElementById('sunInt')) document.getElementById('sunInt').value = settings.sunInt !== undefined ? settings.sunInt : 1;
        if (document.getElementById('sunX')) document.getElementById('sunX').value = settings.sunX !== undefined ? settings.sunX : 50;
        if (document.getElementById('sunY')) document.getElementById('sunY').value = settings.sunY !== undefined ? settings.sunY : 100;
        if (document.getElementById('sunZ')) document.getElementById('sunZ').value = settings.sunZ !== undefined ? settings.sunZ : 50;

        // Apply to scene
        updateEnvironment(settings);
    }

    // Load Lights
    if (mapData.lights) {
        mapData.lights.forEach(l => {
            addPointLightAt(l.x, l.y, l.z, l.color, l.distance, l.decay, l.intensity || 1);
        });
    }

    // Load NPCs
    if (mapData.npcs) {
        mapData.npcs.forEach(n => {
            if (!n.npcType || n.npcType === 'undefined' || n.npcType === 'Loading...') {
                console.warn('Skipping invalid NPC:', n);
                return;
            }
            const obj = addNPC(n.npcType, n.x, n.z);
            if (n.scale) obj.scale.setScalar(n.scale);
            if (n.y !== undefined) obj.position.y = n.y;
            obj.userData.dialogueId = n.dialogueId;
            if (n.interactionRadius) {
                obj.userData.interactionRadius = n.interactionRadius;
                // Update visual ring
                const ring = obj.getObjectByName('InteractionRadius');
                if (ring) ring.scale.setScalar(n.interactionRadius / 2.0);
            }
        });
    }

    // Load Containers
    if (mapData.containers) {
        mapData.containers.forEach(c => {
            const obj = addContainer(c.containerType, c.x, c.z);
            if (c.scale && obj) obj.scale.setScalar(c.scale);
            if (c.y !== undefined && obj) obj.position.y = c.y;
        });
    }
}
