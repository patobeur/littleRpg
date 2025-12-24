// Main server file
const express = require('express');
const fs = require('fs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const database = require('./database/database');
const { runMigrations } = require('./database/migrations');

// Import routes
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const userRoutes = require('./routes/users');

const http = require('http');
const { Server } = require('socket.io');
const LobbyManager = require('./lobby-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
                "img-src": ["'self'", "data:", "blob:"],
                "connect-src": ["'self'", "ws://*:*", "http://*:*"],
                "font-src": ["'self'", "data:"],
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

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/users', userRoutes);

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});



// Map Generator Routes
// Middleware to restrict access to localhost
const requireLocalhost = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
        next();
    } else {
        res.status(403).send('Access denied. Localhost only.');
    }
};

app.get('/map_generator.html', requireLocalhost, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'map_generator', 'index.html'));
});

app.get('/api/maps', requireLocalhost, (req, res) => {
    const mapDir = path.join(__dirname, 'data/maps');
    if (!fs.existsSync(mapDir)) fs.mkdirSync(mapDir, { recursive: true });

    fs.readdir(mapDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list maps' });
        res.json(files.filter(f => f.endsWith('.json')));
    });
});

app.get('/api/maps/:name', requireLocalhost, (req, res) => {
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

app.post('/api/maps', requireLocalhost, express.json(), (req, res) => {
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

// SCENARIO ROUTES
app.get('/api/scenarios', requireLocalhost, (req, res) => {
    const dir = path.join(__dirname, 'data/scenarios');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.readdir(dir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list scenarios' });

        const scenarios = [];
        files.filter(f => f.endsWith('.json')).forEach(file => {
            try {
                const content = fs.readFileSync(path.join(dir, file), 'utf8');
                scenarios.push(JSON.parse(content));
            } catch (e) { }
        });
        res.json(scenarios);
    });
});

app.get('/api/scenarios/:id', requireLocalhost, (req, res) => {
    const safeId = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(__dirname, 'data/scenarios', `${safeId}.json`);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Scenario not found' });
    }
});

app.post('/api/scenarios', requireLocalhost, express.json(), (req, res) => {
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

// Initialize database and start server
async function start() {
    try {
        // Connect to database
        await database.connect();
        console.log('Database connected');

        // Run migrations
        await runMigrations();
        console.log('Database migrations completed');

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
