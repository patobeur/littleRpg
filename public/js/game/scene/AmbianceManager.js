import * as THREE from 'three';
import { Config } from '../../config.js';

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
    }

    /**
     * Resize ground and grid to match map size
     * @param {number} mapSize - Total map size (e.g. 60)
     */
    resizeGround(mapSize) {
        if (!this.groundMesh) return;

        let width, height;
        if (typeof mapSize === 'object') {
            // New format: { width, height }
            width = mapSize.width;
            height = mapSize.height;
        } else {
            // Legacy format: mapSize was "radius"
            width = mapSize * 2;
            height = mapSize * 2;
        }

        // Update Plane
        this.groundMesh.geometry.dispose();
        this.groundMesh.geometry = new THREE.PlaneGeometry(width, height);

        // Update Grid - REMOVED as per user request
        // Remove ALL existing grids to prevent stacking
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const child = this.scene.children[i];
            if (child.isGridHelper || child.userData.isGameGrid) {
                this.scene.remove(child);
                if (child.geometry) child.geometry.dispose();
            }
        }
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
        if (this.groundMesh) {
            let color = 0x5c9c5c; // Default Green
            let roughness = 0.8;
            let emissive = 0x000000;

            // 1. Determine base color from type
            if (config.groundType) {
                switch (config.groundType) {
                    case 'grass': color = 0x5c9c5c; roughness = 0.9; break;
                    case 'sand': color = 0xe6c288; roughness = 1.0; break;
                    case 'rock': color = 0x666666; roughness = 0.6; break;
                    case 'dirt': color = 0x8b5a2b; roughness = 1.0; break;
                    case 'lava': color = 0xcf1020; roughness = 0.5; emissive = 0x330000; break;
                    case 'default': color = 0x5c9c5c; roughness = 0.9; break;
                }
            }

            // 2. Override with specific color if provided and not undefined/null
            if (config.groundColor) {
                // Use set(color) which handles hex strings and numbers
                this.groundMesh.material.color.set(config.groundColor);
            } else {
                // Fallback to type color or default
                this.groundMesh.material.color.setHex(color);
            }

            this.groundMesh.material.roughness = roughness;
            this.groundMesh.material.emissive.setHex(emissive);

            // Legacy support
            if (config.ground) {
                if (config.ground.color) this.groundMesh.material.color.setHex(config.ground.color);
                this.groundMesh.material.roughness = config.ground.roughness;
                this.groundMesh.material.metalness = config.ground.metalness;
            }
            this.groundMesh.material.needsUpdate = true;
        }

        // Dynamic Grid Sizing
        // Check for mapSize in config (passed from SceneManager)
        if (config.mapSize) {
            this.resizeGround(config.mapSize);
        }

        // Lighting (Ambient) - Match Map Generator logic
        if (config.ambColor || config.ambInt !== undefined) {
            const amb = this.scene.children.find(c => c.isAmbientLight);
            if (amb) {
                if (config.ambColor) amb.color = new THREE.Color(config.ambColor);
                if (config.ambInt !== undefined) amb.intensity = parseFloat(config.ambInt);
            }
        }

        // Sun Settings
        const dir = this.scene.children.find(c => c.isDirectionalLight);
        if (dir) {
            if (config.sunColor) dir.color = new THREE.Color(config.sunColor);
            if (config.sunInt !== undefined) dir.intensity = parseFloat(config.sunInt);
            if (config.sunPos) {
                dir.position.set(config.sunPos.x, config.sunPos.y, config.sunPos.z);
            }
        }
    }

    loadLights(lightsData) {
        // Clear existing map point lights
        // Iterate backwards to safely remove
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
            const child = this.scene.children[i];
            if (child.isPointLight && child.userData.isMapLight) {
                this.scene.remove(child);
            }
        }

        if (!lightsData) return;

        lightsData.forEach(l => {
            const color = l.color !== undefined ? l.color : 0xffaa00;
            const distance = l.distance !== undefined ? l.distance : 15;
            const decay = l.decay !== undefined ? l.decay : 2;
            const intensity = l.intensity !== undefined ? l.intensity : 1;

            const light = new THREE.PointLight(color, intensity, distance, decay);
            light.position.set(l.x, l.y, l.z);
            light.userData.isMapLight = true;
            // Shadow casting for point lights is expensive, enable if needed
            // light.castShadow = true; 

            this.scene.add(light);
        });

        console.log(`[AmbianceManager] Loaded ${lightsData.length} point lights`);
    }
}

