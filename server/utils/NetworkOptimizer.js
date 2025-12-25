/**
 * Network Optimizer - Server Side
 * Utilities for compressing and optimizing network data
 */

class NetworkOptimizer {
    /**
     * Round position to reduce precision (2 decimals = ~4cm accuracy)
     */
    static roundPosition(pos, precision = 2) {
        const factor = Math.pow(10, precision);
        return {
            x: Math.round(pos.x * factor) / factor,
            y: Math.round(pos.y * factor) / factor,
            z: Math.round(pos.z * factor) / factor
        };
    }

    /**
     * Round rotation value
     */
    static roundRotation(rotation, precision = 2) {
        const factor = Math.pow(10, precision);
        return Math.round(rotation * factor) / factor;
    }

    /**
     * Compress player update to compact array format
     * Reduces message size by ~59%
     * 
     * Format: [characterId, x, z, rotation, animCode, timeScale]
     */
    static compressPlayerUpdate(data) {
        return [
            data.characterId,
            Math.round(data.position.x * 100) / 100,
            Math.round(data.position.z * 100) / 100,
            Math.round(data.rotation * 100) / 100,
            this.compressAnimation(data.animation),
            data.timeScale === 1 ? null : data.timeScale
        ];
    }

    /**
     * Decompress player update from array to object
     */
    static decompressPlayerUpdate(compressed) {
        return {
            characterId: compressed[0],
            position: {
                x: compressed[1],
                y: 0,
                z: compressed[2]
            },
            rotation: compressed[3],
            animation: this.decompressAnimation(compressed[4]),
            timeScale: compressed[5] === null ? 1 : compressed[5]
        };
    }

    /**
     * Compress animation name to single character
     */
    static compressAnimation(animation) {
        const map = {
            'idle': 'i',
            'walk': 'w',
            'run': 'r',
            'attack': 'a',
            'jump': 'j',
            'death': 'd',
            'hit': 'h'
        };
        return map[animation] || animation[0];
    }

    /**
     * Decompress animation code to full name
     */
    static decompressAnimation(code) {
        const map = {
            'i': 'idle',
            'w': 'walk',
            'r': 'run',
            'a': 'attack',
            'j': 'jump',
            'd': 'death',
            'h': 'hit'
        };
        return map[code] || code;
    }

    /**
     * Calculate delta (changes only) between two states
     */
    static calculateDelta(current, previous) {
        if (!previous) return current;

        const delta = { c: current.characterId };

        // Check position change
        if (previous.position) {
            const dx = Math.abs(current.position.x - previous.position.x);
            const dz = Math.abs(current.position.z - previous.position.z);

            if (dx > 0.01 || dz > 0.01) {
                delta.p = {
                    x: Math.round(current.position.x * 100) / 100,
                    z: Math.round(current.position.z * 100) / 100
                };
            }
        } else {
            delta.p = {
                x: Math.round(current.position.x * 100) / 100,
                z: Math.round(current.position.z * 100) / 100
            };
        }

        // Check rotation change
        if (!previous.rotation || Math.abs(current.rotation - previous.rotation) > 0.05) {
            delta.r = Math.round(current.rotation * 100) / 100;
        }

        // Check animation change
        if (!previous.animation || current.animation !== previous.animation) {
            delta.a = this.compressAnimation(current.animation);
        }

        // Check timeScale change
        if (!previous.timeScale || current.timeScale !== previous.timeScale) {
            if (current.timeScale !== 1) {
                delta.t = current.timeScale;
            }
        }

        return delta;
    }

    /**
     * Calculate distance between two positions (2D)
     */
    static distance2D(pos1, pos2) {
        return Math.hypot(pos1.x - pos2.x, pos1.z - pos2.z);
    }

    /**
     * Check if position is within Area of Interest radius
     */
    static isInAOI(pos1, pos2, radius = 50) {
        return this.distance2D(pos1, pos2) <= radius;
    }

    /**
     * Filter players by Area of Interest
     * Returns only players within radius of the reference position
     */
    static filterByAOI(referencePos, playerStates, radius = 50, excludeCharacterId = null) {
        const result = [];

        playerStates.forEach((state, characterId) => {
            if (characterId === excludeCharacterId) return;

            if (state.position && this.isInAOI(referencePos, state.position, radius)) {
                result.push({ characterId, ...state });
            }
        });

        return result;
    }

    /**
     * Batch multiple updates into a single message
     */
    static batchUpdates(updates) {
        return {
            t: Date.now(),
            u: updates
        };
    }
}

module.exports = NetworkOptimizer;
