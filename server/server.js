// Main server file
const express = require('express');
const fs = require('fs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const database = require('./database/database');
const { runMigrations, seedDefaultAdmin } = require('./database/migrations');

// Import routes
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');

// Import middleware
const visitTracker = require('./middleware/visitTracker');
const { requireRole } = require('./middleware/auth');

const http = require('http');
const { Server } = require('socket.io');
const LobbyManager = require('./lobby-manager');

const app = express();
const server = http.createServer(app);

// Socket.IO with optimizations
const io = new Server(server, {
    // Use WebSocket only (avoid long-polling overhead)
    transports: ['websocket'],

    // Enable compression for messages > 128 bytes
    perMessageDeflate: {
        threshold: 128,
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3 // Balance between speed and compression
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10
    },

    // Optimize ping/pong for better reconnection
    pingTimeout: 60000,
    pingInterval: 25000,

    // Optimize buffer sizes
    maxHttpBufferSize: 1e6, // 1MB max message size

    // Allow credentials for secure connections
    cors: {
        origin: config.server.env === 'production' ? false : '*',
        credentials: true
    }
});

// Initialize Lobby Manager
const lobbyManager = new LobbyManager(io);
lobbyManager.init();

// Security middleware
// In development, disable CSP entirely to avoid blocking local resources
// In production, use strict security policies
// Security middleware
if (config.server.env === 'production') {
    // In production, use strict security policies
    console.log("Production mode: Enabling Content Security Policy");
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                "script-src": ["'self'", "'unsafe-inline'"],
                "style-src": ["'self'", "'unsafe-inline'", "https:", "data:"],
                "img-src": ["'self'", "data:", "blob:", "https:"],
                "connect-src": ["'self'", "ws://*:*", "http://*:*"],
                "font-src": ["'self'", "data:", "https:"],
            },
        },
    }));
} else {
    // In development:
    // 1. Do NOT use Helmet (avoid default security headers that might block local dev)
    // 2. Explicitly remove CSP headers to override any browser cache or defaults
    console.log("Development mode: Disabling Content Security Policy");
    app.use((req, res, next) => {
        res.removeHeader("Content-Security-Policy");
        res.removeHeader("X-Content-Security-Policy");
        next();
    });
}


// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session middleware
app.use(session(config.session));

// General rate limiting - disabled in development
const generalLimiter = config.server.env === 'production'
    ? rateLimit(config.rateLimit)
    : (req, res, next) => next(); // No rate limiting in development
app.use(generalLimiter);

// Auth-specific rate limiting (stricter) - disabled in development
const authLimiter = config.server.env === 'production'
    ? rateLimit(config.authRateLimit)
    : (req, res, next) => next(); // No rate limiting in development

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve Three.js from node_modules
app.use('/js/three', express.static(path.join(__dirname, '..', 'node_modules', 'three', 'build')));
app.use('/js/addons', express.static(path.join(__dirname, '..', 'node_modules', 'three', 'examples', 'jsm')));

// Visit tracking middleware - track all public pages
app.use(visitTracker);

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Client Configuration Endpoint
app.get('/api/config/client', (req, res) => {
    res.json({
        ...config.clientDefaults,
        gameSettings: config.gameSettings
    });
});

// Semantic Routes
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'register.html')));

// Protected Game Routes
// Intercept these static files to ensure meaningful authentication/state
app.get(['/lobby.html', '/game.html'], (req, res, next) => {
    // Check if user is logged in via session
    if (!req.session || !req.session.userId) {
        return res.redirect('/login.html');
    }
    // If logged in, serve the static file
    next();
});

// Protected Admin Views
app.get('/stats.html', requireRole(['superAdmin']), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'stats.html'));
});

app.get('/map_generator.html', requireRole(['superAdmin']), (req, res) => {
    res.sendFile(path.join(__dirname, 'protected_views', 'map_generator', 'index.html'));
});

// Protected Map API Routes
app.get('/api/maps', requireRole(['superAdmin']), (req, res) => {
    const mapDir = path.join(__dirname, 'data/maps');
    if (!fs.existsSync(mapDir)) fs.mkdirSync(mapDir, { recursive: true });

    fs.readdir(mapDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list maps' });
        res.json(files.filter(f => f.endsWith('.json')));
    });
});

app.get('/api/maps/:name', requireRole(['superAdmin']), (req, res) => {
    const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(__dirname, 'data/maps', `${safeName}.json`);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(404).json({ error: 'Map not found' });
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).json({ error: 'Invalid map file' });
        }
    });
});

app.post('/api/maps', requireRole(['superAdmin']), express.json(), (req, res) => {
    const { name, data } = req.body;
    if (!name || !data) return res.status(400).json({ error: 'Missing name or data' });

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '');
    const mapDir = path.join(__dirname, 'data/maps');

    // Ensure directory exists
    if (!fs.existsSync(mapDir)) {
        try {
            fs.mkdirSync(mapDir, { recursive: true });
        } catch (e) {
            console.error('Failed to create map directory:', e);
            return res.status(500).json({ error: 'Failed to create system directory' });
        }
    }

    const filePath = path.join(mapDir, `${safeName}.json`);

    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error saving map:', err);
            return res.status(500).json({ error: 'Failed to save map file' });
        }
        console.log(`Map saved: ${filePath}`);
        res.json({ success: true, message: 'Map saved' });
    });
});

// Admin routes (Localhost only)
app.get('/api/admin/lobbies', requireRole(['superAdmin']), (req, res) => {
    try {
        const lobbies = Array.from(lobbyManager.lobbies.values()).map(lobby => ({
            code: lobby.code,
            host: lobby.host,
            scenario: lobby.scenarioName || lobby.scenarioId,
            players: lobby.players.map(p => ({
                name: p.name,
                class: p.class,
                level: 1 // Placeholder, could fetch real level if needed
            })),
            started: lobby.started || false,
            createdAt: lobby.createdAt
        }));
        res.json(lobbies);
    } catch (error) {
        console.error('Error listing lobbies:', error);
        res.status(500).json({ error: 'Failed to list lobbies' });
    }
});

// List available structure files
app.get('/api/structures', requireRole(['superAdmin']), (req, res) => {
    try {
        // Read structures from the configuration file
        const structuresConfig = require('./models/structures.js');

        if (!structuresConfig || !structuresConfig.structures) {
            return res.json([]);
        }

        // Return array of structure definitions
        const structures = Object.keys(structuresConfig.structures).map(key => {
            const struct = structuresConfig.structures[key];
            return {
                id: key,
                name: struct.name || key,
                scale: struct.scale || 1,
                radius: struct.radius || 2,
                fbx: struct.glb // glb is the fbx filename
            };
        });

        res.json(structures);
    } catch (err) {
        console.error('Failed to load structures:', err);
        res.status(500).json({ error: 'Failed to load structures' });
    }
});

// List available containers from server
app.get('/api/containers', requireRole(['superAdmin']), (req, res) => {
    try {
        const containersConfig = require('./models/containers.js');
        if (!containersConfig || !containersConfig.containers) {
            return res.json([]);
        }

        const containers = Object.keys(containersConfig.containers).map(key => {
            const container = containersConfig.containers[key];
            return {
                id: key,
                name: container.name || key,
                scale: container.scale || 1,
                radius: container.radius || 1,
                fbx: container.glb // glb is the fbx filename
            };
        });

        res.json(containers);
    } catch (err) {
        console.error('Failed to load containers:', err);
        res.status(500).json({ error: 'Failed to load containers' });
    }
});

// List available containers from server
app.get('/api/containers', requireRole(['superAdmin']), (req, res) => {
    try {
        const containersConfig = require('./models/containers.js');
        if (!containersConfig || !containersConfig.containers) {
            return res.json([]);
        }

        const containers = Object.keys(containersConfig.containers).map(key => {
            const container = containersConfig.containers[key];
            return {
                id: key,
                name: container.name || key,
                scale: container.scale || 1,
                radius: container.radius || 1,
                fbx: container.glb // glb is the fbx filename
            };
        });

        res.json(containers);
    } catch (err) {
        console.error('Failed to load containers:', err);
        res.status(500).json({ error: 'Failed to load containers' });
    }
});

// List available enemies
app.get('/api/enemies', requireRole(['superAdmin']), (req, res) => {
    try {
        const enemiesConfig = require('./models/enemies.js');

        if (!enemiesConfig || !enemiesConfig.enemies) {
            return res.json([]);
        }

        // Return array of enemy definitions
        const enemies = Object.keys(enemiesConfig.enemies).map(key => {
            const enemy = enemiesConfig.enemies[key];
            return {
                id: key,
                name: enemy.name || key,
                scale: enemy.scale || 1,
                radius: enemy.radius || 0.5,
                fbx: enemy.glb
            };
        });

        res.json(enemies);
    } catch (err) {
        console.error('Failed to load enemies:', err);
        res.status(500).json({ error: 'Failed to load enemies' });
    }
});

// List available natures (trees, rocks, etc.)
app.get('/api/natures', requireRole(['superAdmin']), (req, res) => {
    try {
        const naturesConfig = require('./models/natures.js');

        if (!naturesConfig || !naturesConfig.natures) {
            return res.json([]);
        }

        // Return array of nature definitions
        const natures = Object.keys(naturesConfig.natures).map(key => {
            const nature = naturesConfig.natures[key];
            return {
                id: key,
                name: nature.name || key,
                scale: nature.scale || 1,
                radius: nature.radius || 0.5,
                fbx: nature.glb
            };
        });

        res.json(natures);
    } catch (err) {
        console.error('Failed to load natures:', err);
        res.status(500).json({ error: 'Failed to load natures' });
    }
});

// List NPCs
app.get('/api/npcs', requireRole(['superAdmin']), (req, res) => {
    const npcDir = path.join(__dirname, '..', 'public', 'npc');
    if (!fs.existsSync(npcDir)) {
        return res.json([]);
    }
    fs.readdir(npcDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to read npc directory' });
        const npcs = files
            .filter(file => file.endsWith('.fbx'))
            .map(file => ({
                id: file.replace('.fbx', ''),
                name: file.replace('.fbx', ''),
                scale: 0.01 // Default scale for FBX
            }));
        res.json(npcs);
    });
});


// SCENARIO ROUTES
// Note: These routes are publicly accessible for game use (dashboard)
// Only POST is protected since it's for map generator editing
app.get('/api/scenarios', (req, res) => {
    const dir = path.join(__dirname, 'data/scenarios');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Check if we should show all scenarios (for map generator) or only active ones (for game)
    const showAll = req.query.showAll === 'true';

    fs.readdir(dir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list scenarios' });

        const scenarios = [];
        files.filter(f => f.endsWith('.json')).forEach(file => {
            try {
                const content = fs.readFileSync(path.join(dir, file), 'utf8');
                const scenario = JSON.parse(content);

                // Filter by active status unless showAll is true
                if (showAll || scenario.active !== false) {
                    scenarios.push(scenario);
                }
            } catch (e) { }
        });
        res.json(scenarios);
    });
});

app.get('/api/scenarios/:id', (req, res) => {
    const safeId = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(__dirname, 'data/scenarios', `${safeId}.json`);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Scenario not found' });
    }
});

// POST is still protected - only for map generator
app.post('/api/scenarios', requireRole(['superAdmin']), express.json(), (req, res) => {
    const scenario = req.body;
    if (!scenario.id || !scenario.name) return res.status(400).json({ error: 'Invalid scenario data' });

    const safeId = scenario.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = path.join(__dirname, 'data/scenarios');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${safeId}.json`);

    fs.writeFile(filePath, JSON.stringify(scenario, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save scenario' });
        res.json({ success: true, message: 'Scenario saved' });
    });
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Test route to list meshes in public/models (recursively)
app.get('/api/test/meshes', (req, res) => {
    const rootDir = path.join(__dirname, '..', 'public', 'models');

    // Simple recursive file crawler
    function getFiles(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(function (file) {
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                /* Recurse into a subdirectory */
                results = results.concat(getFiles(file));
            } else {
                /* Is a file */
                results.push(file);
            }
        });
        return results;
    }

    try {
        if (!fs.existsSync(rootDir)) {
            return res.json([]);
        }

        const allFiles = getFiles(rootDir);
        const fbxFiles = allFiles
            .filter(f => f.toLowerCase().endsWith('.fbx'))
            .map(f => {
                // Determine relative path from 'public' folder for client URL
                // e.g. full path is .../public/models/file.fbx -> models/file.fbx
                const publicDir = path.join(__dirname, '..', 'public');
                const relative = path.relative(publicDir, f);
                return relative.replace(/\\/g, '/'); // Ensure forward slashes for web
            });

        res.json(fbxFiles);
    } catch (e) {
        console.error('Error scanning models:', e);
        res.status(500).json({ error: 'Failed to scan models directory' });
    }
});

// Initialize database and start server
async function start() {
    try {
        // Connect to database
        await database.connect();
        console.log('Database connected');

        // Run migrations
        await runMigrations();
        console.log('Database migrations completed');

        // Seed default admin account
        await seedDefaultAdmin();

        // Start server
        server.listen(config.server.port, () => {
            console.log(`\n🎮 RPG Server running on http://localhost:${config.server.port}`);
            console.log(`Environment: ${config.server.env}\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await database.close();
    process.exit(0);
});

// Start the server
start();

module.exports = app;
