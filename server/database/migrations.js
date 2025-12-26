// Database migrations - CONSOLIDATED VERSION
const database = require("./database");

const migrations = [
	{
		version: 1,
		name: "Initial schema - Complete",
		up: async () => {
			// Create users table with ALL columns (email + role included)
			await database.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    avatar_url TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

			// Create characters table with ALL columns (class, stats, position, scene)
			await database.run(`
                CREATE TABLE IF NOT EXISTS characters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    slot_index INTEGER NOT NULL,
                    class TEXT DEFAULT 'Warrior',
                    level INTEGER DEFAULT 1,
                    experience INTEGER DEFAULT 0,
                    strength INTEGER DEFAULT 10,
                    intelligence INTEGER DEFAULT 10,
                    dexterity INTEGER DEFAULT 10,
                    max_hp INTEGER DEFAULT 100,
                    current_hp INTEGER DEFAULT 100,
                    max_mana INTEGER DEFAULT 50,
                    current_mana INTEGER DEFAULT 50,
                    pos_x REAL DEFAULT 0,
                    pos_y REAL DEFAULT 0,
                    pos_z REAL DEFAULT 0,
                    rotation_y REAL DEFAULT 0,
                    current_scene_id TEXT DEFAULT 'scene_01',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(user_id, slot_index)
                )
            `);

			// Create migration tracking table
			await database.run(`
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    version INTEGER UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

			console.log("✅ Migration 1: Complete initial schema created");
			console.log(
				"  ✓ Users table (username, email, role, password_hash, avatar_url)"
			);
			console.log(
				"  ✓ Characters table (all stats, position, scene tracking)"
			);
			console.log("  ✓ Migrations tracking table");
		},
	},
	{
		version: 2,
		name: "Add visits tracking",
		up: async () => {
			// Create visits table for unique visitors
			await database.run(`
                CREATE TABLE IF NOT EXISTS visits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visitor_id TEXT UNIQUE NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    first_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
                    visit_count INTEGER DEFAULT 1
                )
            `);

			// Create visit_logs table for detailed logging
			await database.run(`
                CREATE TABLE IF NOT EXISTS visit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visitor_id TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    page TEXT,
                    referrer TEXT,
                    FOREIGN KEY (visitor_id) REFERENCES visits(visitor_id)
                )
            `);

			// Create indexes for better performance
			await database.run(`
                CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id)
            `);

			await database.run(`
                CREATE INDEX IF NOT EXISTS idx_visit_logs_visitor_id ON visit_logs(visitor_id)
            `);

			await database.run(`
                CREATE INDEX IF NOT EXISTS idx_visit_logs_timestamp ON visit_logs(timestamp)
            `);

			console.log("✅ Migration 2: Visits tracking tables created");
			console.log("  ✓ visits table (unique visitors)");
			console.log("  ✓ visit_logs table (detailed logs)");
			console.log("  ✓ Performance indexes");
		},
	},
];

// Seed default admin account
async function seedDefaultAdmin() {
	try {
		const bcrypt = require("bcrypt");
		const SALT_ROUNDS = 10;

		// Check if admin already exists
		const adminExists = await database.get(
			"SELECT id FROM users WHERE email = ?",
			["patobeuradmin@patobeur.pat"]
		);

		if (!adminExists) {
			console.log("Creating default superAdmin account...");

			// Hash the password
			const passwordHash = await bcrypt.hash("patobeur", SALT_ROUNDS);

			// Create the admin account
			await database.run(
				"INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
				[
					"Patobeur",
					"patobeuradmin@patobeur.pat",
					passwordHash,
					"superAdmin",
				]
			);

			console.log("✅ Default superAdmin account created successfully!");
			console.log("   Username: Patobeur");
			console.log("   Email: patobeuradmin@patobeur.pat");
			console.log("   Password: patobeur");
			console.log("   Role: superAdmin");
		} else {
			console.log("ℹ️  Default superAdmin account already exists");
		}
	} catch (error) {
		console.error("Error creating default admin account:", error);
		// Don't throw - this shouldn't prevent server startup
	}
}

async function runMigrations() {
	try {
		// Check if migrations table exists
		const tableExists = await database.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='migrations'
        `);

		if (!tableExists) {
			// First time setup - run initial migration to create migrations table
			await migrations[0].up();
			await database.run(
				"INSERT INTO migrations (version, name) VALUES (?, ?)",
				[migrations[0].version, migrations[0].name]
			);
		}

		// Get applied migrations
		const appliedMigrations = await database.all(
			"SELECT version FROM migrations ORDER BY version ASC"
		);
		const appliedVersions = new Set(appliedMigrations.map((m) => m.version));

		// Run pending migrations
		for (const migration of migrations) {
			if (!appliedVersions.has(migration.version)) {
				console.log(
					`Running migration ${migration.version}: ${migration.name}`
				);
				await migration.up();
				await database.run(
					"INSERT INTO migrations (version, name) VALUES (?, ?)",
					[migration.version, migration.name]
				);
				console.log(`Migration ${migration.version} completed`);
			}
		}

		console.log("All migrations completed");
	} catch (error) {
		console.error("Migration error:", error);
		throw error;
	}
}

module.exports = { runMigrations, seedDefaultAdmin };
