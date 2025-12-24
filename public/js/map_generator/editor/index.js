import { UI } from './UI.js';
import * as THREE from 'three';
import { initThree, onWindowResize, updateEnvironment } from './Scene.js';
import { initEvents } from './Input.js';
import { state } from './State.js';
import { TransformGizmo } from '../tools/Gizmo.js';
import { addStructure, addSpawn, addEnemy, deleteSelected, addExit, addDefaultSpawnsAndExits, checkAndAddDefaultSpawnsAndExits } from './Objects.js';
import { refreshMapList, saveMap, loadSelectedMap } from './IO.js';
import { generateOrganicVillage } from '../procedural/index.js';
import { refreshScenarioList, refreshScenarioMapSelect } from './Scenario.js';

function init() {
    initThree();

    // Tools
    state.gizmo = new TransformGizmo(state.scene, state.camera, state.renderer.domElement);
    state.gizmo.attachToScene(state.scene);

    // Disable controls while dragging
    state.gizmo.onDragStart = () => { state.controls.enabled = false; };
    state.gizmo.onDragEnd = () => { state.controls.enabled = true; };

    // Events
    initEvents();

    // Resize Handle
    window.addEventListener('resize', () => {
        onWindowResize();
    });

    // UI Bindings
    UI.initBindings(
        // Callback when Transform inputs change -> update Gizmo
        () => state.gizmo.updatePosition(),
        // Callback when Env inputs change -> update Scene
        (settings) => updateEnvironment(settings)
    );

    // Expose Global API for UI
    window.generateMap = generateMap;
    window.saveMap = saveMap;
    window.addStructure = addStructure;
    window.addSpawn = addSpawn;
    window.addEnemy = addEnemy;
    window.addExit = addExit;
    window.deleteSelected = deleteSelected;
    window.refreshMapList = refreshMapList;
    window.loadSelectedMap = loadSelectedMap;
    window.checkAndAddDefaultSpawnsAndExits = checkAndAddDefaultSpawnsAndExits;

    animate();

    console.log('Map Generator Initialized (Refactored)');

    // Initial Gen
    // generateVillage(10); // Start empty as requested
    refreshMapList();
    refreshScenarioList();
    refreshScenarioMapSelect();
}

function animate() {
    requestAnimationFrame(animate);
    state.controls.update();
    state.renderer.render(state.scene, state.camera);
}

// Logic bridging (Generators to Scene)
function generateMap() {
    const type = document.getElementById('genType').value;
    const size = parseInt(document.getElementById('genSize').value);

    // Clear
    state.objects.forEach(obj => state.scene.remove(obj));
    state.objects = [];
    state.selectedObject = null;
    state.gizmo.detach();

    // Add Defaults
    addDefaultSpawnsAndExits();

    if (type === 'village') {
        const data = generateOrganicVillage(Date.now(), size * 5);
        buildGeneratedMap(data);
    } else {
        // generateForest(size); 
    }
}

async function buildGeneratedMap(data) {
    if (data.roads) {
        const material = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
        data.roads.edges.forEach(edge => {
            const nA = data.roads.nodes[edge.a];
            const nB = data.roads.nodes[edge.b];

            const dx = nB.x - nA.x;
            const dz = nB.z - nA.z;
            const len = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dx, dz);

            const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, len), material);
            roadMesh.position.set((nA.x + nB.x) / 2, 0.05, (nA.z + nB.z) / 2);
            roadMesh.rotation.y = angle;

            roadMesh.userData = { type: 'road', id: `road_${edge.a}_${edge.b}`, len: len, isRoot: true };

            state.scene.add(roadMesh);
            state.objects.push(roadMesh);
        });
    }

    if (data.structures) {
        for (let s of data.structures) {
            import('./Objects.js').then(m => {
                m.addStructureResult(s.type, s.x, s.z).then(obj => {
                    obj.rotation.y = s.rot;
                });
            });
        }
    }

    if (data.trees) {
        data.trees.forEach(t => {
            import('./Objects.js').then(m => m.addPlaceholder('tree', t.x, t.z, 0x228b22));
        });
    }
}

function generateVillage(size) {
    const data = generateOrganicVillage(12345, size * 5);
    buildGeneratedMap(data);
}

init();
