import * as THREE from 'three';
import { fadeModel } from './Utils.js';
import { NetworkOptimizer } from './NetworkOptimizer.js';
import { MessageBatcher } from './MessageBatcher.js';
import { NetworkMonitor } from './NetworkMonitor.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.lastEmit = 0;
        this.networkUpdateInterval = 50; // 20 updates/sec (20Hz)
        this.disconnectTimers = new Map();
        this.previousStates = new Map(); // For delta compression
        this.messageBatcher = null; // Initialized after socket connection

        // Performance monitoring (disable in production for performance)
        this.monitor = new NetworkMonitor();
    }

    setupSockets() {
        if (typeof io === 'undefined') {
            console.error('Socket.io not found!');
            return;
        }

        // Configure client to match server (WebSocket only)
        this.socket = io({
            transports: ['websocket'],
            upgrade: false
        });

        // Initialize message batcher
        this.messageBatcher = new MessageBatcher(this);

        // Listen for batched updates (NEW - replaces individual player_updated)
        this.socket.on('batch_update', (batch) => {
            this.monitor.trackReceived('batch_update', batch); // Track performance
            this.messageBatcher.processBatch(batch);
        });

        // Keep individual listeners for backward compatibility and non-batched events
        this.socket.on('player_updated', (data) => this.handlePlayerUpdated(data));
        this.socket.on('initial_states', (data) => this.handleInitialStates(data));
        this.socket.on('player_joined_game', (data) => this.handlePlayerJoinedGame(data)); // Handle joining players for visibility fix
        this.socket.on('enemy_states', (data) => this.handleEnemyStates(data));
        this.socket.on('structure_states', (data) => this.handleStructureStates(data));
        this.socket.on('entity_update', (data) => this.handleEntityUpdate(data)); // Keep for individual updates
        this.socket.on('player_disconnected', (data) => this.handlePlayerDisconnected(data));
        this.socket.on('player_reconnected', (data) => this.handlePlayerReconnected(data));

        // Scene/Teleport events
        this.socket.on('teleport_countdown', (data) => {
            console.log(`🔮 Teleportation in ${data.timeLeft} seconds...`);
            // TODO: UI update
        });

        this.socket.on('teleport_canceled', () => {
            console.log('❌ Teleportation canceled');
            // TODO: UI update
        });

        this.socket.on('scene_changed', (data) => {
            console.log(`🌍 Changing to ${data.sceneId}!`);
            this.game.handleSceneChange(data);
        });

        this.socket.on('scene_config', (data) => {
            console.log(`[Network] Received scene config for ${data.sceneId}`);
            this.game.updateSceneConfig(data);
        });

        this.socket.on('game_complete', () => {
            console.log('🎉 Game Complete!');
            alert('Félicitations ! Vous avez terminé toutes les scènes !');
            window.location.href = '/dashboard.html';
        });
    }

    joinGame(lobbyCode, characterId) {
        if (this.socket && lobbyCode && characterId) {
            this.socket.emit('join_game', {
                code: lobbyCode,
                characterId: characterId
            });
        }
    }

    handlePlayerUpdated(data) {
        const charId = data.characterId;
        const pd = this.game.entityManager.playerData.get(charId);

        if (pd && charId !== this.game.entityManager.localCharacterId) {
            if (pd.positionSet) {
                pd.targetPosition = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
                pd.targetRotation = data.rotation;
            } else {
                pd.model.position.set(data.position.x, data.position.y, data.position.z);
                pd.model.rotation.y = data.rotation;
                pd.positionSet = true;
            }

            pd.targetAnimation = data.animation;
            pd.targetTimeScale = data.timeScale || 1;
        }
    }

    handleEnemyStates(data) {
        if (data.enemies) {
            this.game.entityManager.loadEnemies(data.enemies);
        }
    }

    handleStructureStates(data) {
        if (data.structures) {
            console.log(`[NetworkManager] Received ${data.structures.length} structures`);
            this.game.entityManager.loadStructures(data.structures);
        }
    }

    handleInitialStates(data) {
        data.states.forEach(state => {
            const pd = this.game.entityManager.playerData.get(state.characterId);
            if (pd) {
                // Cancel pending disconnects
                if (this.disconnectTimers.has(state.characterId)) {
                    clearTimeout(this.disconnectTimers.get(state.characterId));
                    this.disconnectTimers.delete(state.characterId);
                    fadeModel(pd.model, 1.0, 500);
                }

                if (pd.disconnected) {
                    pd.disconnected = false;
                    pd.model.visible = true;
                    fadeModel(pd.model, 1.0, 800);
                }

                pd.model.position.set(state.position.x, state.position.y, state.position.z);
                pd.model.rotation.y = state.rotation;

                pd.targetAnimation = state.animation;
                pd.targetTimeScale = state.timeScale || 1;
                pd.positionSet = true;

                pd.model.visible = true;
                fadeModel(pd.model, 1.0, 800);

                // If me
                if (state.characterId === this.game.entityManager.localCharacterId) {
                    const target = this.game.entityManager.targetModel;
                    if (target) {
                        target.position.copy(pd.model.position);
                        target.rotation.y = pd.model.rotation.y;

                        // Force camera update immediately
                        this.game.inputManager.updateCamera(target, this.game.sceneManager.camera);
                    }
                }
            }
        });

        // Fallback for missing positions
        setTimeout(() => {
            this.game.entityManager.playerData.forEach((pd, charId) => {
                if (!pd.positionSet && pd.fallbackSpawn) {
                    console.log(`No DB position for ${charId}, using fallback spawn`);
                    pd.model.position.set(pd.fallbackSpawn.x, pd.fallbackSpawn.y, pd.fallbackSpawn.z);
                    pd.model.visible = true;
                    fadeModel(pd.model, 1.0, 800);
                    pd.positionSet = true;
                }
            });
        }, 1000);
    }

    handlePlayerJoinedGame(data) {
        // This event is received by existing players when a new player joins the game
        // We need to make the joining player visible to us
        if (!data.state) return;

        const state = data.state;
        const pd = this.game.entityManager.playerData.get(state.characterId);

        if (pd && state.characterId !== this.game.entityManager.localCharacterId) {
            console.log(`[NetworkManager] Player ${state.characterId} joined the game - making visible`);

            // Set position and rotation
            pd.model.position.set(state.position.x, state.position.y, state.position.z);
            pd.model.rotation.y = state.rotation;

            // Set animation
            pd.targetAnimation = state.animation;
            pd.targetTimeScale = state.timeScale || 1;
            pd.positionSet = true;

            // Make visible with fade-in effect
            pd.model.visible = true;
            fadeModel(pd.model, 1.0, 800);

            // Ensure they're not marked as disconnected
            pd.disconnected = false;
        }
    }

    handlePlayerDisconnected(data) {
        console.log(`Player ${data.playerId} disconnected`);
        if (!data.characterId) return;

        const pd = this.game.entityManager.playerData.get(data.characterId);
        if (pd) {
            fadeModel(pd.model, 0.4, 500);
        }

        const timer = setTimeout(() => {
            const pd = this.game.entityManager.playerData.get(data.characterId);
            if (pd) {
                fadeModel(pd.model, 0, 500);
                setTimeout(() => {
                    pd.model.visible = false;
                    pd.disconnected = true;
                }, 500);
            }
            this.disconnectTimers.delete(data.characterId);
        }, 5000);

        this.disconnectTimers.set(data.characterId, timer);
    }

    handlePlayerReconnected(data) {
        console.log(`Player ${data.name} reconnected`);
        const pd = this.game.entityManager.playerData.get(data.characterId);
        if (pd) {
            if (this.disconnectTimers.has(data.characterId)) {
                clearTimeout(this.disconnectTimers.get(data.characterId));
                this.disconnectTimers.delete(data.characterId);
            }
            pd.disconnected = false;
            pd.model.visible = true;
            fadeModel(pd.model, 1.0, 500);
        }
    }

    emitPlayerUpdate(characterId, position, rotation, animation, timeScale) {
        if (!this.socket) return;

        const now = Date.now();
        if (now - this.lastEmit >= this.networkUpdateInterval) {
            // Round position and rotation to reduce bandwidth
            const roundedPos = NetworkOptimizer.roundPosition(position);
            const roundedRot = NetworkOptimizer.roundRotation(rotation);

            const updateData = {
                characterId,
                position: roundedPos,
                rotation: roundedRot,
                animation,
                timeScale
            };

            this.socket.emit('player_update', updateData);
            this.monitor.trackSent('player_update', updateData); // Track performance
            this.lastEmit = now;
        }

        // Update monitor periodically
        this.monitor.update();
    }

    emitEnterZone(characterId) {
        if (this.socket) this.socket.emit('player_entered_zone', { characterId });
    }

    emitLeftZone(characterId) {
        if (this.socket) this.socket.emit('player_left_zone', { characterId });
    }

    emitPlayerAttack(targetId) {
        if (this.socket) this.socket.emit('player_attack', { targetId });
    }

    // Handlers
    handleEntityUpdate(data) {
        // data = { id, stats: { hp, maxHp }, ... }
        this.game.entityManager.updateEnemyStats(data.id, data.stats);
    }
}
