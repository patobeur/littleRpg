const database = require('./server/database/database');

async function checkDb() {
    try {
        await database.connect();
        console.log('--- Characters Table Schema ---');
        const schema = await database.all("PRAGMA table_info(characters)");
        console.table(schema);

        console.log('\n--- Characters Data ---');
        const data = await database.all("SELECT id, name, pos_x, pos_y, pos_z, rotation_y FROM characters");
        console.table(data);

        console.log('\n--- Users Data ---');
        const users = await database.all("SELECT id, username, email FROM users");
        console.table(users);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkDb();
