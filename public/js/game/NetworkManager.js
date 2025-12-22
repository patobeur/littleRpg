import * as THREE from 'three';
import { fadeModel } from './Utils.js';

export class NetworkManager {
    constructor(game) {
        this.game = game;
        this.socket = null;
        this.lastEmit = 0;
        this.disconnectTimers = new Map();
    }

    setupSockets() {
        if (typeof io === 'undefined') {
            console.error('Socket.io not found!');
            return;
        }

        this.socket = io();

        this.socket.on('player_updated', (data) => this.handlePlayerUpdated(data));
        this.socket.on('initial_states', (data) => this.handleInitialStates(data));
        this.socket.on('enemy_states', (data) => this.handleEnemyStates(data));
        this.socket.on('structure_states', (data) => this.handleStructureStates(data));
        this.socket.on('entity_update', (data) => this.handleEntityUpdate(data)); // New listener
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
        if (now - this.lastEmit > 50) { // 20Hz
            this.socket.emit('player_update', {
                characterId,
                position,
                rotation,
                animation,
                timeScale
            });
            this.lastEmit = now;
        }
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
