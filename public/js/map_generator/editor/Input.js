import * as THREE from 'three';
import { state } from './State.js';
import { deleteSelected } from './Objects.js';
import { UI } from './UI.js';

export function initEvents() {
    const canvas = state.renderer.domElement;

    // Canvas Events
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    // Note: UI Events are handled in UI.js now
}

function onPointerDown(event) {
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    state.raycaster.setFromCamera(state.pointer, state.camera);

    // Check Gizmo First
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
        UI.switchTab('edit');
    } else {
        state.gizmo.detach();
        // Optional: Switch back to home or stay on edit (but empty)
        // UI.switchTab('home'); 
    }
    UI.updateSelection(obj);
}

function onKeyDown(event) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
        // Check if we are focusing an input?
        if (document.activeElement.tagName === 'INPUT') return;
        deleteSelected();
    }
}
