/**
 * Message Batcher - Client Side
 * Handles receiving and processing batched updates from server
 */

export class MessageBatcher {
    constructor(networkManager) {
        this.networkManager = networkManager;
        this.lastBatchTime = 0;
    }

    /**
     * Process a batch update from the server
     * @param {Object} batch - Batched update with format: { t: timestamp, p: players[], e: enemies[], u: entities[] }
     */
    processBatch(batch) {
        const now = performance.now();
        const latency = now - batch.t;

        // Process player updates
        if (batch.p && Array.isArray(batch.p)) {
            batch.p.forEach(playerUpdate => {
                this.networkManager.handlePlayerUpdated(playerUpdate);
            });
        }

        // Process enemy updates
        if (batch.e && Array.isArray(batch.e)) {
            batch.e.forEach(enemyUpdate => {
                // Handle enemy movement/animation updates
                this.networkManager.game.entityManager.updateEnemyState(enemyUpdate);
            });
        }

        // Process entity updates (health, stats, etc.)
        if (batch.u && Array.isArray(batch.u)) {
            batch.u.forEach(entityUpdate => {
                this.networkManager.handleEntityUpdate(entityUpdate);
            });
        }

        // Track batch timing for debugging
        this.lastBatchTime = now;

        // Debug log (uncomment for debugging)
        // const playerCount = batch.p ? batch.p.length : 0;
        // const enemyCount = batch.e ? batch.e.length : 0;
        // const entityCount = batch.u ? batch.u.length : 0;
        // console.log(`[Batch] Processed ${playerCount} players, ${enemyCount} enemies, ${entityCount} entities. Latency: ${latency.toFixed(0)}ms`);
    }

    /**
     * Get statistics about batching performance
     */
    getStats() {
        return {
            lastBatchTime: this.lastBatchTime,
            timeSinceLastBatch: performance.now() - this.lastBatchTime
        };
    }
}
