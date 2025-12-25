/**
 * Message Batcher - Server Side
 * Groups multiple Socket.IO messages into batches to reduce overhead
 */

class MessageBatcher {
    constructor(io) {
        this.io = io;
        this.batches = new Map(); // code -> { players: [], enemies: [], timestamp }
        this.batchInterval = 50; // 50ms = 20 batches per second

        // Start batch flushing interval
        this.flushTimer = setInterval(() => this.flush(), this.batchInterval);

        console.log(`[MessageBatcher] Started with ${this.batchInterval}ms interval`);
    }

    /**
     * Add a player update to the batch
     */
    addPlayerUpdate(lobbyCode, playerUpdate) {
        if (!this.batches.has(lobbyCode)) {
            this.batches.set(lobbyCode, {
                players: [],
                enemies: [],
                entities: [],
                timestamp: Date.now()
            });
        }

        this.batches.get(lobbyCode).players.push(playerUpdate);
    }

    /**
     * Add an enemy update to the batch
     */
    addEnemyUpdate(lobbyCode, enemyUpdate) {
        if (!this.batches.has(lobbyCode)) {
            this.batches.set(lobbyCode, {
                players: [],
                enemies: [],
                entities: [],
                timestamp: Date.now()
            });
        }

        this.batches.get(lobbyCode).enemies.push(enemyUpdate);
    }

    /**
     * Add an entity update to the batch (e.g., health changes)
     */
    addEntityUpdate(lobbyCode, entityUpdate) {
        if (!this.batches.has(lobbyCode)) {
            this.batches.set(lobbyCode, {
                players: [],
                enemies: [],
                entities: [],
                timestamp: Date.now()
            });
        }

        this.batches.get(lobbyCode).entities.push(entityUpdate);
    }

    /**
     * Flush all batches - send accumulated updates
     */
    flush() {
        const now = Date.now();

        this.batches.forEach((batch, lobbyCode) => {
            // Only send if there's data
            if (batch.players.length > 0 || batch.enemies.length > 0 || batch.entities.length > 0) {
                const payload = {
                    t: now, // timestamp
                    p: batch.players.length > 0 ? batch.players : undefined,
                    e: batch.enemies.length > 0 ? batch.enemies : undefined,
                    u: batch.entities.length > 0 ? batch.entities : undefined
                };

                // Remove undefined fields to save bandwidth
                Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

                this.io.to(lobbyCode).emit('batch_update', payload);

                // Debug log (comment out in production)
                // console.log(`[MessageBatcher] Flushed ${batch.players.length} players, ${batch.enemies.length} enemies, ${batch.entities.length} entities to ${lobbyCode}`);
            }
        });

        // Clear all batches
        this.batches.clear();
    }

    /**
     * Force flush for a specific lobby (useful for important updates)
     */
    flushLobby(lobbyCode) {
        const batch = this.batches.get(lobbyCode);
        if (!batch) return;

        if (batch.players.length > 0 || batch.enemies.length > 0 || batch.entities.length > 0) {
            const payload = {
                t: Date.now(),
                p: batch.players.length > 0 ? batch.players : undefined,
                e: batch.enemies.length > 0 ? batch.enemies : undefined,
                u: batch.entities.length > 0 ? batch.entities : undefined
            };

            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            this.io.to(lobbyCode).emit('batch_update', payload);
            this.batches.set(lobbyCode, { players: [], enemies: [], entities: [], timestamp: Date.now() });
        }
    }

    /**
     * Cleanup on shutdown
     */
    destroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        // Final flush
        this.flush();

        console.log('[MessageBatcher] Destroyed');
    }
}

module.exports = MessageBatcher;
