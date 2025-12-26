// Stats routes - Visit statistics
const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { requireRole } = require('../middleware/auth');

// Public endpoint - Get basic visit statistics
router.get('/visits', async (req, res) => {
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

module.exports = router;
