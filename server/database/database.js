// Database connection and initialization
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');

class Database {
    constructor() {
        this.db = null;
    }

    // Initialize database connection
    async connect() {
        return new Promise((resolve, reject) => {
            // Ensure data directory exists
            const dataDir = path.dirname(config.database.path);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Create database connection
            this.db = new sqlite3.Database(config.database.path, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    // Enable foreign keys
                    this.db.run('PRAGMA foreign_keys = ON', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }
            });
        });
    }

    // Run a query (INSERT, UPDATE, DELETE)
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    console.error('Database run error:', err);
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Get a single row
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database get error:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Get all rows
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database all error:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;
