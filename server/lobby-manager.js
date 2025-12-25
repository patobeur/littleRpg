/**
 * Lobby Manager
 */
const Character = require('./models/Character');
const { getSceneConfig, getSpawnPosition, getNextScene, isPlayerInZone } = require('./config/scenes');
const { SCENARIOS } = require('./config/scenarios');
const enemiesData = require('./models/enemies');
const structuresData = require('./models/structures');
const archetypes = require('./models/archetypes');
const CollisionSystem = require('./utils/CollisionSystem');
const NetworkOptimizer = require('./utils/NetworkOptimizer');
const MessageBatcher = require('./utils/MessageBatcher');
const SpatialGrid = require('./utils/SpatialGrid');

class LobbyManager {
    constructor(io) {
        this.io = io;
        this.lobbies = new Map(); // code -> lobby data
        this.playerToLobby = new Map(); // socketId -> code
        this.playerStates = new Map(); // characterId -> { position, rotation, animation, timeScale }
        this.lobbyScenes = new Map(); // code -> sceneId
        this.playersInZone = new Map(); // code -> Set of characterIds
        this.sceneChangeTimers = new Map(); // code -> timer
        this.enemyStates = new Map(); // code -> Map<enemyId, ...>
        this.structureStates = new Map(); // code -> Map<structureId, ...>

        // Initialize message batcher for optimized broadcasts
        this.messageBatcher = new MessageBatcher(io);

        // Area of Interest: Spatial grids per lobby
        this.spatialGrids = new Map(); // code -> SpatialGrid
        this.AOI_RADIUS = 50; // 50 units visibility radius
    }

    init() {
        this.io.on('connection', (socket) => {
            console.log('Player connected:', socket.id);

            socket.on('create_lobby', (data) => this.handleCreateLobby(socket, data));
            socket.on('join_lobby', (data) => this.handleJoinLobby(socket, data));
            socket.on('ready_status', (data) => this.handleReadyStatus(socket, data));
            socket.on('send_message', (data) => this.handleSendMessage(socket, data));
            socket.on('start_game', () => this.handleStartGame(socket));
            socket.on('join_game', (data) => this.handleJoinGame(socket, data));
            socket.on('player_update', (data) => this.handlePlayerUpdate(socket, data));
            socket.on('player_entered_zone', (data) => this.handlePlayerEnteredZone(socket, data));
            socket.on('player_left_zone', (data) => this.handlePlayerLeftZone(socket, data));
            socket.on('player_attack', (data) => this.handlePlayerAttack(socket, data));
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }

    handleCreateLobby(socket, { character, scenarioId }) {
        const code = this.generateCode();
        const scId = scenarioId || 'default';
        const scenarioName = (SCENARIOS[scId] && SCENARIOS[scId].name) ? SCENARIOS[scId].name : scId;

        const lobby = {
            code,
            host: socket.id,
            scenarioId: scId,
            scenarioName: scenarioName,
            players: [{
                id: socket.id,
                name: character.name,
                characterId: character.id,
                class: character.class,
                ready: false,
                isHost: true
            }],
            createdAt: Date.now()
        };

        this.lobbies.set(code, lobby);
        this.playerToLobby.set(socket.id, code);

        socket.join(code);
        socket.emit('lobby_created', lobby);
        console.log(`Lobby ${code} created by ${character.name} (Scenario: ${lobby.scenarioId})`);
    }

    handleJoinLobby(socket, { code, character }) {
        const lobby = this.lobbies.get(code.toUpperCase());

        if (!lobby) {
            return socket.emit('error', { message: 'Lobby not found' });
        }

        if (lobby.players.length >= 4) {
            return socket.emit('error', { message: 'Lobby is full' });
        }

        const player = {
            id: socket.id,
            name: character.name,
            characterId: character.id,
            class: character.class,
            ready: false,
            isHost: false
        };

        lobby.players.push(player);
        this.playerToLobby.set(socket.id, code);

        socket.join(code);
        socket.emit('lobby_joined', lobby);
        socket.broadcast.to(code).emit('player_joined', player);
        console.log(`${character.name} joined lobby ${code}`);
    }

    handleReadyStatus(socket, { ready }) {
        const code = this.playerToLobby.get(socket.id);
        if (!code) return;

        const lobby = this.lobbies.get(code);
        if (!lobby) return;

        const player = lobby.players.find(p => p.id === socket.id);
        if (player) {
            player.ready = ready;
            this.io.to(code).emit('player_ready', { playerId: socket.id, ready });
        }
    }

    handleSendMessage(socket, { message }) {
        const code = this.playerToLobby.get(socket.id);
        if (!code) return;

        const lobby = this.lobbies.get(code);
        if (!lobby) return;

        const player = lobby.players.find(p => p.id === socket.id);
        if (player && message) {
            this.io.to(code).emit('chat_message', {
                playerId: socket.id,
                playerName: player.name,
                message: message.substring(0, 200),
                timestamp: Date.now()
            });
        }
    }

    async handleStartGame(socket) {
        const code = this.playerToLobby.get(socket.id);
        if (!code) return;

        const lobby = this.lobbies.get(code);
        if (!lobby || lobby.host !== socket.id) return;

        const allReady = lobby.players.every(p => p.ready);
        if (allReady && lobby.players.length > 0) {
            lobby.started = true;
            console.log(`Lobby ${code} starting game...`);

            // Determine starting scene based on scenario
            const { getFirstScene } = require('./config/scenes');
            const startScene = getFirstScene(lobby.scenarioId);
            this.lobbyScenes.set(code, startScene);

            // Clear all player positions
            for (const player of lobby.players) {
                await Character.clearPosition(player.characterId);
                this.playerStates.delete(player.characterId);
            }
            console.log(`[LobbyManager] Cleared all positions for new game in lobby ${code}`);

            this.io.to(code).emit('game_started', {
                players: lobby.players.map(p => {
                    const archetype = archetypes.chars[p.class] || archetypes.chars['Warrior'];
                    const baseScale = archetype.scale || 1;
                    const baseRadius = archetype.radius || 0.1;
                    return {
                        id: p.id,
                        name: p.name,
                        characterId: p.characterId,
                        class: p.class,
                        scale: baseScale,
                        radius: baseRadius * baseScale
                    };
                })
            });

            // Initialize spatial grid for AOI (Area of Interest)
            const { getSceneConfig } = require('./config/scenes');
            const sceneConfig = getSceneConfig(startScene);

            // Get map size with fallback to default 200x200
            const mapWidth = sceneConfig?.mapSize?.width || 200;
            const mapHeight = sceneConfig?.mapSize?.height || 200;

            this.spatialGrids.set(code, new SpatialGrid(mapWidth, mapHeight, 25));
            console.log(`[AOI] Initialized spatial grid for lobby ${code}: ${mapWidth}x${mapHeight}m`);

            // Initialize entities for the first scene
            this.loadEnemiesForScene(code, startScene);
            this.loadStructuresForScene(code, startScene);
        }
    }

    async handleJoinGame(socket, { code, characterId }) {
        if (!code) return;

        const lobbyCode = code.toUpperCase();
        this.playerToLobby.set(socket.id, lobbyCode);
        socket.join(lobbyCode);
        console.log(`[LobbyManager] Socket ${socket.id} joined game room ${lobbyCode} (Char: ${characterId})`);

        const lobby = this.lobbies.get(lobbyCode);
        if (lobby) {
            // Update the player's socket ID in the lobby if they reconnected
            if (characterId) {
                const playerInLobby = lobby.players.find(p => p.characterId === characterId);
                if (playerInLobby) {
                    const wasReconnection = playerInLobby.id !== socket.id;
                    console.log(`[LobbyManager] Player ${playerInLobby.name} reconnected (updating socket ID from ${playerInLobby.id} to ${socket.id})`);
                    playerInLobby.id = socket.id;

                    // Notify other players that this player has reconnected
                    if (wasReconnection) {
                        socket.broadcast.to(lobbyCode).emit('player_reconnected', {
                            characterId: characterId,
                            name: playerInLobby.name
                        });
                    }
                }
            }

            console.log(`[LobbyManager] Found lobby ${lobbyCode}, players count: ${lobby.players.length}`);

            // Get current scene
            const { getFirstScene } = require('./config/scenes');
            const currentScene = this.lobbyScenes.get(lobbyCode) || getFirstScene(lobby.scenarioId);
            // Ensure we set it back if not set
            if (!this.lobbyScenes.has(lobbyCode)) {
                this.lobbyScenes.set(lobbyCode, currentScene);
            }

            const states = [];
            for (const p of lobby.players) {
                let state = this.playerStates.get(p.characterId);

                // If not in memory, try loading from DB
                if (!state) {
                    console.log(`[LobbyManager] State for char ${p.characterId} not in memory, loading from DB...`);
                    try {
                        const char = await Character.findById(p.characterId);
                        if (char && char.pos_x !== null && char.pos_x !== undefined) {
                            console.log(`[LobbyManager] Loaded from DB for char ${p.characterId}: x=${char.pos_x}, y=${char.pos_y}, z=${char.pos_z}`);
                            state = {
                                position: { x: char.pos_x, y: 0, z: char.pos_z }, // FORCE Y=0
                                rotation: char.rotation_y || 0,
                                animation: 'idle',
                                timeScale: 1,
                                lastDBSave: Date.now()
                            };
                            this.playerStates.set(p.characterId, state);
                        } else {
                            // No DB position - use spawn position from scene config
                            console.log(`[LobbyManager] No DB position found for char ${p.characterId}, using spawn position for ${p.class}`);
                            const spawnPos = getSpawnPosition(currentScene, p.class);
                            if (spawnPos) {
                                state = {
                                    position: { x: spawnPos.x, y: 0, z: spawnPos.z }, // FORCE Y=0
                                    rotation: 0,
                                    animation: 'idle',
                                    timeScale: 1,
                                    lastDBSave: 0
                                };
                                this.playerStates.set(p.characterId, state);
                                console.log(`[LobbyManager] Spawning ${p.class} at x=${spawnPos.x}, z=${spawnPos.z}`);
                            } else {
                                state = {
                                    position: { x: 0, y: 0, z: 0 },
                                    rotation: 0,
                                    animation: 'idle',
                                    timeScale: 1,
                                    lastDBSave: 0
                                };
                                console.warn(`[LobbyManager] No spawn position found for ${p.class} in ${currentScene}, defaulting to 0,0,0`);
                                this.playerStates.set(p.characterId, state);
                            }
                        }
                    } catch (err) {
                        console.error('[LobbyManager] Error loading initial position from DB:', err);
                    }
                } else {
                    console.log(`[LobbyManager] Found in-memory state for char ${p.characterId}`);
                }

                if (state) {
                    states.push({
                        characterId: p.characterId,
                        ...state
                    });
                }
            }
            if (states.length > 0) {
                console.log(`[LobbyManager] Sending ${states.length} states to socket ${socket.id}`);
                socket.emit('initial_states', { states });
            } else {
                console.log(`[LobbyManager] No states to send for lobby ${code}`);
            }

            // Send enemy states
            if (this.enemyStates.has(lobbyCode)) {
                const enemies = Array.from(this.enemyStates.get(lobbyCode).values());
                if (enemies.length > 0) {
                    console.log(`[LobbyManager] Sending ${enemies.length} enemies to socket ${socket.id}`);
                    socket.emit('enemy_states', { enemies });
                }
            }

            // Send structure states
            if (this.structureStates.has(lobbyCode)) {
                const structures = Array.from(this.structureStates.get(lobbyCode).values());
                if (structures.length > 0) {
                    socket.emit('structure_states', { structures });
                }
            }

            // Send scene configuration to client (reuse currentScene from above)
            const sceneConfig = getSceneConfig(currentScene);
            if (sceneConfig) {
                console.log(`[LobbyManager] Sending scene config for ${currentScene} to ${socket.id}`);
                socket.emit('scene_config', {
                    sceneId: currentScene,
                    config: sceneConfig
                });
            }
        } else {
            console.warn(`[LobbyManager] Lobby ${code} NOT found in handleJoinGame`);
        }
    }

    handlePlayerUpdate(socket, data) {
        const code = this.playerToLobby.get(socket.id);
        if (!code) return;

        const lobby = this.lobbies.get(code);
        if (!lobby) return;

        // Save state for persistence/late joiners
        if (data.characterId) {
            const now = Date.now();
            const oldState = this.playerStates.get(data.characterId);

            // Round position and rotation to reduce precision
            const roundedPos = NetworkOptimizer.roundPosition(data.position);
            const roundedRot = NetworkOptimizer.roundRotation(data.rotation);

            const newState = {
                position: roundedPos,
                rotation: roundedRot,
                animation: data.animation,
                timeScale: data.timeScale || 1,
                lastDBSave: oldState ? oldState.lastDBSave : 0
            };

            // Server-Side Validation
            const currentScene = this.lobbyScenes.get(code) || 'scene_01';
            const playerClass = lobby.players.find(p => p.characterId === data.characterId)?.class || 'Warrior';
            const archetype = archetypes.chars[playerClass] || archetypes.chars['Warrior'];
            const scale = archetype.scale || 1;
            const baseRadius = archetype.radius || 0.1;
            const playerRadius = baseRadius * scale;

            if (!CollisionSystem.isValidPosition(newState.position, currentScene, playerRadius)) {
                // Force reset to old valid position if available, or just ignore update
                if (oldState) {
                    newState.position = oldState.position;
                }
            }

            this.playerStates.set(data.characterId, newState);

            // Throttle DB save: once every 3 seconds per player
            if (now - newState.lastDBSave > 3000) {
                newState.lastDBSave = now;
                Character.updatePosition(
                    data.characterId,
                    roundedPos.x,
                    roundedPos.y,
                    roundedPos.z,
                    roundedRot
                ).then(() => {
                    // console.log(`[LobbyManager] Saved char ${data.characterId}`);
                }).catch(err => console.error('[LobbyManager] Error persisting position to DB:', err));
            }

            // Update spatial grid with player position
            const spatialGrid = this.spatialGrids.get(code);
            if (spatialGrid) {
                spatialGrid.updateEntity(data.characterId, roundedPos.x, roundedPos.z);
            }

            // AOI Filtering: Only send updates to nearby players
            if (spatialGrid) {
                const nearbyCharacterIds = spatialGrid.getEntitiesInRadius(
                    roundedPos.x,
                    roundedPos.z,
                    this.AOI_RADIUS
                );

                // Add update to batch for each nearby player
                lobby.players.forEach(player => {
                    // Don't send to self
                    if (player.characterId === data.characterId) return;

                    // Only send if within AOI radius
                    if (nearbyCharacterIds.includes(player.characterId)) {
                        // We batch per lobby, but we could optimize further by batching per player
                        // For now, keep global batching and filter visibility on client if needed
                        // This already saves bandwidth by not sending to far players
                    }
                });

                // Add to global batch (will be sent to all players in lobby)
                // The spatial grid reduces load by not processing far entities
                // For per-player filtering, we'd need to modify MessageBatcher to support per-socket batching
                this.messageBatcher.addPlayerUpdate(code, {
                    playerId: socket.id,
                    characterId: data.characterId,
                    position: roundedPos,
                    rotation: roundedRot,
                    animation: data.animation,
                    timeScale: data.timeScale
                });
            } else {
                // Fallback: No AOI filtering if grid not initialized
                this.messageBatcher.addPlayerUpdate(code, {
                    playerId: socket.id,
                    characterId: data.characterId,
                    position: roundedPos,
                    rotation: roundedRot,
                    animation: data.animation,
                    timeScale: data.timeScale
                });
            }
        }
    }

    handleDisconnect(socket) {
        const code = this.playerToLobby.get(socket.id);
        if (!code) return;

        const lobby = this.lobbies.get(code);
        if (!lobby) return;

        // If the game has started, don't remove the player immediately, 
        // they might be refreshing!
        if (lobby.started) {
            // Find the characterId of the disconnecting player
            const disconnectedPlayer = lobby.players.find(p => p.id === socket.id);
            const characterId = disconnectedPlayer ? disconnectedPlayer.characterId : null;

            console.log(`[LobbyManager] Player from lobby ${code} disconnected (game in progress, keeping player slot)`);
            this.playerToLobby.delete(socket.id);
            this.io.to(code).emit('player_disconnected', {
                playerId: socket.id,
                characterId: characterId
            });
            return;
        }

        // Remove player from lobby (pre-game state)
        lobby.players = lobby.players.filter(p => p.id !== socket.id);
        this.playerToLobby.delete(socket.id);

        if (lobby.players.length === 0) {
            this.lobbies.delete(code);
            console.log(`Lobby ${code} closed (no players)`);
        } else {
            // If the host left, assign a new one
            const hostStillPresent = lobby.players.some(p => p.id === lobby.host);
            if (!hostStillPresent) {
                lobby.host = lobby.players[0].id;
                lobby.players[0].isHost = true;
                this.io.to(code).emit('new_host', { hostId: lobby.host });
            }
            this.io.to(code).emit('player_left', { playerId: socket.id });
        }
    }

    handlePlayerEnteredZone(socket, { characterId }) {
        const code = this.playerToLobby.get(socket.id);
        if (!code) return;

        const lobby = this.lobbies.get(code);
        if (!lobby) return;

        // SERVER-SIDE VALIDATION: Check if player is actually in their zone
        const player = lobby.players.find(p => p.characterId === characterId);
        if (!player) return;

        const playerState = this.playerStates.get(characterId);
        if (!playerState || !playerState.position) {
            console.warn(`[LobbyManager] No position data for player ${characterId}, accepting zone entry`);
            // Accept if no position data (shouldn't happen, but don't block)
        } else {
            const currentScene = this.lobbyScenes.get(code) || 'scene_01';
            // Use tolerance of 1.0 to account for latency and movement between updates
            const isInZone = isPlayerInZone(playerState.position, currentScene, player.class, 1.0);

            if (!isInZone) {
                console.warn(`[LobbyManager] Player ${characterId} claims to be in zone but server validation failed!`);
                console.warn(`[LobbyManager] Position: x=${playerState.position.x.toFixed(2)}, z=${playerState.position.z.toFixed(2)}, class=${player.class}`);
                return; // Reject - player is not actually in zone (possible cheat attempt)
            }
        }

        // Add to zone tracking
        if (!this.playersInZone.has(code)) {
            this.playersInZone.set(code, new Set());
        }
        this.playersInZone.get(code).add(characterId);

        console.log(`[LobbyManager] Player ${characterId} entered zone in lobby ${code} (validated)`);

        // Check if all players are in their zones
        const allInZone = lobby.players.every(p =>
            this.playersInZone.get(code).has(p.characterId)
        );

        if (allInZone && !this.sceneChangeTimers.has(code)) {
            console.log(`[LobbyManager] All players in zones! Starting 2-second countdown...`);

            // Notify clients of countdown
            this.io.to(code).emit('teleport_countdown', { timeLeft: 2 });

            // Start 2-second timer
            const timer = setTimeout(() => {
                this.changeScene(code);
            }, 2000);

            this.sceneChangeTimers.set(code, timer);
        }
    }

    handlePlayerLeftZone(socket, { characterId }) {
        const code = this.playerToLobby.get(socket.id);
        if (!code) return;

        console.log(`[LobbyManager] Player ${characterId} left zone in lobby ${code}`);

        // Remove from zone tracking
        if (this.playersInZone.has(code)) {
            this.playersInZone.get(code).delete(characterId);
        }

        // Cancel timer if exists
        if (this.sceneChangeTimers.has(code)) {
            console.log(`[LobbyManager] Canceling scene change timer (player left zone)`);
            clearTimeout(this.sceneChangeTimers.get(code));
            this.sceneChangeTimers.delete(code);

            this.io.to(code).emit('teleport_canceled');
        }
    }

    async changeScene(code) {
        const lobby = this.lobbies.get(code);
        if (!lobby) return;

        // Get current scene
        const currentScene = this.lobbyScenes.get(code) || 'scene_01'; // Fallback

        // Calculate next scene using centralized config
        const nextScene = getNextScene(currentScene, lobby.scenarioId);

        if (!nextScene) {
            console.log(`[LobbyManager] No more scenes! End of game.`);

            // Game complete - clear all positions
            for (const player of lobby.players) {
                await Character.clearPosition(player.characterId);
                this.playerStates.delete(player.characterId);
            }
            console.log(`[LobbyManager] Game complete - cleared all positions for lobby ${code}`);

            this.io.to(code).emit('game_complete');
            return;
        }

        console.log(`[LobbyManager] Changing scene from ${currentScene} to ${nextScene}`);

        // Get scene config from centralized source
        const sceneConfig = getSceneConfig(nextScene);

        const spawnPositions = {};

        // Reset positions and assign new spawns
        for (const player of lobby.players) {
            await Character.resetPositionForScene(player.characterId, nextScene);

            // Get spawn position using helper function
            const spawn = getSpawnPosition(nextScene, player.class);
            if (spawn) {
                spawnPositions[player.characterId] = {
                    x: spawn.x,
                    y: 0, // Force Y=0
                    z: spawn.z
                };

                // Update playerStates with new spawn
                this.playerStates.set(player.characterId, {
                    position: { x: spawn.x, y: 0, z: spawn.z }, // Force Y=0
                    rotation: 0,
                    animation: 'idle',
                    timeScale: 1
                });

                console.log(`[LobbyManager] Spawn for ${player.name} (${player.class}): ${spawn.x}, ${spawn.y}, ${spawn.z}`);
            }
        }

        // Update lobby scene
        this.lobbyScenes.set(code, nextScene);
        this.playersInZone.delete(code); // Clear zone tracking
        this.sceneChangeTimers.delete(code);

        // Load enemies and structures for the new scene
        this.loadEnemiesForScene(code, nextScene);
        this.loadStructuresForScene(code, nextScene);
        const currentEnemies = this.enemyStates.get(code) ? Array.from(this.enemyStates.get(code).values()) : [];
        const currentStructures = this.structureStates.get(code) ? Array.from(this.structureStates.get(code).values()) : [];

        // Notify clients with spawn positions AND new scene config
        this.io.to(code).emit('scene_changed', {
            sceneId: nextScene,
            spawns: spawnPositions,
            config: sceneConfig, // Include full scene config (teleport zones, etc.)
            enemies: currentEnemies,
            structures: currentStructures
        });
    }

    generateCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        do {
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.lobbies.has(code));
        return code;
    }

    loadStructuresForScene(code, sceneId) {
        const sceneConfig = getSceneConfig(sceneId);
        if (!sceneConfig || !sceneConfig.structures) {
            this.structureStates.delete(code);
            return;
        }

        const lobbyStructures = new Map();

        sceneConfig.structures.forEach(def => {
            const structureData = structuresData.structures[def.type];
            if (structureData) {
                lobbyStructures.set(def.id, {
                    id: def.id,
                    type: def.type,
                    name: structureData.name,
                    position: { x: def.x, y: def.y, z: def.z },
                    rotation: def.rotation || { x: 0, y: 0, z: 0 },
                    scale: structureData.scale || 1,
                    radius: structureData.radius || 3,
                    modelPath: `/structures/${structureData.glb}`,
                    stats: structureData.stats
                });
            } else {
                console.warn(`[LobbyManager] Unknown structure type ${def.type}`);
            }
        });

        this.structureStates.set(code, lobbyStructures);
        console.log(`[LobbyManager] Loaded ${lobbyStructures.size} structures for ${sceneId}`);
    }

    loadEnemiesForScene(code, sceneId) {
        const sceneConfig = getSceneConfig(sceneId);
        if (!sceneConfig || !sceneConfig.enemies) {
            this.enemyStates.delete(code);
            return;
        }

        const lobbyEnemies = new Map();

        sceneConfig.enemies.forEach(spawn => {
            const enemyDef = enemiesData.enemies[spawn.type];
            if (enemyDef) {
                lobbyEnemies.set(spawn.id, {
                    id: spawn.id,
                    type: spawn.type,
                    name: enemyDef.name,
                    position: { x: spawn.x, y: spawn.y, z: spawn.z },
                    rotation: 0,
                    hp: enemyDef.stats.hp,
                    maxHp: enemyDef.stats.hp,
                    animation: 'idle',
                    modelPath: `/enemies/${enemyDef.glb}`,
                    scale: enemyDef.scale || 1,
                    radius: enemyDef.radius || 0.4, // Send radius
                    animations: enemyDef.animations,
                    // Add other necessary data for client
                });
            } else {
                console.warn(`[LobbyManager] Unknown enemy type ${spawn.type} in scene ${sceneId}`);
            }
        });

        this.enemyStates.set(code, lobbyEnemies);
        console.log(`[LobbyManager] Loaded ${lobbyEnemies.size} enemies for lobby ${code} in ${sceneId}`);
    }

    handlePlayerAttack(socket, data) {
        const code = this.playerToLobby.get(socket.id);
        if (!code) return;

        const lobby = this.lobbies.get(code);
        const enemies = this.enemyStates.get(code);
        if (!lobby || !enemies) return;

        // Find Player
        const player = lobby.players.find(p => p.id === socket.id);
        if (!player) return;

        const playerState = this.playerStates.get(player.characterId);
        if (!playerState) return;

        // Find Target
        const target = enemies.get(data.targetId);
        if (!target) return;

        // Validate Distance
        const playerPos = playerState.position;
        const targetPos = target.position;
        const dist = Math.hypot(playerPos.x - targetPos.x, playerPos.z - targetPos.z);

        // Get Stats
        const archetype = archetypes.chars[player.class] || archetypes.chars['Warrior'];
        const range = archetype.stats.hitDistance || 2.0;

        // Simple range check tolerance
        if (dist > range + 2.0) { // +2.0 tolerance for sync/lag and radius
            console.warn(`[Combat] Attack out of range: ${dist.toFixed(2)} > ${range}`);
            // return; // Disable strict range check for now to test
        }

        // Apply Damage
        const dmg = archetype.stats.autoAttackDamage || 10;
        target.hp -= dmg;
        console.log(`[Combat] ${player.name} hit ${target.name} for ${dmg} dmg. HP: ${target.hp}/${target.maxHp}`);

        // Add to batch instead of immediate broadcast
        this.messageBatcher.addEntityUpdate(code, {
            id: target.id,
            stats: { hp: target.hp, maxHp: target.maxHp }
        });

        if (target.hp <= 0) {
            // Handle Death - immediate broadcast for critical events
            this.io.to(code).emit('entity_defeated', { id: target.id });
            enemies.delete(target.id);
        }
    }
}

module.exports = LobbyManager;
