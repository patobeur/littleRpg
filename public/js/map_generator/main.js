import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { TransformGizmo } from './Gizmo.js';

// Global State
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

    // Tick
    animate();

    // Auto-generate for initial feedback
    console.log('Map Generator Initialized');
    generateVillage(10);
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
        generateVillage(size);
    } else {
        generateForest(size);
    }
}

function generateVillage(size) {
    // Simple Grid Layout
    const spacing = 10;
    const offset = (size * spacing) / 2;

    for (let x = 0; x < size; x++) {
        for (let z = 0; z < size; z++) {
            // Leave a central road
            if (x === Math.floor(size / 2)) continue;

            // Random chance
            if (Math.random() > 0.6) {
                const posX = (x * spacing) - offset;
                const posZ = (z * spacing) - offset;
                addStructure('house', posX, posZ);
            }
        }
    }
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

async function addStructure(type, x = 0, z = 0) {
    // Load Model
    const modelPath = `/structures/${type}.fbx`;

    try {
        const group = new THREE.Group(); // Container
        group.userData = { type: type, id: `${type}_${Date.now()}`, isRoot: true };

        // Visuals
        state.loader.load(modelPath, (fbx) => {
            // Apply scale if needed (houses are 1:1 now)
            fbx.scale.setScalar(1);
            // Fix rotation: House model needs -90 X to stand up
            if (type === 'house') {
                fbx.rotation.x = -Math.PI / 2;
            }
            fbx.traverse(c => { if (c.isMesh) c.castShadow = true; });
            group.add(fbx);
        }, undefined, (err) => {
            console.error(err);
            // Fallback
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

    } catch (e) {
        console.error(e);
    }
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
