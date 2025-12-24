/**
 * Scene configurations for LittleRPG
 * Contains spawn points, teleport zones, and metadata for all game scenes
 * This is the single source of truth - client receives this data from server
 */

const fs = require('fs');
const path = require('path');
const { SCENARIOS } = require('./scenarios');

const SCENES = {};

// Load scenes dynamically from data/maps
const mapsDir = path.join(__dirname, '../data/maps');

try {
    if (fs.existsSync(mapsDir)) {
        const files = fs.readdirSync(mapsDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const sceneId = file.replace('.json', '');
                try {
                    const data = fs.readFileSync(path.join(mapsDir, file), 'utf8');
                    const mapData = JSON.parse(data);

                    // Transform map data to scene config format if needed
                    // The generator now saves "structures", "spawns", "teleportZones", etc.
                    // We might need to wrap them or just use them directly.
                    // The map generator saves: 
                    // { name, isLastMap, structures: [], spawns: [], teleportZones: [], enemies: [], sceneSettings: {...} }

                    // The server expects SCENES[id] = { name: ..., scene: {...}, spawns: [], ... }
                    // We can map mapData directly or wrap it.

                    // Convert sceneSettings to scene format if available
                    let sceneConfig = {
                        background: 0x1a1a2e,
                        fog: { color: 0x1a1a2e, near: 10, far: 50 },
                        ground: { color: 0x242444, roughness: 0.8, metalness: 0.2 }
                    };

                    if (mapData.sceneSettings) {
                        const settings = mapData.sceneSettings;
                        // Convert hex color strings to numbers
                        if (settings.bgColor) {
                            sceneConfig.background = parseInt(settings.bgColor.replace('#', '0x'));
                        }
                        if (settings.fogColor || settings.fogNear !== undefined || settings.fogFar !== undefined) {
                            sceneConfig.fog = {
                                color: settings.fogColor ? parseInt(settings.fogColor.replace('#', '0x')) : 0x1a1a2e,
                                near: settings.fogNear !== undefined ? settings.fogNear : 10,
                                far: settings.fogFar !== undefined ? settings.fogFar : 50
                            };
                        }
                        // Keep ground default for now, or add to generator later
                    }

                    SCENES[sceneId] = {
                        name: mapData.name || sceneId,
                        isLastMap: !!mapData.isLastMap,
                        scene: sceneConfig,
                        spawns: mapData.spawns || [],
                        teleportZones: mapData.teleportZones || [],
                        enemies: (mapData.enemies || []).map((e, i) => ({
                            ...e,
                            id: e.id || `enemy_${sceneId}_${i}`
                        })),
                        structures: (mapData.structures || []).map((s, i) => ({
                            ...s,
                            id: s.id || `struct_${sceneId}_${i}`
                        })),
                        roads: mapData.roads || [],
                        trees: mapData.trees || []
                    };

                    console.log(`Loaded scene: ${sceneId}`);
                } catch (e) {
                    console.error(`Error loading map ${file}:`, e);
                }
            }
        });
    } else {
        console.warn('Maps directory not found:', mapsDir);
    }
} catch (err) {
    console.error('Failed to load maps:', err);
}

// Scene progression order
// Sort keys to ensure deterministic order, or rely on file naming (scene_01, scene_02...)
const SCENE_ORDER = Object.keys(SCENES).sort();


/**
 * Get scene configuration by ID
 * @param {string} sceneId - Scene identifier
 * @returns {object|null} Scene configuration or null if not found
 */
function getSceneConfig(sceneId) {
    return SCENES[sceneId] || SCENES['scene_01']; // Fallback to first scene
}

/**
 * Get spawn position for a class in a scene
 * @param {string} sceneId - Scene identifier
 * @param {string} className - Player class (Warrior, Mage, Healer)
 * @returns {object|null} Spawn position object or null if not found
 */
function getSpawnPosition(sceneId, className) {
    const scene = SCENES[sceneId];
    if (!scene || !scene.spawns) return null;

    // Try to find specific class spawn
    let spawn = scene.spawns.find(s => s.class === className);

    // Initial fallback: any spawn
    if (!spawn && scene.spawns.length > 0) {
        spawn = scene.spawns[0];
    }

    // Last resort fallback: default list logic (if no spawns defined in file)
    if (!spawn) {
        // ... (existing helper logic if you want to keep it, otherwise return null)
        return null;
    }

    return spawn;
}

/**
 * Get the next scene ID based on current scene and scenario
 */
function getNextScene(currentSceneId, scenarioId) {
    let order = SCENE_ORDER;

    if (scenarioId && SCENARIOS[scenarioId] && SCENARIOS[scenarioId].maps) {
        order = SCENARIOS[scenarioId].maps;
    }

    const currentIndex = order.indexOf(currentSceneId);
    if (currentIndex === -1 || currentIndex >= order.length - 1) {
        return null; // No next scene (end of game)
    }
    return order[currentIndex + 1];
}

/**
 * Get the first scene for a scenario
 */
function getFirstScene(scenarioId) {
    if (scenarioId && SCENARIOS[scenarioId] && SCENARIOS[scenarioId].maps && SCENARIOS[scenarioId].maps.length > 0) {
        return SCENARIOS[scenarioId].maps[0];
    }
    return 'scene_01'; // Backup default
}

/**
 * Check if player is within a teleport zone
 */
function isPlayerInZone(playerPos, sceneId, playerClass, tolerance = 1.0) {
    const scene = SCENES[sceneId];
    if (!scene || !scene.teleportZones) return false;

    // Find zone for this class
    const zone = scene.teleportZones.find(z => z.class === playerClass);
    if (!zone) return false;

    // Check distance (zone.x/z vs playerPos.x/z)
    // Map generator saves radius.
    const dist = Math.sqrt(
        Math.pow(playerPos.x - zone.x, 2) +
        Math.pow(playerPos.z - zone.z, 2)
    );

    const radius = zone.radius || 1.5;
    return dist <= (radius + tolerance);
}

module.exports = {
    SCENES,
    SCENE_ORDER,
    getSceneConfig,
    getSpawnPosition,
    getNextScene,
    getFirstScene,
    isPlayerInZone
};
