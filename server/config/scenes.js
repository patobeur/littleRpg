/**
 * Scene configurations for LittleRPG
 * Contains spawn points, teleport zones, and metadata for all game scenes
 * This is the single source of truth - client receives this data from server
 */

const SCENES = {
    scene_01: {
        name: 'Training Grounds',
        scene: {
            background: 0x1a1a2e,
            fog: { color: 0x1a1a2e, near: 10, far: 50 },
            ground: {
                color: 0x242444,
                roughness: 0.8,
                metalness: 0.2
            }
        },
        spawns: [
            { x: 0, y: 0, z: 5, class: 'Warrior' },   // Top of triangle
            { x: -4, y: 0, z: -2, class: 'Mage' },    // Left bottom
            { x: 4, y: 0, z: -2, class: 'Healer' }    // Right bottom
        ],
        teleportZones: [
            { x: 0, y: 0.1, z: 8, radius: 1.5, class: 'Warrior', color: 0xff4444 },
            { x: -6, y: 0.1, z: -5, radius: 1.5, class: 'Mage', color: 0x4444ff },
            { x: 6, y: 0.1, z: -5, radius: 1.5, class: 'Healer', color: 0x44ff44 }
        ],
        enemies: [
            { type: 'Alistar', x: 0, y: 0, z: -10, id: 'alistar_01' }
        ],
        structures: [
            { type: 'house', x: 10, y: 0, z: 20, id: 'house_01', rotation: { x: 0, y: 45, z: 0 } },
            { type: 'house', x: 15, y: 0, z: 20, id: 'house_02', rotation: { x: 0, y: 90, z: 0 } }
        ]
    },
    scene_02: {
        name: 'Dark Forest',
        scene: {
            background: 0x050510,
            fog: { color: 0x050510, near: 5, far: 30 },
            ground: {
                color: 0x0a0a1a,
                roughness: 0.9,
                metalness: 0.1
            }
        },
        spawns: [
            { x: -3, y: 0, z: 0, class: 'Warrior' },
            { x: 0, y: 0, z: 0, class: 'Mage' },
            { x: 3, y: 0, z: 0, class: 'Healer' }
        ],
        teleportZones: [
            { x: -3, y: 0.1, z: 10, radius: 1.5, class: 'Warrior', color: 0xff4444 },
            { x: 0, y: 0.1, z: 10, radius: 1.5, class: 'Mage', color: 0x4444ff },
            { x: 3, y: 0.1, z: 10, radius: 1.5, class: 'Healer', color: 0x44ff44 }
        ]
    },
    scene_03: {
        name: 'Dragon Lair',
        scene: {
            background: 0x2e0505,
            fog: { color: 0x2e0505, near: 8, far: 40 },
            ground: {
                color: 0x331111,
                roughness: 0.6,
                metalness: 0.4
            }
        },
        spawns: [
            { x: 0, y: 0, z: -5, class: 'Warrior' },
            { x: -4, y: 0, z: 2, class: 'Mage' },
            { x: 4, y: 0, z: 2, class: 'Healer' }
        ],
        teleportZones: [
            { x: 0, y: 0.1, z: 10, radius: 2, class: 'Warrior', color: 0xff4444 },
            { x: -7, y: 0.1, z: 10, radius: 2, class: 'Mage', color: 0x4444ff },
            { x: 7, y: 0.1, z: 10, radius: 2, class: 'Healer', color: 0x44ff44 }
        ]
    }
};

// Scene progression order
const SCENE_ORDER = ['scene_01', 'scene_02', 'scene_03'];

/**
 * Get scene configuration by ID
 * @param {string} sceneId - Scene identifier
 * @returns {object|null} Scene configuration or null if not found
 */
function getSceneConfig(sceneId) {
    return SCENES[sceneId] || null;
}

/**
 * Get spawn position for a specific class in a scene
 * @param {string} sceneId - Scene identifier
 * @param {string} playerClass - Player class (Warrior, Mage, Healer)
 * @returns {object|null} Spawn position {x, y, z} or null
 */
function getSpawnPosition(sceneId, playerClass) {
    const scene = SCENES[sceneId];
    if (!scene) return null;

    const spawn = scene.spawns.find(s => s.class === playerClass);
    return spawn || scene.spawns[0]; // Fallback to first spawn
}

/**
 * Get teleport zone for a specific class in a scene
 * @param {string} sceneId - Scene identifier
 * @param {string} playerClass - Player class
 * @returns {object|null} Teleport zone config or null
 */
function getTeleportZone(sceneId, playerClass) {
    const scene = SCENES[sceneId];
    if (!scene) return null;

    return scene.teleportZones.find(z => z.class === playerClass) || null;
}

/**
 * Get next scene ID in progression
 * @param {string} currentSceneId - Current scene identifier
 * @returns {string|null} Next scene ID or null if at the end
 */
function getNextScene(currentSceneId) {
    const currentIndex = SCENE_ORDER.indexOf(currentSceneId);

    if (currentIndex === -1 || currentIndex === SCENE_ORDER.length - 1) {
        return null; // Invalid scene or end of game
    }

    return SCENE_ORDER[currentIndex + 1];
}

/**
 * Check if a position is within a teleport zone
 * @param {object} position - Player position {x, y, z}
 * @param {string} sceneId - Scene identifier
 * @param {string} playerClass - Player class
 * @param {number} tolerance - Extra radius tolerance for latency (default: 0.5)
 * @returns {boolean} True if player is in their assigned zone
 */
function isPlayerInZone(position, sceneId, playerClass, tolerance = 0.5) {
    const zone = getTeleportZone(sceneId, playerClass);
    if (!zone) return false;

    // Calculate 2D distance (ignore Y axis)
    const dx = position.x - zone.x;
    const dz = position.z - zone.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Add tolerance for network latency and position updates
    return distance < (zone.radius + tolerance);
}

module.exports = {
    SCENES,
    SCENE_ORDER,
    getSceneConfig,
    getSpawnPosition,
    getTeleportZone,
    getNextScene,
    isPlayerInZone
};
