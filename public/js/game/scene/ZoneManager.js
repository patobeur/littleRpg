import * as THREE from 'three';

/**
 * Manages interactive zones like spawn markers and teleport zones
 */
export class ZoneManager {
    constructor(scene) {
        this.scene = scene;
        this.spawnMarkers = [];
        this.teleportZones = [];
    }

    /**
     * Create spawn point markers
     * @param {Array} spawnConfigList - List of spawn configurations
     */
    createSpawnMarkers(spawnConfigList) {
        // Clear existing spawn markers
        if (this.spawnMarkers) {
            this.spawnMarkers.forEach(marker => {
                if (marker.mesh) this.scene.remove(marker.mesh);
            });
        }
        this.spawnMarkers = [];

        if (!spawnConfigList) {
            console.warn('[ZoneManager] No spawn config provided');
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
            circle.position.set(spawnConfig.x, 0.05, spawnConfig.z);
            circle.rotation.x = -Math.PI / 2;

            this.scene.add(circle);

            this.spawnMarkers.push({
                config: spawnConfig,
                mesh: circle,
                material: material
            });
        });

        console.log(`[ZoneManager] Created ${this.spawnMarkers.length} spawn markers`);
    }

    /**
     * Create teleport zones with visual effects
     * @param {Array} teleportConfigList - List of teleport zone configurations
     */
    createTeleportZones(teleportConfigList) {
        // Clear existing zones
        this.teleportZones.forEach(zone => {
            if (zone.mesh) this.scene.remove(zone.mesh);
            if (zone.ring) this.scene.remove(zone.ring);
        });
        this.teleportZones = [];

        if (!teleportConfigList) {
            console.warn('[ZoneManager] No teleport config provided');
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
            circle.rotation.x = -Math.PI / 2;

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
}
