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

            // Update Transform Inputs
            const posX = document.getElementById('posX');
            const posY = document.getElementById('posY');
            const posZ = document.getElementById('posZ');
            const rotY = document.getElementById('rotY');
            const scale = document.getElementById('scale');

            if (posX) posX.value = obj.position.x.toFixed(2);
            if (posY) posY.value = obj.position.y.toFixed(2);
            if (posZ) posZ.value = obj.position.z.toFixed(2);
            if (rotY) rotY.value = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(2);
            if (scale) scale.value = obj.scale.x.toFixed(2);

            // Light Properties
            const lightProps = document.getElementById('edit-light-properties');
            if (obj.userData.type === 'light' && obj.userData.lightType === 'point') {
                if (lightProps) lightProps.style.display = 'block';

                // Populate Inputs
                const colorHex = '#' + new THREE.Color(obj.userData.color).getHexString();
                const lColor = document.getElementById('editLightColor');
                const lInt = document.getElementById('editLightInt');
                const lDist = document.getElementById('editLightDist');
                const lDecay = document.getElementById('editLightDecay');

                if (lColor) lColor.value = colorHex;
                if (lInt) lInt.value = obj.userData.intensity;
                if (lDist) lDist.value = obj.userData.distance;
                if (lDecay) lDecay.value = obj.userData.decay;

            } else {
                if (lightProps) lightProps.style.display = 'none';
            }

        } else {
            info.innerText = "No Selection";
            document.getElementById('posX').value = '';
            document.getElementById('posZ').value = '';
            document.getElementById('rotY').value = '';
            document.getElementById('scale').value = '';

            const lightProps = document.getElementById('edit-light-properties');
            if (lightProps) lightProps.style.display = 'none';
        }
    },

    // Bind Input Events to Scene Actions
    initBindings: (updateGizmoCallback, updateEnvCallback) => {
        // Selection Transforms
        const updateTransform = () => {
            if (!state.selectedObject) return;
            const x = parseFloat(document.getElementById('posX').value) || 0;
            const y = parseFloat(document.getElementById('posY').value) || 0;
            const z = parseFloat(document.getElementById('posZ').value) || 0;
            const r = parseFloat(document.getElementById('rotY').value) || 0;
            const s = parseFloat(document.getElementById('scale').value) || 1;

            state.selectedObject.position.x = x;
            state.selectedObject.position.y = y;
            state.selectedObject.position.z = z;
            state.selectedObject.rotation.y = THREE.MathUtils.degToRad(r);
            state.selectedObject.scale.setScalar(s);

            if (updateGizmoCallback) updateGizmoCallback();
        };

        ['posX', 'posY', 'posZ', 'rotY', 'scale'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', updateTransform);
        });

        // Light Property Updates
        const updateLight = () => {
            const obj = state.selectedObject;
            if (!obj || obj.userData.type !== 'light') return;

            const colorInput = document.getElementById('editLightColor').value;
            const intensity = parseFloat(document.getElementById('editLightInt').value) || 0;
            const distance = parseFloat(document.getElementById('editLightDist').value) || 0;
            const decay = parseFloat(document.getElementById('editLightDecay').value) || 0;

            const colorInt = new THREE.Color(colorInput).getHex();

            // Update UserData (for save)
            obj.userData.color = colorInt;
            obj.userData.intensity = intensity;
            obj.userData.distance = distance;
            obj.userData.decay = decay;

            // Update Actual Light Object
            const light = obj.children.find(c => c.name === 'LightSource');
            if (light) {
                light.color.setHex(colorInt);
                light.intensity = intensity;
                light.distance = distance;
                light.decay = decay;
            }

            // Update Helper Visual
            const helper = obj.children.find(c => c.name === 'LightHelper');
            if (helper) {
                helper.material.color.setHex(colorInt);
            }
        };

        ['editLightColor', 'editLightInt', 'editLightDist', 'editLightDecay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', updateLight);
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
                ambInt: document.getElementById('ambInt').value,
                sunColor: document.getElementById('sunColor')?.value,
                sunInt: document.getElementById('sunInt')?.value,
                sunX: document.getElementById('sunX')?.value,
                sunY: document.getElementById('sunY')?.value,
                sunZ: document.getElementById('sunZ')?.value
            };
            updateEnvCallback(settings);
        };

        ['bgColor', 'fogColor', 'fogNear', 'fogFar', 'ambColor', 'ambInt', 'sunColor', 'sunInt', 'sunX', 'sunY', 'sunZ'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', updateEnv);
            }
        });

        // Expose switchTab globally for HTML onclicks
        window.UI = UI;
    }
};

// Also expose globally immediately for init
window.UI = UI;
