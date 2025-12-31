import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { state } from './State.js';

export function initThree() {
    // 1. Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x111111);
    state.scene.fog = new THREE.Fog(0x111111, 20, 100);

    // 2. Camera
    state.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(20, 20, 20);

    // 3. Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.shadowMap.enabled = true;

    // Size will be set by updateViewport
    const viewport = document.getElementById('viewport');
    state.renderer.setSize(viewport.offsetWidth, viewport.offsetHeight);
    viewport.appendChild(state.renderer.domElement);

    // 4. Controls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    state.controls.maxPolarAngle = Math.PI / 2.1;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Default 1.0
    state.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    state.scene.add(dirLight);

    // 6. Grid - REMOVED per user request
    // const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
    // state.scene.add(gridHelper);

    // 7. Ground Plane (Invisible mostly, for raycast)
    // 7. Ground Plane (Invisible mostly, for raycast)
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshStandardMaterial({ color: 0xffffff, depthWrite: true })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.userData.isGround = true; // Tag for identification
    state.scene.add(plane);

    // 8. Raycaster
    state.raycaster = new THREE.Raycaster();
    state.pointer = new THREE.Vector2();

    // 9. Loader
    state.loader = new FBXLoader();
}

export function updateEnvironment(settings) {
    if (settings.bgColor) {
        state.scene.background = new THREE.Color(settings.bgColor);
        if (state.scene.fog) state.scene.fog.color = new THREE.Color(settings.fogColor || settings.bgColor);
    }

    // Fog Toggle Logic
    if (settings.fogEnabled !== undefined) {
        if (settings.fogEnabled === true || settings.fogEnabled === 'true') {
            // Enable Fog
            if (!state.scene.fog) {
                const color = settings.fogColor ? new THREE.Color(settings.fogColor) : state.scene.background;
                state.scene.fog = new THREE.Fog(color, 20, 100);
            }
            // Update values
            if (settings.fogNear !== undefined) state.scene.fog.near = parseFloat(settings.fogNear);
            if (settings.fogFar !== undefined) state.scene.fog.far = parseFloat(settings.fogFar);
            if (settings.fogColor) state.scene.fog.color = new THREE.Color(settings.fogColor);
        } else {
            // Disable Fog
            state.scene.fog = null;
        }
    } else {
        // Fallback or initialization if specific prop missing, check if we should update params of existing fog
        if (state.scene.fog && settings.fogNear !== undefined) state.scene.fog.near = parseFloat(settings.fogNear);
        if (state.scene.fog && settings.fogFar !== undefined) state.scene.fog.far = parseFloat(settings.fogFar);
    }

    // Lights
    const amb = state.scene.children.find(c => c.isAmbientLight);
    if (amb) {
        if (settings.ambColor) amb.color = new THREE.Color(settings.ambColor);
        if (settings.ambInt !== undefined) amb.intensity = parseFloat(settings.ambInt);
    }

    // Environment Lights
    const dir = state.scene.children.find(c => c.isDirectionalLight);
    if (dir) {
        if (settings.sunColor) dir.color = new THREE.Color(settings.sunColor);
        if (settings.sunInt !== undefined) dir.intensity = parseFloat(settings.sunInt);

        if (settings.sunX !== undefined && settings.sunY !== undefined && settings.sunZ !== undefined) {
            dir.position.set(parseFloat(settings.sunX), parseFloat(settings.sunY), parseFloat(settings.sunZ));
        }
    }

    // Ground Generic Settings
    if (settings.groundType) {
        updateGroundType(settings.groundType);
    }

    // Ground Color (Override if specific color provided after type)
    const ground = state.scene.children.find(c => c.userData.isGround);
    if (ground && settings.groundColor) {
        ground.material.color = new THREE.Color(settings.groundColor);
    }
}

export function updateGroundType(type) {
    const ground = state.scene.children.find(c => c.userData.isGround);
    const colorInput = document.getElementById('groundColor');

    let color = null;
    let roughness = 0.8;

    // Presets
    switch (type) {
        case 'grass': color = '#5c9c5c'; roughness = 0.9; break;
        case 'sand': color = '#e6c288'; roughness = 1.0; break; // Warmer sand
        case 'rock': color = '#666666'; roughness = 0.6; break;
        case 'dirt': color = '#8b5a2b'; roughness = 1.0; break;
        case 'lava': color = '#cf1020'; roughness = 0.5; break;
        case 'default': color = '#5c9c5c'; roughness = 0.9; break; // Default to grass green
        default: return;
    }

    // Apply if preset found
    if (color) {
        if (colorInput) colorInput.value = color;
        if (ground) {
            ground.material.color = new THREE.Color(color);
            ground.material.roughness = roughness;

            // Lava special effect? For now just color.
            if (type === 'lava') {
                ground.material.emissive = new THREE.Color(0x330000);
            } else {
                ground.material.emissive = new THREE.Color(0x000000);
            }
        }
    }
}

export function onWindowResize() {
    const viewport = document.getElementById('viewport');
    if (!viewport) return;

    state.camera.aspect = viewport.offsetWidth / viewport.offsetHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(viewport.offsetWidth, viewport.offsetHeight);
}

export function updateGround(width, depth) {
    // Width and Depth are now 1:1 with World Units
    // Remove old ground planes
    for (let i = state.scene.children.length - 1; i >= 0; i--) {
        const child = state.scene.children[i];
        if (child.userData.isGround || (child.isMesh && child.geometry.type === 'PlaneGeometry' && child.rotation.x === -Math.PI / 2)) {
            state.scene.remove(child);
            if (child.geometry) child.geometry.dispose();
        }
    }

    const groundColor = document.getElementById('groundColor')?.value || '#5c9c5c';
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(width, depth),
        new THREE.MeshStandardMaterial({ color: groundColor, depthWrite: true })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.userData.isGround = true; // Tag for identification
    state.scene.add(plane);
}
