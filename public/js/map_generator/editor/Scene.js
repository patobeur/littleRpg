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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
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

    // 6. Grid
    const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
    state.scene.add(gridHelper);

    // 7. Ground Plane (Invisible mostly, for raycast)
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, depthWrite: true })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
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
        state.scene.fog.color = new THREE.Color(settings.fogColor || settings.bgColor);
    }

    if (settings.fogNear !== undefined && settings.fogFar !== undefined) {
        state.scene.fog.near = parseFloat(settings.fogNear);
        state.scene.fog.far = parseFloat(settings.fogFar);
    }

    // Lights
    const amb = state.scene.children.find(c => c.isAmbientLight);
    if (amb) {
        if (settings.ambColor) amb.color = new THREE.Color(settings.ambColor);
        if (settings.ambInt !== undefined) amb.intensity = parseFloat(settings.ambInt);
    }
}

export function onWindowResize() {
    const viewport = document.getElementById('viewport');
    if (!viewport) return;

    state.camera.aspect = viewport.offsetWidth / viewport.offsetHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(viewport.offsetWidth, viewport.offsetHeight);
}
