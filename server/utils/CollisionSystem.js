/**
 * CollisionSystem.js
 * Server-side collision validation
 */

const { getSceneConfig } = require('../config/scenes');

class CollisionSystem {
    constructor() {
        this.obstacles = new Map(); // sceneId -> [] of obstacles
    }

    /**
     * Check if a position is valid for a scene
     * @param {object} position {x, y, z}
     * @param {string} sceneId
     * @param {number} radius (player radius, default 0.5)
     * @returns {boolean} true if valid, false if collision
     */
    isValidPosition(position, sceneId, radius = 0.5) {
        // 1. Check Scene Boundaries
        if (!this.checkBoundaries(position, sceneId)) {
            return false;
        }

        return true;
    }

    checkBoundaries(position, sceneId) {
        // Dynamic bounds based on scene config
        const sceneConfig = getSceneConfig(sceneId);
        // Default to 50 if mapSize is missing
        const mapSize = sceneConfig && sceneConfig.mapSize ? sceneConfig.mapSize : 50;

        // Strict limit: Map Size - 1 (as requested)
        const limit = mapSize - 1;

        if (Math.abs(position.x) > limit || Math.abs(position.z) > limit) {
            // console.log(`[Collision] Position ${position.x},${position.z} out of bounds (limit: ${limit})`);
            return false;
        }
        return true;
    }

    /**
     * Check distance between two entities
     */
    checkEntityCollision(pos1, radius1, pos2, radius2) {
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance < (radius1 + radius2);
    }
}

module.exports = new CollisionSystem();
