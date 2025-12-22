/**
 * UI.js - Handles Ribbon UI interactions
 */
import * as THREE from 'three';
import { state } from './State.js';

export const UI = {
    // Tab Switching
    switchTab: (tabName) => {
        // Hide all panels
        document.querySelectorAll('.ribbon-panel').forEach(p => p.classList.remove('active'));
        // Deactivate all tabs
        document.querySelectorAll('.ribbon-tab').forEach(b => b.classList.remove('active'));

        // Activate target
        const panel = document.getElementById(`ribbon-${tabName}`);
        const btn = document.querySelector(`.ribbon-tab[onclick*="${tabName}"]`);

        if (panel) panel.classList.add('active');
        if (btn) btn.classList.add('active');
    },

    // Update UI from Scene State (e.g. Selection)
    updateSelection: (obj) => {
        const info = document.getElementById('selection-info');
        if (!info) return;

        if (obj) {
            info.innerText = `${obj.userData.type} (${obj.userData.id})`;

            // Auto-switch to Edit tab if desired?
            // UI.switchTab('edit'); 

            // Update Input Fields
            const posX = document.getElementById('posX');
            const posZ = document.getElementById('posZ');
            const rotY = document.getElementById('rotY');
            const scale = document.getElementById('scale');

            if (posX) posX.value = obj.position.x.toFixed(2);
            if (posZ) posZ.value = obj.position.z.toFixed(2);
            if (rotY) rotY.value = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(2);
            if (scale) scale.value = obj.scale.x.toFixed(2); // Assuming uniform scale
        } else {
            info.innerText = "No Selection";
            document.getElementById('posX').value = '';
            document.getElementById('posZ').value = '';
            document.getElementById('rotY').value = '';
            document.getElementById('scale').value = '';
        }
    },

    // Bind Input Events to Scene Actions
    initBindings: (updateGizmoCallback, updateEnvCallback) => {
        // Selection Transforms
        const updateTransform = () => {
            if (!state.selectedObject) return;
            const x = parseFloat(document.getElementById('posX').value) || 0;
            const z = parseFloat(document.getElementById('posZ').value) || 0;
            const r = parseFloat(document.getElementById('rotY').value) || 0;
            const s = parseFloat(document.getElementById('scale').value) || 1;

            state.selectedObject.position.x = x;
            state.selectedObject.position.z = z;
            state.selectedObject.rotation.y = THREE.MathUtils.degToRad(r);
            state.selectedObject.scale.setScalar(s);

            if (updateGizmoCallback) updateGizmoCallback();
        };

        ['posX', 'posZ', 'rotY', 'scale'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', updateTransform);
        });

        // Environment
        const updateEnv = () => {
            if (!updateEnvCallback) return;
            const settings = {
                bgColor: document.getElementById('bgColor').value,
                fogColor: document.getElementById('fogColor').value,
                fogNear: document.getElementById('fogNear').value,
                fogFar: document.getElementById('fogFar').value,
                ambColor: document.getElementById('ambColor').value,
                ambInt: document.getElementById('ambInt').value
            };
            updateEnvCallback(settings);
        };

        ['bgColor', 'fogColor', 'fogNear', 'fogFar', 'ambColor', 'ambInt'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', updateEnv);
                // Trigger initial update? 
                // Maybe better to wait for Scene init or call manually.
            }
        });

        // Expose switchTab globally for HTML onclicks
        window.UI = UI;
    }
};

// Also expose globally immediately for init
window.UI = UI;
