import * as THREE from 'three';
import { state } from './State.js';
import { deleteSelected } from './Objects.js';

export function initEvents() {
    const canvas = state.renderer.domElement;

    window.addEventListener('resize', () => {
        // Handled by Scene.js onWindowResize usually, but events often bound in main
        // We'll expose onWindowResize in Scene
    });

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    // UI Events
    setupUIEvents();
}

function onPointerDown(event) {
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    state.raycaster.setFromCamera(state.pointer, state.camera);

    // Check Gizmo First
    // Gizmo handles its own events? 
    // In original code: const raycaster = new THREE.Raycaster(); raycaster.setFromCamera...
    // But Gizmo class has onPointerDown?
    // state.gizmo.onPointerDown(event, state.raycaster);
    // If gizmo returns true, return.

    if (state.gizmo.onPointerDown(event, state.raycaster)) return;

    // Objects
    const intersects = state.raycaster.intersectObjects(state.objects, true);
    if (intersects.length > 0) {
        // Find root
        let target = intersects[0].object;
        while (target.parent && !target.userData.isRoot) {
            target = target.parent;
        }
        if (target.userData.isRoot) {
            selectObject(target);
        }
    } else {
        selectObject(null);
    }
}

function selectObject(obj) {
    state.selectedObject = obj;
    if (obj) {
        state.gizmo.attach(obj);
        updateUIFromSelection();
        document.getElementById('edit-panel').style.display = 'block';
        if (obj.userData.type === 'structure' || obj.userData.type === 'house') {
            // Show structure specific
        }
    } else {
        state.gizmo.detach();
        document.getElementById('edit-panel').style.display = 'none';
        // Go back to create tab?
    }
}

function onKeyDown(event) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelected();
    }
}

function updateUIFromSelection() {
    if (!state.selectedObject) return;
    const obj = state.selectedObject;
    const posX = document.getElementById('posX');
    const posZ = document.getElementById('posZ');
    const rotY = document.getElementById('rotY');

    if (posX) posX.value = obj.position.x.toFixed(2);
    if (posZ) posZ.value = obj.position.z.toFixed(2);
    if (rotY) rotY.value = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(2);
}

function setupUIEvents() {
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
            // Gizmo rotation visual update if needed
        }
    });
}
