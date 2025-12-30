import * as THREE from 'three';
import { state } from './State.js';
import { deleteSelected } from './Objects.js';
import { UI } from './UI.js';

// Drag State
let isDragging = false;
let dragObject = null;
const dragPlane = new THREE.Plane();
const dragStartPoint = new THREE.Vector3();
const dragOffset = new THREE.Vector3();

export function initEvents() {
    const canvas = state.renderer.domElement;

    // Canvas Events
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);

    // Note: UI Events are handled in UI.js now
}

function onPointerDown(event) {
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    state.raycaster.setFromCamera(state.pointer, state.camera);

    // 1. CTRL+Drag Check
    if (event.ctrlKey) {
        const intersects = state.raycaster.intersectObjects(state.objects, true);
        if (intersects.length > 0) {
            let target = intersects[0].object;
            // Find root
            while (target.parent && !target.userData.isRoot) {
                target = target.parent;
            }
            if (target.userData.isRoot) {
                // Start Drag
                isDragging = true;
                dragObject = target;
                state.controls.enabled = false; // Disable orbit

                // Setup Plane (Horizontal at object height)
                dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), dragObject.position);

                // Calculate Offset
                if (state.raycaster.ray.intersectPlane(dragPlane, dragStartPoint)) {
                    dragOffset.copy(dragStartPoint).sub(dragObject.position);
                }

                selectObject(target); // Ensure it's selected too
                return; // Consumed
            }
        }
    }

    // Check Gizmo First (if not dragging)
    if (state.gizmo.onPointerDown(event, state.raycaster)) return;

    // Objects Selection
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

function onPointerMove(event) {
    if (!isDragging || !dragObject) return;

    const rect = state.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    state.raycaster.setFromCamera({ x, y }, state.camera);

    const intersection = new THREE.Vector3();
    if (state.raycaster.ray.intersectPlane(dragPlane, intersection)) {
        // New Position = Intersection - Offset
        dragObject.position.copy(intersection.sub(dragOffset));

        // Update UI
        UI.updateSelection(dragObject);
        state.gizmo.updatePosition(); // Sync visual Gizmo

        // Update Roads if needed
        if (dragObject.userData.type === 'road_joint' || dragObject.userData.type === 'skeleton_node') {
            import('./RoadNetwork.js').then(m => m.RoadNetwork.updateNode(dragObject));
        }
    }
}

function onPointerUp(event) {
    if (isDragging) {
        isDragging = false;
        dragObject = null;
        state.controls.enabled = true; // Re-enable orbit
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
