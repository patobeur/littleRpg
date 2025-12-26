// Visit model - Track unique visitors and detailed logs
const database = require('../database/database');
const crypto = require('crypto');

class Visit {
    // Record a visit
    static async recordVisit(visitorId, ipAddress, userAgent, page, referrer) {
        try {
            // Check if visitor exists
            const visitor = await database.get(
                'SELECT id, visit_count FROM visits WHERE visitor_id = ?',
                [visitorId]
            );

            if (visitor) {
                // Update existing visitor
                await database.run(
                    'UPDATE visits SET last_visit = CURRENT_TIMESTAMP, visit_count = visit_count + 1, ip_address = ?, user_agent = ? WHERE visitor_id = ?',
                    [ipAddress, userAgent, visitorId]
                );
            } else {
                // Insert new visitor
                await database.run(
                    'INSERT INTO visits (visitor_id, ip_address, user_agent) VALUES (?, ?, ?)',
                    [visitorId, ipAddress, userAgent]
                );
            }

            // Log the visit
            await database.run(
                'INSERT INTO visit_logs (visitor_id, page, referrer) VALUES (?, ?, ?)',
                [visitorId, page, referrer]
            );

            return true;
        } catch (error) {
            console.error('Error recording visit:', error);
            return false;
        }
    }

    // Get total unique visitors
    static async getUniqueVisitors() {
        try {
            const result = await database.get('SELECT COUNT(*) as count FROM visits');
            return result.count || 0;
        } catch (error) {
            console.error('Error getting unique visitors:', error);
            return 0;
        }
    }

    // Get visitors today
    static async getTodayVisitors() {
        try {
            const result = await database.get(
                `SELECT COUNT(*) as count FROM visits 
                WHERE DATE(first_visit) = DATE('now') 
                OR DATE(last_visit) = DATE('now')`
            );
            return result.count || 0;
        } catch (error) {
            console.error('Error getting today visitors:', error);
            return 0;
        }
    }

    // Get visitors this week
    static async getWeekVisitors() {
        try {
            const result = await database.get(
                `SELECT COUNT(*) as count FROM visits 
                WHERE DATE(last_visit) >= DATE('now', '-7 days')`
            );
            return result.count || 0;
        } catch (error) {
            console.error('Error getting week visitors:', error);
            return 0;
        }
    }

    // Get visitors this month
    static async getMonthVisitors() {
        try {
            const result = await database.get(
                `SELECT COUNT(*) as count FROM visits 
                WHERE DATE(last_visit) >= DATE('now', 'start of month')`
            );
            return result.count || 0;
        } catch (error) {
            console.error('Error getting month visitors:', error);
            return 0;
        }
    }

    // Get complete stats
    static async getStats() {
        try {
            const totalUnique = await this.getUniqueVisitors();
            const today = await this.getTodayVisitors();
            const thisWeek = await this.getWeekVisitors();
            const thisMonth = await this.getMonthVisitors();

            // Get total page views
            const pageViews = await database.get('SELECT COUNT(*) as count FROM visit_logs');

            return {
                totalUnique,
                today,
                thisWeek,
                thisMonth,
                totalPageViews: pageViews.count || 0
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                totalUnique: 0,
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
                totalPageViews: 0
            };
        }
    }

    // Generate visitor ID from IP and user agent
    static generateVisitorId(ip, userAgent) {
        const hash = crypto.createHash('sha256');
        hash.update(`${ip}-${userAgent}`);
        return hash.digest('hex');
    }

    // Get recent visitors (for admin)
    static async getRecentVisitors(limit = 50) {
        try {
            const visitors = await database.all(
                `SELECT visitor_id, ip_address, user_agent, first_visit, last_visit, visit_count 
                FROM visits 
                ORDER BY last_visit DESC 
                LIMIT ?`,
                [limit]
            );
            return visitors;
        } catch (error) {
            console.error('Error getting recent visitors:', error);
            return [];
        }
    }

    // Get visit logs for a specific visitor
    static async getVisitorLogs(visitorId, limit = 100) {
        try {
            const logs = await database.all(
                `SELECT timestamp, page, referrer 
                FROM visit_logs 
                WHERE visitor_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?`,
                [visitorId, limit]
            );
            return logs;
        } catch (error) {
            console.error('Error getting visitor logs:', error);
            return [];
        }
    }
}

module.exports = Visit;
