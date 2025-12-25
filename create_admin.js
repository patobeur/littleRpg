// Manually create the superAdmin account
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'rpg.db');
const db = new sqlite3.Database(dbPath);
const SALT_ROUNDS = 10;

async function createSuperAdmin() {
    try {
        // Check if admin already exists
        db.get(
            'SELECT id, username, email, role FROM users WHERE email = ?',
            ['patobeuradmin@patobeur.pat'],
            async (err, row) => {
                if (err) {
                    console.error('Error checking for admin:', err);
                    db.close();
                    return;
                }

                if (row) {
                    console.log('✓ SuperAdmin account already exists:');
                    console.log(`  ID: ${row.id}`);
                    console.log(`  Username: ${row.username}`);
                    console.log(`  Email: ${row.email}`);
                    console.log(`  Role: ${row.role}`);
                    db.close();
                    return;
                }

                // Create the admin account
                console.log('Creating superAdmin account...');

                const passwordHash = await bcrypt.hash('patobeuradmin', SALT_ROUNDS);

                db.run(
                    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                    ['Patobeur', 'patobeuradmin@patobeur.pat', passwordHash, 'superAdmin'],
                    function (err) {
                        if (err) {
                            console.error('❌ Error creating admin account:', err);
                            db.close();
                            return;
                        }

                        console.log('✅ SuperAdmin account created successfully!');
                        console.log(`   ID: ${this.lastID}`);
                        console.log('   Username: Patobeur');
                        console.log('   Email: patobeuradmin@patobeur.pat');
                        console.log('   Password: patobeuradmin');
                        console.log('   Role: superAdmin');

                        db.close();
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error:', error);
        db.close();
    }
}

createSuperAdmin();
