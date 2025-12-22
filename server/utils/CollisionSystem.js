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
        // 1. Check Scene Boundaries (Simple box for now, can be expanded)
        if (!this.checkBoundaries(position)) {
            return false;
        }

        // 2. Check Static Obstacles (Walls, etc.)
        // For now, we assume everything is walkable except explicit exclusion zones if we had them.
        // We will implement a simple "Map Bounds" check.

        // TODO: Load scene-specific obstacles (rocks, buildings) from config

        return true;
    }

    checkBoundaries(position) {
        // Simple global bounds to prevent falling off the world
        const MAX_RANGE = 50;
        if (Math.abs(position.x) > MAX_RANGE || Math.abs(position.z) > MAX_RANGE) {
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
