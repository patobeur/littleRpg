/**
 * DEPRECATED: Scene configuration is now managed server-side
 * 
 * This file is kept for reference only.
 * All scene configurations (spawns, teleport zones, metadata) are now
 * stored in server/config/scenes.js and sent to clients via Socket.io.
 * 
 * The server validates all player positions to prevent cheating.
 * 
 * See: server/config/scenes.js for the authoritative scene data
 */

// This export is kept to prevent import errors, but it's empty
export const SCENE_CONFIG = {};

export function getSpawnPosition(sceneId, playerClass) {
    console.warn('[DEPRECATED] getSpawnPosition - Scene config now comes from server');
    return { x: 0, y: 0, z: 0 };
}

export function getTeleportZone(sceneId, playerClass) {
    console.warn('[DEPRECATED] getTeleportZone - Scene config now comes from server');
    return null;
}

export function getNextScene(currentSceneId) {
    console.warn('[DEPRECATED] getNextScene - Scene progression managed server-side');
    return null;
}
