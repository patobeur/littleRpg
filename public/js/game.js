import * as THREE from 'three';
import { SceneManager } from './game/SceneManager.js';
import { NetworkManager } from './game/NetworkManager.js';
import { EntityManager } from './game/EntityManager.js';
import { InputManager } from './game/InputManager.js';
import { UIManager } from './game/ui/UIManager.js';
import { CollisionManager } from './game/CollisionManager.js';
import { ChatManager } from './game/chat/ChatManager.js';
import { SettingsModal } from './game/settings/SettingsModal.js';
import { CameraManager } from './game/camera/CameraManager.js';
import { ThirdPersonCameraMode } from './game/camera/ThirdPersonCameraMode.js';
import { TopDownCameraMode } from './game/camera/TopDownCameraMode.js';
import { IsometricCameraMode } from './game/camera/IsometricCameraMode.js';
import { fadeModel } from './game/Utils.js';

class GameEngine {
    constructor() {
        this.container = document.getElementById('game-container');
        this.clock = new THREE.Clock();

        // Managers
        this.sceneManager = new SceneManager(this);
        this.networkManager = new NetworkManager(this);
        this.entityManager = new EntityManager(this);
        this.collisionManager = new CollisionManager(this); // Init Collision
        this.inputManager = new InputManager(this);
        this.uiManager = new UIManager(this);
        this.chatManager = new ChatManager(this); // Init Chat
        this.settingsModal = new SettingsModal(this); // Init Settings

        // Camera System
        this.cameraManager = new CameraManager(this);
        this.cameraManager.registerMode(new ThirdPersonCameraMode(this));
        this.cameraManager.registerMode(new TopDownCameraMode(this));
        this.cameraManager.registerMode(new IsometricCameraMode(this));
        this.cameraManager.setMode('third-person'); // Mode par défaut

        // State
        this.currentSceneId = 'scene_01';
        this.currentSceneConfig = null;
        this.localCharacterId = null;

        // Teleport logic
        this.myTeleportZone = null;
        this.inMyZone = false;

        // Performance optimization: Throttle timers (INP improvement)
        this.lastNetworkUpdate = 0;
        this.networkUpdateInterval = 50; // 20 updates/second instead of 60
        this.lastHUDUpdate = -1000; // Force immediate first update
        this.hudUpdateInterval = 100; // 10 updates/second instead of 60

        this.init();
    }

    async init() {
        // Protect page
        if (typeof protectPage !== 'undefined') await protectPage();

        // Check if game data exists
        const gameDataStr = sessionStorage.getItem('gameData');
        if (!gameDataStr) {
            window.location.href = '/dashboard.html';
            return;
        }
        const gameData = JSON.parse(gameDataStr);

        // Identify local player
        const selectedChar = JSON.parse(sessionStorage.getItem('selectedCharacter'));
        if (selectedChar) {
            this.localCharacterId = selectedChar.id;
        }

        // Init Managers
        this.sceneManager.init();
        this.networkManager.setupSockets();

        // Load Entities FIRST (sets localCharacterId in EntityManager)
        await this.entityManager.loadPlayers(gameData.players, this.localCharacterId);

        // THEN setup UI (now EntityManager.localCharacterId is available)
        this.uiManager.setupUI(gameData.players);

        // Join Game
        const lobbyCode = sessionStorage.getItem('lobbyCode');
        this.networkManager.joinGame(lobbyCode, this.localCharacterId);

        // Initial Location UI Update
        const lobbyData = JSON.parse(sessionStorage.getItem('currentLobby'));
        const scenarioName = lobbyData ? lobbyData.scenarioName : 'Unknown Adventure';
        const startSceneId = sessionStorage.getItem('currentScene') || 'scene_01'; // Fallback
        // Typically scene config comes via network, but we might have initial one
        // We'll update map name when scene_config event arrives preferably
        this.uiManager.updateLocation(scenarioName, 'Loading...');

        this.uiManager.hideLoading();

        // Initialiser le chat en jeu
        this.chatManager.init();

        // Initialiser la modal de paramètres
        this.settingsModal.init();
        // Appliquer les paramètres sauvegardés
        this.settingsModal.applySettings();

        // Resize handler
        window.addEventListener('resize', () => this.sceneManager.onWindowResize());

        // Start Loop
        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const now = performance.now();

        // Update Entities (Animations, Interpolation)
        this.entityManager.update(delta);

        // Local Player Logic
        const targetModel = this.entityManager.targetModel;
        if (targetModel) {
            // Movement géré par le mode de caméra actif
            const isMoving = this.cameraManager.handlePlayerMovement(delta, targetModel);

            // Animation update
            const data = this.entityManager.playerData.get(this.localCharacterId);
            if (data) {
                const isBackward = (this.inputManager.keys['s']) && !(this.inputManager.keys['z'] || this.inputManager.keys['w']);
                const nextAction = isMoving ? 'walk' : 'idle';
                const timeScale = isBackward ? -1 : 1;
                this.entityManager.fadeToAction(this.localCharacterId, nextAction, 0.2, timeScale);
            }

            // Camera update via CameraManager
            this.cameraManager.update(delta, targetModel, this.sceneManager.camera);

            // Throttled network update (INP optimization: 20 FPS instead of 60)
            if (now - this.lastNetworkUpdate >= this.networkUpdateInterval) {
                this.networkManager.emitPlayerUpdate(
                    this.localCharacterId,
                    targetModel.position,
                    targetModel.rotation.y,
                    this.entityManager.playerData.get(this.localCharacterId)?.currentActionName || 'idle',
                    this.entityManager.playerData.get(this.localCharacterId)?.currentTimeScale || 1
                );
                this.lastNetworkUpdate = now;
            }
        }

        // Throttled HUD updates (INP optimization: 10 FPS instead of 60)
        if (now - this.lastHUDUpdate >= this.hudUpdateInterval) {
            this.entityManager.updateHUDPositions(this.sceneManager.camera);
            this.lastHUDUpdate = now;
        }

        // Teleport Logic
        this.checkTeleportZones();

        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    }

    updateSceneConfig(data) {
        this.currentSceneId = data.sceneId;
        this.currentSceneConfig = data.config;

        // Apply Ambiance
        if (data.config.scene) {
            this.sceneManager.updateAmbiance(data.config.scene);
        }

        // Update map bounds for collision
        if (data.config.mapSize) {
            this.collisionManager.setMapBounds(data.config.mapSize);
        }

        this.sceneManager.createSpawnMarkers(data.config.spawns);
        this.sceneManager.createTeleportZones(data.config.teleportZones);
        this.sceneManager.createRoads(data.config.roads);
        this.sceneManager.createRoads(data.config.roads);
        this.sceneManager.createTrees(data.config.trees);

        // Update UI
        const lobbyData = JSON.parse(sessionStorage.getItem('currentLobby'));
        const scenarioName = lobbyData ? lobbyData.scenarioName : '';
        this.uiManager.updateLocation(scenarioName, data.config.name);
    }

    handleSceneChange(data) {
        // Update current scene
        this.currentSceneId = data.sceneId;
        sessionStorage.setItem('currentScene', data.sceneId);

        // Fade out all players
        this.entityManager.playerData.forEach((pd, charId) => {
            fadeModel(pd.model, 0, 500);
        });

        // After fade out, apply new positions and recreate zones
        setTimeout(() => {
            // Apply spawn positions from server
            if (data.spawns) {
                this.entityManager.playerData.forEach((pd, charId) => {
                    const spawn = data.spawns[charId];
                    if (spawn) {
                        pd.model.position.set(spawn.x, spawn.y, spawn.z);
                        pd.model.rotation.y = 0;
                        pd.positionSet = true;
                        pd.disconnected = false;

                        // Make visible and fade in
                        pd.model.visible = true;
                        fadeModel(pd.model, 1.0, 800);
                    }
                });
            }

            if (data.config) {
                this.updateSceneConfig({ sceneId: data.sceneId, config: data.config });
            }

            // Load enemies for the new scene
            if (data.enemies) {
                this.entityManager.loadEnemies(data.enemies);
            }

            // Load structures for the new scene
            if (data.structures) {
                this.entityManager.loadStructures(data.structures);
            }

            // Clear my zone state
            this.myTeleportZone = null;
            this.inMyZone = false;

        }, 500);
    }

    checkTeleportZones() {
        const targetModel = this.entityManager.targetModel;
        const zones = this.sceneManager.teleportZones;

        if (!targetModel || zones.length === 0) return;

        const selectedChar = JSON.parse(sessionStorage.getItem('selectedCharacter'));
        if (!selectedChar) return;

        if (!this.myTeleportZone) {
            // Get player index from lobby data
            const lobbyData = JSON.parse(sessionStorage.getItem('currentLobby'));
            if (!lobbyData || !lobbyData.players) return;

            // Find this player's index in the lobby (1-based)
            const playerIndex = lobbyData.players.findIndex(p => p.characterId === selectedChar.id);
            if (playerIndex === -1) return;

            const myIndex = playerIndex + 1; // Convert to 1-based index

            // Find teleport zone by index instead of class
            this.myTeleportZone = zones.find(z => z.config.index === myIndex);
        }
        if (!this.myTeleportZone) return;

        const zonePos = new THREE.Vector3(
            this.myTeleportZone.config.x,
            0,
            this.myTeleportZone.config.z
        );
        const distance = targetModel.position.distanceTo(zonePos);
        const wasInZone = this.inMyZone;
        this.inMyZone = distance < this.myTeleportZone.config.radius;

        // Visual feedback
        if (this.inMyZone) {
            this.myTeleportZone.material.opacity = 0.6;
            this.myTeleportZone.ringMaterial.opacity = 1.0;
        } else {
            this.myTeleportZone.material.opacity = 0.3;
            this.myTeleportZone.ringMaterial.opacity = 0.8;
        }

        // Emit events
        if (this.inMyZone && !wasInZone) {
            this.networkManager.emitEnterZone(this.localCharacterId);
        } else if (!this.inMyZone && wasInZone) {
            this.networkManager.emitLeftZone(this.localCharacterId);
        }
    }
}

// Initialize game and expose globally for console access
const gameInstance = new GameEngine();
window.game = gameInstance; // Allows: game.networkManager.monitor.report()
