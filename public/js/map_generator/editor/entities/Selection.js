import { state } from '../State.js';

export function deleteSelected() {
    if (state.selectedObject) {
        // Empêcher la suppression des spawns et exits (éléments obligatoires)
        const objectType = state.selectedObject.userData?.type;
        if (objectType === 'spawn' || objectType === 'exit') {
            console.warn(`Cannot delete ${objectType}s - they are required elements`);
            return;
        }

        state.scene.remove(state.selectedObject);
        state.gizmo.detach();
        const index = state.objects.indexOf(state.selectedObject);
        if (index > -1) state.objects.splice(index, 1);
        state.selectedObject = null;
    }
}
