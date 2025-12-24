const fs = require('fs');
const path = require('path');

const SCENARIOS = {};

const scenariosDir = path.join(__dirname, '../data/scenarios');

try {
    if (fs.existsSync(scenariosDir)) {
        const files = fs.readdirSync(scenariosDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const id = file.replace('.json', '');
                try {
                    const data = fs.readFileSync(path.join(scenariosDir, file), 'utf8');
                    SCENARIOS[id] = JSON.parse(data);
                } catch (e) {
                    console.error(`Error loading scenario ${file}:`, e);
                }
            }
        });
    }
} catch (err) {
    console.error('Failed to load scenarios:', err);
}

module.exports = {
    SCENARIOS
};
