import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor(game) {
        this.game = game;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Environment elements
        this.spawnMarkers = [];
        this.teleportZones = [];
    }

    init() {
        this.setupScene();
        this.setupLights();
        this.setupGround();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 15);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.game.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    setupGround() {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({
            color: 0x242444,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(100, 50, 0x444466, 0x222233);
        grid.position.y = 0.01;
        this.scene.add(grid);

        // Create spawn point markers and teleport zones will be called when config is loaded
    }

    createSpawnMarkers(spawnConfigList) {
        // Clear existing spawn markers
        if (this.spawnMarkers) {
            this.spawnMarkers.forEach(marker => {
                if (marker.mesh) this.scene.remove(marker.mesh);
            });
        }
        this.spawnMarkers = [];

        if (!spawnConfigList) {
            console.warn('[SceneManager] No spawn config provided');
            return;
        }

        // Color mapping for classes (same as teleport zones)
        const colorMap = {
            'Warrior': 0xff4444,
            'Mage': 0x4444ff,
            'Healer': 0x44ff44
        };

        spawnConfigList.forEach(spawnConfig => {
            // Create small circle at spawn point
            const geometry = new THREE.CircleGeometry(0.5, 32);
            const material = new THREE.MeshBasicMaterial({
                color: colorMap[spawnConfig.class] || 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.4
            });
            const circle = new THREE.Mesh(geometry, material);
            circle.position.set(spawnConfig.x, 0.05, spawnConfig.z); // Slightly above ground
            circle.rotation.x = -Math.PI / 2; // Horizontal

            this.scene.add(circle);

            this.spawnMarkers.push({
                config: spawnConfig,
                mesh: circle,
                material: material
            });
        });

        console.log(`[SceneManager] Created ${this.spawnMarkers.length} spawn markers`);
    }

    createTeleportZones(teleportConfigList) {
        // Clear existing zones
        this.teleportZones.forEach(zone => {
            if (zone.mesh) this.scene.remove(zone.mesh);
            if (zone.ring) this.scene.remove(zone.ring);
        });
        this.teleportZones = [];

        if (!teleportConfigList) {
            console.warn('[SceneManager] No teleport config provided');
            return;
        }

        teleportConfigList.forEach(zoneConfig => {
            // Create glowing circle
            const geometry = new THREE.CircleGeometry(zoneConfig.radius, 32);
            const material = new THREE.MeshBasicMaterial({
                color: zoneConfig.color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.3
            });
            const circle = new THREE.Mesh(geometry, material);
            circle.position.set(zoneConfig.x, zoneConfig.y, zoneConfig.z);
            circle.rotation.x = -Math.PI / 2; // Horizontal

            // Add ring outline
            const ringGeometry = new THREE.RingGeometry(zoneConfig.radius - 0.1, zoneConfig.radius, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: zoneConfig.color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(zoneConfig.x, zoneConfig.y + 0.01, zoneConfig.z);
            ring.rotation.x = -Math.PI / 2;

            this.scene.add(circle);
            this.scene.add(ring);

            this.teleportZones.push({
                config: zoneConfig,
                mesh: circle,
                ring: ring,
                material: material,
                ringMaterial: ringMaterial
            });
        });
    }

    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}
