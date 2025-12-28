import * as THREE from 'three';

/**
 * Manages scene ambiance: lighting, fog, and ground
 */
export class AmbianceManager {
    constructor(scene) {
        this.scene = scene;
        this.groundMesh = null;
    }

    /**
     * Setup scene lights (ambient and directional)
     */
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;

        // Shadow High Quality settings (match Map Generator)
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 200;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;

        this.scene.add(dirLight);
    }

    /**
     * Setup ground plane with grid
     */
    setupGround() {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({
            color: 0x242444,
            roughness: 0.8,
            metalness: 0.2
        });
        this.groundMesh = new THREE.Mesh(geometry, material);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.receiveShadow = true;
        this.scene.add(this.groundMesh);

        const grid = new THREE.GridHelper(100, 50, 0x444466, 0x222233);
        grid.position.y = 0.01;
        this.scene.add(grid);
    }

    /**
     * Update scene ambiance based on config
     * @param {Object} config - Ambiance configuration
     */
    updateAmbiance(config) {
        if (!config || !this.scene) return;

        // Background
        if (config.background) {
            this.scene.background = new THREE.Color(config.background);
        }

        // Fog
        if (config.fog) {
            this.scene.fog = new THREE.Fog(config.fog.color, config.fog.near, config.fog.far);
        } else {
            this.scene.fog = null;
        }

        // Ground Material
        if (config.ground && this.groundMesh) {
            this.groundMesh.material.color.setHex(config.ground.color);
            this.groundMesh.material.roughness = config.ground.roughness;
            this.groundMesh.material.metalness = config.ground.metalness;
            this.groundMesh.material.needsUpdate = true;
        }

        // Lighting (Ambient) - Match Map Generator logic
        if (config.ambColor || config.ambInt !== undefined) {
            const amb = this.scene.children.find(c => c.isAmbientLight);
            if (amb) {
                if (config.ambColor) amb.color = new THREE.Color(config.ambColor);
                if (config.ambInt !== undefined) amb.intensity = parseFloat(config.ambInt);
            }
        }
    }
}
