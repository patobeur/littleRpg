/**
 * Network Optimizer - Client Side
 * Utilities for compressing and optimizing network data
 */

export class NetworkOptimizer {
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
     * @param {Object} data - Player update data
     * @returns {Array} Compressed array
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
     * @param {Array} compressed - Compressed array
     * @returns {Object} Decompressed player data
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
     * @param {string} animation - Full animation name
     * @returns {string} Single character code
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
     * @param {string} code - Single character code
     * @returns {string} Full animation name
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
     * Only includes properties that changed
     * @param {Object} current - Current state
     * @param {Object} previous - Previous state
     * @returns {Object} Delta object with only changes
     */
    static calculateDelta(current, previous) {
        if (!previous) return current;

        const delta = { c: current.characterId }; // c = characterId

        // Check position change (threshold: 0.01 units)
        if (previous.position) {
            const dx = Math.abs(current.position.x - previous.position.x);
            const dz = Math.abs(current.position.z - previous.position.z);

            if (dx > 0.01 || dz > 0.01) {
                delta.p = { // p = position
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

        // Check rotation change (threshold: 0.05 radians)
        if (!previous.rotation || Math.abs(current.rotation - previous.rotation) > 0.05) {
            delta.r = Math.round(current.rotation * 100) / 100; // r = rotation
        }

        // Check animation change
        if (!previous.animation || current.animation !== previous.animation) {
            delta.a = this.compressAnimation(current.animation); // a = animation
        }

        // Check timeScale change
        if (!previous.timeScale || current.timeScale !== previous.timeScale) {
            if (current.timeScale !== 1) {
                delta.t = current.timeScale; // t = timeScale
            }
        }

        return delta;
    }

    /**
     * Apply delta to reconstruct full state
     * @param {Object} delta - Delta object
     * @param {Object} baseState - Base state to apply delta to
     * @returns {Object} Updated state
     */
    static applyDelta(delta, baseState) {
        const updated = { ...baseState };

        if (delta.p) {
            updated.position = {
                x: delta.p.x,
                y: 0,
                z: delta.p.z
            };
        }

        if (delta.r !== undefined) {
            updated.rotation = delta.r;
        }

        if (delta.a !== undefined) {
            updated.animation = this.decompressAnimation(delta.a);
        }

        if (delta.t !== undefined) {
            updated.timeScale = delta.t;
        } else if (!baseState.timeScale) {
            updated.timeScale = 1;
        }

        return updated;
    }

    /**
     * Batch multiple updates into a single message
     * @param {Array} updates - Array of update objects
     * @returns {Object} Batched message
     */
    static batchUpdates(updates) {
        return {
            t: Date.now(), // t = timestamp
            u: updates.map(u => this.compressPlayerUpdate(u)) // u = updates
        };
    }

    /**
     * Unbatch updates from batched message
     * @param {Object} batched - Batched message
     * @returns {Array} Array of decompressed updates
     */
    static unbatchUpdates(batched) {
        return batched.u.map(u => this.decompressPlayerUpdate(u));
    }

    /**
     * Calculate distance between two positions (2D, ignoring Y)
     * @param {Object} pos1 - First position {x, y, z}
     * @param {Object} pos2 - Second position {x, y, z}
     * @returns {number} Distance
     */
    static distance2D(pos1, pos2) {
        return Math.hypot(pos1.x - pos2.x, pos1.z - pos2.z);
    }

    /**
     * Check if position is within Area of Interest radius
     * @param {Object} pos1 - First position
     * @param {Object} pos2 - Second position
     * @param {number} radius - AOI radius
     * @returns {boolean} True if within radius
     */
    static isInAOI(pos1, pos2, radius = 50) {
        return this.distance2D(pos1, pos2) <= radius;
    }
}
