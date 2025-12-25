import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Manages the THREE.js renderer, camera, and controls
 */
export class RendererManager {
    constructor(container) {
        this.container = container;
        this.renderer = null;
        this.camera = null;
        this.controls = null;
    }

    /**
     * Setup the WebGL renderer
     * @returns {THREE.WebGLRenderer}
     */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        return this.renderer;
    }

    /**
     * Setup the perspective camera
     * @returns {THREE.PerspectiveCamera}
     */
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 15);
        this.camera.lookAt(0, 0, 0);
        return this.camera;
    }

    /**
     * Setup orbit controls for camera
     * @returns {OrbitControls}
     */
    setupControls() {
        if (!this.camera || !this.renderer) {
            console.error('[RendererManager] Camera and renderer must be set up before controls');
            return null;
        }
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        return this.controls;
    }

    /**
     * Handle window resize events
     */
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    /**
     * Get the renderer
     * @returns {THREE.WebGLRenderer}
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Get the camera
     * @returns {THREE.PerspectiveCamera}
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get the controls
     * @returns {OrbitControls}
     */
    getControls() {
        return this.controls;
    }
}
