/**
 * Network Performance Monitor
 * Tracks and logs network statistics for optimization analysis
 */

class NetworkMonitor {
    constructor() {
        this.stats = {
            messagesSent: 0,
            messagesReceived: 0,
            bytesSent: 0,
            bytesReceived: 0,
            batchesReceived: 0,
            startTime: Date.now()
        };

        this.messageTypes = new Map(); // Track by message type
        this.lastReport = 0;
        this.reportInterval = 10000; // Report every 10 seconds

        console.log('[NetworkMonitor] Initialized');
    }

    /**
     * Track outgoing message
     */
    trackSent(eventName, data) {
        this.stats.messagesSent++;

        const size = this.estimateSize(data);
        this.stats.bytesSent += size;

        // Track by type
        if (!this.messageTypes.has(eventName)) {
            this.messageTypes.set(eventName, { sent: 0, received: 0, bytes: 0 });
        }
        const typeStats = this.messageTypes.get(eventName);
        typeStats.sent++;
        typeStats.bytes += size;
    }

    /**
     * Track incoming message
     */
    trackReceived(eventName, data) {
        this.stats.messagesReceived++;

        const size = this.estimateSize(data);
        this.stats.bytesReceived += size;

        // Track batches specifically
        if (eventName === 'batch_update') {
            this.stats.batchesReceived++;
        }

        // Track by type
        if (!this.messageTypes.has(eventName)) {
            this.messageTypes.set(eventName, { sent: 0, received: 0, bytes: 0 });
        }
        const typeStats = this.messageTypes.get(eventName);
        typeStats.received++;
        typeStats.bytes += size;
    }

    /**
     * Estimate message size in bytes
     */
    estimateSize(data) {
        try {
            return JSON.stringify(data).length;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Get current statistics
     */
    getStats() {
        const elapsed = (Date.now() - this.stats.startTime) / 1000; // seconds

        return {
            ...this.stats,
            elapsed: elapsed,
            messagesPerSec: (this.stats.messagesSent + this.stats.messagesReceived) / elapsed,
            sentPerSec: this.stats.messagesSent / elapsed,
            receivedPerSec: this.stats.messagesReceived / elapsed,
            bandwidthSent: (this.stats.bytesSent / elapsed / 1024).toFixed(2) + ' KB/s',
            bandwidthReceived: (this.stats.bytesReceived / elapsed / 1024).toFixed(2) + ' KB/s',
            avgMessageSize: Math.round((this.stats.bytesSent + this.stats.bytesReceived) /
                (this.stats.messagesSent + this.stats.messagesReceived)),
            batchRatio: this.stats.batchesReceived / Math.max(1, this.stats.messagesReceived)
        };
    }

    /**
     * Get detailed breakdown by message type
     */
    getDetailedStats() {
        const breakdown = [];
        this.messageTypes.forEach((stats, type) => {
            breakdown.push({
                type,
                sent: stats.sent,
                received: stats.received,
                totalBytes: stats.bytes,
                avgSize: Math.round(stats.bytes / Math.max(1, stats.sent + stats.received))
            });
        });

        // Sort by total bytes
        breakdown.sort((a, b) => b.totalBytes - a.totalBytes);

        return breakdown;
    }

    /**
     * Periodic reporting
     */
    update() {
        const now = Date.now();
        if (now - this.lastReport >= this.reportInterval) {
            this.report();
            this.lastReport = now;
        }
    }

    /**
     * Print report to console
     */
    report() {
        const stats = this.getStats();

        console.log('\n📊 Network Performance Report');
        console.log('═'.repeat(50));
        console.log(`Uptime: ${Math.round(stats.elapsed)}s`);
        console.log(`Messages Sent: ${stats.messagesSent} (${stats.sentPerSec.toFixed(1)}/s)`);
        console.log(`Messages Received: ${stats.messagesReceived} (${stats.receivedPerSec.toFixed(1)}/s)`);
        console.log(`Batches Received: ${stats.batchesReceived} (${(stats.batchRatio * 100).toFixed(1)}% of messages)`);
        console.log(`Bandwidth Sent: ${stats.bandwidthSent}`);
        console.log(`Bandwidth Received: ${stats.bandwidthReceived}`);
        console.log(`Avg Message Size: ${stats.avgMessageSize} bytes`);

        // Top message types
        const breakdown = this.getDetailedStats();
        if (breakdown.length > 0) {
            console.log('\nTop Message Types:');
            breakdown.slice(0, 5).forEach(item => {
                console.log(`  ${item.type}: ${item.sent + item.received} msgs, ${(item.totalBytes / 1024).toFixed(2)} KB`);
            });
        }
        console.log('═'.repeat(50) + '\n');
    }

    /**
     * Reset statistics
     */
    reset() {
        this.stats = {
            messagesSent: 0,
            messagesReceived: 0,
            bytesSent: 0,
            bytesReceived: 0,
            batchesReceived: 0,
            startTime: Date.now()
        };
        this.messageTypes.clear();
        this.lastReport = 0;
        console.log('[NetworkMonitor] Statistics reset');
    }
}

// Export for use in NetworkManager
export { NetworkMonitor };
