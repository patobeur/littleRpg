import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { TransformGizmo } from './Gizmo.js';
import { generateOrganicVillage } from './ProceduralGen.js';


const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    gizmo: null,
    objects: [], // Interactive objects
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    selectedObject: null,
    loader: new FBXLoader()
};

// Config
const GRID_SIZE = 100;
const GRID_DIVISIONS = 100;

function init() {
    // 1. Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x1a1a2e);
    state.scene.fog = new THREE.Fog(0x1a1a2e, 20, 100);

    // 2. Camera
    state.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(0, 20, 20);

    // 3. Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    const viewport = document.getElementById('viewport');
    state.renderer.setSize(viewport.offsetWidth, viewport.offsetHeight);
    state.renderer.shadowMap.enabled = true;
    document.getElementById('viewport').appendChild(state.renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    state.scene.add(dirLight);

    // 5. Grid & Ground
    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, 0x444444, 0x222222);
    state.scene.add(gridHelper);

    const planeGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x242444, roughness: 0.8 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    state.scene.add(plane);

    // 6. Controls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;

    // 7. Gizmo
    state.gizmo = new TransformGizmo(state.scene, state.camera, state.renderer.domElement);
    state.gizmo.onChange = updateUIFromSelection;
    state.gizmo.onDragStart = () => { state.controls.enabled = false; };
    state.gizmo.onDragEnd = () => { state.controls.enabled = true; };

    // 8. Inputs
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    state.renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Expose functions to global scope for HTML buttons
    window.generateMap = generateMap;
    window.saveMap = saveMap;
    window.addStructure = addStructure;
    window.addSpawn = addSpawn;
    window.addEnemy = addEnemy;
    window.deleteSelected = deleteSelected;
    window.refreshMapList = refreshMapList;
    window.loadSelectedMap = loadSelectedMap;

    // Tick
    animate();

    // Auto-generate for initial feedback
    console.log('Map Generator Initialized');
    generateVillage(10);
    refreshMapList(); // Load initial list
}

function animate() {
    requestAnimationFrame(animate);
    state.controls.update();
    state.renderer.render(state.scene, state.camera);
}

function onWindowResize() {
    const viewport = document.getElementById('viewport');
    state.camera.aspect = viewport.offsetWidth / viewport.offsetHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(viewport.offsetWidth, viewport.offsetHeight);
}

// ------------------------------------------------------------------
// Selection & Interaction
// ------------------------------------------------------------------

function onPointerDown(event) {
    if (event.button !== 0) return; // Left click only

    // 1. Update Mouse Coords for raycaster
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 2. Check Gizmo Interaction
    // Return if gizmo handled the event
    if (state.gizmo.onPointerDown(event, state.mouse)) return;

    // 3. Check Object Selection
    state.raycaster.setFromCamera(state.mouse, state.camera);
    const intersects = state.raycaster.intersectObjects(state.objects, true);

    if (intersects.length > 0) {
        let target = intersects[0].object;
        // Traverse up to find the root container (since we load FBX)
        while (target.parent && target.parent.type !== 'Scene' && !target.userData.isRoot) {
            target = target.parent;
        }
        selectObject(target);
    } else {
        // Only deselect if not dragging orbit controls (which pointerdown also triggers)
        // But pointerdown on empty space is usually deselect.
        selectObject(null);
    }
}

function selectObject(obj) {
    state.selectedObject = obj;
    state.gizmo.attach(obj);

    if (obj) {
        document.getElementById('selection-info').innerText = `${obj.userData.type} (${obj.userData.id})`;
        updateUIFromSelection();
        switchTab('edit');
    } else {
        document.getElementById('selection-info').innerText = "No object selected";
    }
}

function updateUIFromSelection() {
    if (!state.selectedObject) return;
    const obj = state.selectedObject;
    document.getElementById('posX').value = obj.position.x.toFixed(2);
    document.getElementById('posZ').value = obj.position.z.toFixed(2);
    document.getElementById('rotY').value = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(2);
}

// UI Inputs updating object
document.getElementById('posX').addEventListener('change', (e) => {
    if (state.selectedObject) {
        state.selectedObject.position.x = parseFloat(e.target.value);
        state.gizmo.updatePosition();
    }
});
document.getElementById('posZ').addEventListener('change', (e) => {
    if (state.selectedObject) {
        state.selectedObject.position.z = parseFloat(e.target.value);
        state.gizmo.updatePosition();
    }
});
document.getElementById('rotY').addEventListener('change', (e) => {
    if (state.selectedObject) {
        state.selectedObject.rotation.y = THREE.MathUtils.degToRad(parseFloat(e.target.value));
        // Rotation doesn't affect gizmo position, but nice to be consistent
    }
});

function onKeyDown(event) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelected();
    }
}

function deleteSelected() {
    if (state.selectedObject) {
        state.scene.remove(state.selectedObject);
        state.gizmo.detach();
        const index = state.objects.indexOf(state.selectedObject);
        if (index > -1) state.objects.splice(index, 1);
        state.selectedObject = null;
    }
}

// ------------------------------------------------------------------
// Map Generation
// ------------------------------------------------------------------

function generateMap() {
    const type = document.getElementById('genType').value;
    const size = parseInt(document.getElementById('genSize').value);

    // Clear existing
    state.objects.forEach(obj => state.scene.remove(obj));
    state.objects = [];
    state.selectedObject = null;
    state.gizmo.detach();

    if (type === 'village') {
        const data = generateOrganicVillage(Date.now(), size * 5); // Scale up grid size
        buildGeneratedMap(data);
    } else {
        generateForest(size);
    }
}

async function buildGeneratedMap(data) {
    // 1. Draw Roads
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
            // Angle is relative to +Z? 
            // Atan2(dx, dz) -> 0 is +Z.
            // Box default Z axis length.
            // We rotate Y.
            roadMesh.position.set((nA.x + nB.x) / 2, 0.05, (nA.z + nB.z) / 2);
            roadMesh.rotation.y = angle;

            state.scene.add(roadMesh);
            state.objects.push(roadMesh); // Make selectable? Or just visual.
            // If selectable, gizmo might attach.
            // roadMesh.userData = { type: 'road', id: `road_${edge.a}_${edge.b}`, isRoot: true };
        });
    }

    // 2. Place Structures
    if (data.structures) {
        for (let s of data.structures) {
            const obj = await addStructureResult(s.type, s.x, s.z);
            if (obj) {
                // Apply rotation
                obj.rotation.y = s.rot;
            }
        }
    }

    // 3. Place Trees
    if (data.trees) {
        data.trees.forEach(t => {
            // Use placeholder cone for trees for now (or tree.fbx if we had it)
            addPlaceholder('tree', t.x, t.z, 0x228b22);
        });
    }
}

function generateVillage(size) {
    // Used by Init
    const data = generateOrganicVillage(12345, size * 5);
    buildGeneratedMap(data);
}

function generateForest(size) {
    const count = size * 5;
    const range = size * 5;

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 2 * range;
        const z = (Math.random() - 0.5) * 2 * range;
        addPlaceholder('tree', x, z, 0x228b22);
    }
}

// ------------------------------------------------------------------
// Object Creation
// ------------------------------------------------------------------

async function addStructureResult(type, x, z) {
    return new Promise((resolve) => {
        // Reuse logic from addStructure but return object
        const modelPath = `/structures/${type}.fbx`;
        const group = new THREE.Group();
        group.userData = { type: type, id: `${type}_${Date.now()}`, isRoot: true };

        state.loader.load(modelPath, (fbx) => {
            fbx.scale.setScalar(1);
            if (type === 'house') {
                fbx.rotation.x = -Math.PI / 2;
            }
            fbx.traverse(c => { if (c.isMesh) c.castShadow = true; });
            group.add(fbx);

            // Resolve when loaded? Or return group immediately?
            // Usually returns group immediately and loads async.
            // But if we want to rotate the group, we can do it immediately.
        }, undefined, (err) => {
            console.error(err);
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshStandardMaterial({ color: 0x885522 })
            );
            mesh.position.y = 1;
            group.add(mesh);
        });

        group.position.set(x, 0, z);
        state.scene.add(group);
        state.objects.push(group);

        resolve(group);
    });
}

async function addStructure(type, x = 0, z = 0) {
    return addStructureResult(type, x, z);
}

function addSpawnAt(x, z) {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    mesh.userData = { type: 'spawn', id: `spawn_${Date.now()}`, isRoot: true };
    mesh.position.set(x, 1, z);
    state.scene.add(mesh);
    state.objects.push(mesh);
    return mesh;
}

function addEnemyAt(type, x, z) {
    const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5, 2, 4),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    mesh.userData = { type: 'enemy', enemyType: type, id: `${type}_${Date.now()}`, isRoot: true };
    mesh.position.set(x, 1, z);
    state.scene.add(mesh);
    state.objects.push(mesh);
    return mesh;
}

function addSpawn() {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 2, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 })
    );
    mesh.userData = { type: 'spawn', id: `spawn_${Date.now()}`, isRoot: true };
    mesh.position.y = 1;
    state.scene.add(mesh);
    state.objects.push(mesh);
}

function addEnemy(type) {
    const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5, 2, 4),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    mesh.userData = { type: 'enemy', enemyType: type, id: `${type}_${Date.now()}`, isRoot: true };
    mesh.position.y = 1;
    state.scene.add(mesh);
    state.objects.push(mesh);
}

function addPlaceholder(type, x, z, color) {
    const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(1, 4, 8),
        new THREE.MeshStandardMaterial({ color: color })
    );
    mesh.userData = { type: type, id: `${type}_${Date.now()}`, isRoot: true };
    mesh.position.set(x, 2, z);
    state.scene.add(mesh);
    state.objects.push(mesh);
}

// ------------------------------------------------------------------
// Map Loading
// ------------------------------------------------------------------

function refreshMapList() {
    const selector = document.getElementById('mapList');
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

function loadSelectedMap() {
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
    state.objects = [];
    state.selectedObject = null;
    state.gizmo.detach();
    document.getElementById('mapName').value = mapData.name || 'loaded_map';

    // 1. Structures
    if (mapData.structures) {
        mapData.structures.forEach(s => {
            // Mapping back from save data
            // We use addStructure logic but need to handle async loading or manual placement
            // addStructure is async, so we assume it handles it.
            // Wait, we need to respect Rotation.
            // Our save format stores: { x: -90, y: 0, z: WORLD_ROT_Y } for House.
            // addStructure('house') sets Rotation X to -90 default.
            // So we only need to apply Y rotation.

            // Wait, addStructure generates ID. We might want to preserve ID if useful?
            // For now new ID is fine as this is a generator.

            addStructure(s.type, s.x, s.z).then(() => {
                // Find the just added object (last in list)
                // This is risky if race conditions.
                // Better to refactor addStructure to return the object.
                // But addStructure IS NOT RETURNING anything currently (async void).
                // I will update addStructure to return the Group.

                // Hacky fix: Since JS is single threaded event loop, we can probably find it if we modify addStructure.
            });
        });
    }

    // We need to refactor addStructure to handle rotation injection.
    // Instead, I'll update loadMapData to:
    // 1. Call addStructure.
    // 2. But addStructure doesn't take rotation.

    // Alternative: Re-implement reconstruction locally here to have control.
    reconstructScene(mapData);
}

async function reconstructScene(mapData) {
    if (mapData.structures) {
        for (let s of mapData.structures) {
            // We need to wait for each add to apply rotation? 
            // Or act on the promise. 
            // Let's modify addStructure to accept rotation or return the object.

            const obj = await addStructureResult(s.type, s.x, s.z);
            if (obj) {
                // Apply rotation
                // Saved house rotation: {x:-90, y:0, z: Y_ANGLE_DEG}
                // Our internal house logic: X is -90. Rotation around Y axis is what we want.
                // Gizmo rotates around Y (obj.rotation.y).
                // Saved Z seems to correspond to our Y?
                // Let's look at saveMap:
                // rotation: { x: -90, y: 0, z: THREE.MathUtils.radToDeg(obj.rotation.y) }
                // So saved Z is the Y rotation in degrees.

                const yRad = THREE.MathUtils.degToRad(s.rotation.z);
                obj.rotation.y = yRad;
            }
        }
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

// ------------------------------------------------------------------
// IO
// ------------------------------------------------------------------

function saveMap() {
    const name = document.getElementById('mapName').value || 'untitled';

    // Export Data
    const mapData = {
        name: name,
        structures: [],
        spawns: [],
        enemies: []
    };

    state.objects.forEach(obj => {
        const pos = { x: obj.position.x, y: obj.position.y, z: obj.position.z };

        if (obj.userData.type === 'house') {
            mapData.structures.push({
                type: 'house',
                id: obj.userData.id,
                x: pos.x, y: pos.y, z: pos.z,
                rotation: { x: -90, y: 0, z: THREE.MathUtils.radToDeg(obj.rotation.y) }
            });
        } else if (obj.userData.type === 'spawn') {
            mapData.spawns.push({ x: pos.x, y: pos.y, z: pos.z, class: 'Warrior' });
        } else if (obj.userData.type === 'enemy') {
            mapData.enemies.push({
                type: obj.userData.enemyType,
                id: obj.userData.id,
                x: pos.x, y: pos.y, z: pos.z
            });
        }
    });

    console.log("Saving...", mapData);

    fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data: mapData })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) alert('Map Saved!');
            else alert('Error: ' + data.error);
        });
}

// Init
init();
