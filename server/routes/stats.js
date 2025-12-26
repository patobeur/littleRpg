// Stats routes - Visit statistics
const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { requireRole } = require('../middleware/auth');

// SuperAdmin only - Get visit statistics
router.get('/visits', requireRole(['superAdmin']), async (req, res) => {
    try {
        const stats = await Visit.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching visit stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// SuperAdmin only - Get recent visitors
router.get('/recent-visitors', requireRole(['superAdmin']), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const visitors = await Visit.getRecentVisitors(limit);
        res.json(visitors);
    } catch (error) {
        console.error('Error fetching recent visitors:', error);
        res.status(500).json({ error: 'Failed to fetch recent visitors' });
    }
});

// SuperAdmin only - Get visitor logs
router.get('/visitor-logs/:visitorId', requireRole(['superAdmin']), async (req, res) => {
    try {
        const { visitorId } = req.params;
        const limit = parseInt(req.query.limit) || 100;
        const logs = await Visit.getVisitorLogs(visitorId, limit);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching visitor logs:', error);
        res.status(500).json({ error: 'Failed to fetch visitor logs' });
    }
});

// SuperAdmin only - Export all data
router.get('/export', requireRole(['superAdmin']), async (req, res) => {
    try {
        const database = require('../database/database');

        // Get all visits
        const visits = await database.all('SELECT * FROM visits ORDER BY first_visit DESC');

        // Get all logs
        const logs = await database.all('SELECT * FROM visit_logs ORDER BY timestamp DESC');

        // Get stats
        const stats = await Visit.getStats();

        const exportData = {
            exportDate: new Date().toISOString(),
            stats: stats,
            visits: visits,
            logs: logs
        };

        res.json(exportData);
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// SuperAdmin only - Reset all stats
router.post('/reset', requireRole(['superAdmin']), async (req, res) => {
    try {
        const database = require('../database/database');

        // Disable foreign keys temporarily
        await database.run('PRAGMA foreign_keys = OFF');

        // Delete all data
        await database.run('DELETE FROM visit_logs');
        await database.run('DELETE FROM visits');

        // Reset auto-increment
        try {
            await database.run('DELETE FROM sqlite_sequence WHERE name = "visit_logs"');
            await database.run('DELETE FROM sqlite_sequence WHERE name = "visits"');
        } catch (e) {
            // sqlite_sequence might not exist, that's ok
        }

        // Re-enable foreign keys
        await database.run('PRAGMA foreign_keys = ON');

        res.json({
            success: true,
            message: 'Stats reset successfully'
        });
    } catch (error) {
        console.error('Error resetting stats:', error);
        // Re-enable foreign keys even on error
        try {
            const database = require('../database/database');
            await database.run('PRAGMA foreign_keys = ON');
        } catch (e) { }
        res.status(500).json({ error: 'Failed to reset stats' });
    }
});

module.exports = router;
