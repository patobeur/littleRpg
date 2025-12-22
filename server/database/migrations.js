// Database migrations
const database = require('./database');

const migrations = [
    {
        version: 1,
        name: 'Initial schema',
        up: async () => {
            // Create users table
            await database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          avatar_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Create characters table
            await database.run(`
        CREATE TABLE IF NOT EXISTS characters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          slot_index INTEGER NOT NULL,
          level INTEGER DEFAULT 1,
          experience INTEGER DEFAULT 0,
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

            console.log('Migration 1: Initial schema created');
        },
    },
    {
        version: 2,
        name: 'Add email to users',
        up: async () => {
            // SQLite doesn't support adding UNIQUE NOT NULL columns directly
            // We need to recreate the table

            // Create new table with email column
            await database.run(`
                CREATE TABLE users_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    avatar_url TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Copy existing data (if any) - set email to empty string for now
            await database.run(`
                INSERT INTO users_new (id, username, password_hash, avatar_url, created_at, updated_at, email)
                SELECT id, username, password_hash, avatar_url, created_at, updated_at, 
                       username || '@temp.local' as email
                FROM users
            `);

            // Drop old table
            await database.run(`DROP TABLE users`);

            // Rename new table
            await database.run(`ALTER TABLE users_new RENAME TO users`);

            console.log('Migration 2: Added email column to users table');
        },
    },
    {
        version: 3,
        name: 'Update characters with class and stats',
        up: async () => {
            await database.run(`ALTER TABLE characters ADD COLUMN class TEXT DEFAULT 'Warrior'`);
            await database.run(`ALTER TABLE characters ADD COLUMN strength INTEGER DEFAULT 10`);
            await database.run(`ALTER TABLE characters ADD COLUMN intelligence INTEGER DEFAULT 10`);
            await database.run(`ALTER TABLE characters ADD COLUMN dexterity INTEGER DEFAULT 10`);
            await database.run(`ALTER TABLE characters ADD COLUMN max_hp INTEGER DEFAULT 100`);
            await database.run(`ALTER TABLE characters ADD COLUMN current_hp INTEGER DEFAULT 100`);
            await database.run(`ALTER TABLE characters ADD COLUMN max_mana INTEGER DEFAULT 50`);
            await database.run(`ALTER TABLE characters ADD COLUMN current_mana INTEGER DEFAULT 50`);
            console.log('Migration 3: Updated characters table with class and stats');
        },
    },
    {
        version: 4,
        name: 'Add position to characters',
        up: async () => {
            await database.run(`ALTER TABLE characters ADD COLUMN pos_x REAL DEFAULT 0`);
            await database.run(`ALTER TABLE characters ADD COLUMN pos_y REAL DEFAULT 0`);
            await database.run(`ALTER TABLE characters ADD COLUMN pos_z REAL DEFAULT 0`);
            await database.run(`ALTER TABLE characters ADD COLUMN rotation_y REAL DEFAULT 0`);
            console.log('Migration 4: Added position columns to characters table');
        },
    },
    {
        version: 5,
        name: 'Add scene tracking',
        up: async () => {
            await database.run(`ALTER TABLE characters ADD COLUMN current_scene_id TEXT DEFAULT 'scene_01'`);
            console.log('Migration 5: Added current_scene_id to characters table');
        },
    },
];

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
                'INSERT INTO migrations (version, name) VALUES (?, ?)',
                [migrations[0].version, migrations[0].name]
            );
        }

        // Get applied migrations
        const appliedMigrations = await database.all(
            'SELECT version FROM migrations ORDER BY version ASC'
        );
        const appliedVersions = new Set(appliedMigrations.map((m) => m.version));

        // Run pending migrations
        for (const migration of migrations) {
            if (!appliedVersions.has(migration.version)) {
                console.log(`Running migration ${migration.version}: ${migration.name}`);
                await migration.up();
                await database.run(
                    'INSERT INTO migrations (version, name) VALUES (?, ?)',
                    [migration.version, migration.name]
                );
                console.log(`Migration ${migration.version} completed`);
            }
        }

        console.log('All migrations completed');
    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    }
}

module.exports = { runMigrations };
