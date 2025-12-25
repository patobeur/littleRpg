// Check database for role column and admin account
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'rpg.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking database...\n');

// Check if role column exists
db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
        console.error('Error checking table schema:', err);
        return;
    }

    console.log('Users table columns:');
    columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
    });

    const hasRole = columns.some(col => col.name === 'role');
    console.log(`\n✓ Role column exists: ${hasRole ? 'YES' : 'NO'}`);
});

// Check for admin account
db.get("SELECT username, email, role FROM users WHERE email = 'patobeuradmin@patobeur.pat'", (err, row) => {
    if (err) {
        console.error('\nError checking admin account:', err);
        db.close();
        return;
    }

    if (row) {
        console.log('\n✓ SuperAdmin account found:');
        console.log(`  Username: ${row.username}`);
        console.log(`  Email: ${row.email}`);
        console.log(`  Role: ${row.role}`);
    } else {
        console.log('\n✗ SuperAdmin account NOT found');
    }

    // List all users
    db.all("SELECT username, email, role FROM users", (err, users) => {
        if (err) {
            console.error('\nError listing users:', err);
        } else {
            console.log(`\nAll users in database (${users.length}):`);
            users.forEach(u => {
                console.log(`  - ${u.username} (${u.email}) [${u.role || 'NO ROLE'}]`);
            });
        }
        db.close();
    });
});
