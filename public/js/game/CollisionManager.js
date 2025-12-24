/**
 * CollisionManager.js
 * Client-side collision detection
 */
import * as THREE from 'three';

export class CollisionManager {
    constructor(game) {
        this.game = game;
        this.mapBounds = 50; // Simple square map limit (default)
    }

    /**
     * Update map bounds dynamically based on scene config
     * @param {number} size - New map bounds
     */
    setMapBounds(size) {
        this.mapBounds = size || 50;
        console.log(`Map bounds updated to: ${this.mapBounds}`);
    }

    /**
     * Check if a proposed position is valid
     * @param {THREE.Vector3} position - The proposed position
     * @param {number} radius - The entity's radius
     * @returns {boolean} true if valid, false if collision
     */
    isValidPosition(position, radius = 0.5) {
        // 1. Check Map Bounds
        if (Math.abs(position.x) > this.mapBounds || Math.abs(position.z) > this.mapBounds) {
            return false;
        }

        // 2. Check Static Obstacles (To be implemented with specialized colliders)

        // 3. Check Dynamic Entities (Other players, Enemies)
        if (this.checkEntityCollisions(position, radius)) {
            return false;
        }

        return true;
    }

    /**
     * Check collision with other entities
     * @param {THREE.Vector3} position 
     * @param {number} radius 
     * @returns {boolean} true if collision detected
     */
    checkEntityCollisions(position, radius) {
        // Check against other Players
        for (const [id, data] of this.game.entityManager.playerData) {
            if (id === this.game.localCharacterId) continue;
            if (!data.model) continue;

            const targetRadius = data.radius || 0.3; // Use stored radius or fallback
            if (this.checkCircleCollision(position, radius, data.model.position, targetRadius)) {
                return true;
            }
        }

        // Check against Enemies
        for (const [id, enemy] of this.game.entityManager.enemies) {
            if (!enemy.model) continue;

            const enemyRadius = enemy.radius || 0.4; // Use stored radius or fallback
            if (this.checkCircleCollision(position, radius, enemy.model.position, enemyRadius)) {
                return true;
            }
        }

        // Check against Structures
        for (const [id, struct] of this.game.entityManager.structures) {
            if (!struct.model) continue;

            // Structures might need a larger radius or box check. For now, circle.
            const structRadius = struct.radius || 3.0;
            if (this.checkCircleCollision(position, radius, struct.model.position, structRadius)) {
                return true;
            }
        }

        return false;
    }

    checkCircleCollision(pos1, r1, pos2, r2) {
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        const distSq = dx * dx + dz * dz;
        const radii = r1 + r2;
        return distSq < (radii * radii);
    }
}
