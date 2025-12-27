/**
 * LittleRPG Game Lister
 * Fetches and displays open game sessions from the local API.
 * 
 * Usage: node list_game.js
 */

const http = require('http');

// Configuration
// Try to detect port from environment or default to 3000
const PORT = process.env.PORT || 3000;
const API_URL = `http://localhost:${PORT}/api/admin/lobbies`;

console.log(`\n🔍 Searching for open games on localhost:${PORT}...\n`);

const req = http.get(API_URL, (res) => {
    let data = '';

    // A chunk of data has been received.
    res.on('data', (chunk) => {
        data += chunk;
    });

    // The whole response has been received.
    res.on('end', () => {
        try {
            if (res.statusCode !== 200) {
                console.error(`❌ Error: API returned status code ${res.statusCode}`);
                console.error(`   Make sure the server is running locally.`);
                return;
            }

            const lobbies = JSON.parse(data);

            if (lobbies.length === 0) {
                console.log("no active game");
                return;
            }

            console.log(`🎮 Found ${lobbies.length} active game(s):\n`);

            // Header
            console.log(`${pad('CODE', 8)} | ${pad('HOST', 20)} | ${pad('SCENARIO', 20)} | ${pad('PLAYERS', 8)} | ${pad('STATUS', 10)}`);
            console.log('-'.repeat(80));

            // Rows
            lobbies.forEach(lobby => {
                const playerCount = `${lobby.players.length}/4`;
                const status = lobby.started ? 'Playing' : 'Lobby';

                console.log(
                    `${pad(lobby.code, 8)} | ` +
                    `${pad(lobby.players.find(p => p.id === lobby.host)?.name || 'Unknown', 20)} | ` +
                    `${pad(lobby.scenario, 20)} | ` +
                    `${pad(playerCount, 8)} | ` +
                    `${pad(status, 10)}`
                );
            });
            console.log('\n');

        } catch (e) {
            console.error('❌ Error parsing response:', e.message);
        }
    });

}).on("error", (err) => {
    console.error("❌ Link Error: " + err.message);
    console.error("   Make sure the LittleRPG server is running (npm start).");
});

// Helper for padding strings
function pad(str, len) {
    str = String(str);
    if (str.length > len) {
        return str.substring(0, len - 3) + '...';
    }
    return str + ' '.repeat(len - str.length);
}
