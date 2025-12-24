import * as THREE from 'three';
import { SceneManager } from './game/SceneManager.js';
import { NetworkManager } from './game/NetworkManager.js';
import { EntityManager } from './game/EntityManager.js';
import { InputManager } from './game/InputManager.js';
import { UIManager } from './game/UIManager.js';
import { CollisionManager } from './game/CollisionManager.js';
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

        // State
        this.currentSceneId = 'scene_01';
        this.currentSceneConfig = null;
        this.localCharacterId = null;

        // Teleport logic
        this.myTeleportZone = null;
        this.inMyZone = false;

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
        this.uiManager.setupUI(gameData.players);

        // Load Entities
        await this.entityManager.loadPlayers(gameData.players, this.localCharacterId);

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

        // Resize handler
        window.addEventListener('resize', () => this.sceneManager.onWindowResize());

        // Start Loop
        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // Update Entities (Animations, Interpolation)
        this.entityManager.update(delta);

        // Local Player Logic
        const targetModel = this.entityManager.targetModel;
        if (targetModel) {
            // Movement
            if (document.pointerLockElement === this.container) {
                const isMoving = this.inputManager.handlePlayerMovement(delta, targetModel);

                // Animation update
                const data = this.entityManager.playerData.get(this.localCharacterId);
                if (data) {
                    const isBackward = (this.inputManager.keys['s']) && !(this.inputManager.keys['z'] || this.inputManager.keys['w']);
                    const nextAction = isMoving ? 'walk' : 'idle';
                    const timeScale = isBackward ? -1 : 1;
                    this.entityManager.fadeToAction(this.localCharacterId, nextAction, 0.2, timeScale);
                }

                // Camera update
                this.inputManager.updateCamera(targetModel, this.sceneManager.camera);

                // Emit update
                this.networkManager.emitPlayerUpdate(
                    this.localCharacterId,
                    targetModel.position,
                    targetModel.rotation.y,
                    this.entityManager.playerData.get(this.localCharacterId)?.currentActionName || 'idle',
                    this.entityManager.playerData.get(this.localCharacterId)?.currentTimeScale || 1
                );
            }
        }

        // Update HUDs
        this.entityManager.updateHUDPositions(this.sceneManager.camera);

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
        const myClass = selectedChar.class;

        if (!this.myTeleportZone) {
            this.myTeleportZone = zones.find(z => z.config.class === myClass);
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

new GameEngine();
