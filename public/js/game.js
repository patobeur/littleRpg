import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// Scene config is now received from server via Socket.io

class GameEngine {
    constructor() {
        this.container = document.getElementById('game-container');
        this.playersList = document.getElementById('players-ingame');
        this.players = [];
        this.models = new Map();
        this.mixers = [];
        this.clock = new THREE.Clock();
        this.localCharacterId = null;
        this.targetModel = null;
        this.playerData = new Map(); // Store { model, mixer, actions, currentActionName, targetPosition, ... }
        this.keys = {};
        this.socket = null;
        this.lastEmit = 0;
        this.mouse = { x: 0, y: 0 };
        this.cameraRotation = { yaw: 0, pitch: 0.5 }; // radians
        this.cameraDistance = 8;
        this.invertY = false; // Set to true to invert vertical look
        this.disconnectTimers = new Map(); // Track disconnection timers
        this.currentSceneId = 'scene_01'; // Current scene
        this.currentSceneConfig = null; // Scene config from server
        this.teleportZones = []; // Visual teleport zones
        this.myTeleportZone = null; // My assigned zone
        this.inMyZone = false; // Am I in my zone?

        this.init();
    }

    async init() {
        // Protect page
        await protectPage();

        this.setupSockets();

        // Load game data
        const gameDataStr = sessionStorage.getItem('gameData');
        if (!gameDataStr) {
            window.location.href = '/dashboard.html';
            return;
        }
        const gameData = JSON.parse(gameDataStr);
        this.players = gameData.players;

        this.setupScene();
        this.setupLights();
        this.setupGround();
        this.setupUI();

        // Identify local player
        const selectedChar = JSON.parse(sessionStorage.getItem('selectedCharacter'));
        if (selectedChar) {
            this.localCharacterId = selectedChar.id;
        }

        await this.loadPlayers();

        // Join game room ONLY AFTER players are loaded
        const lobbyCode = sessionStorage.getItem('lobbyCode');
        if (this.socket && lobbyCode && this.localCharacterId) {
            this.socket.emit('join_game', {
                code: lobbyCode,
                characterId: this.localCharacterId
            });
        }

        this.setupKeyboard();
        this.setupMouseLook();

        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 10, 15);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 5);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    setupGround() {
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({
            color: 0x242444,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(100, 50, 0x444466, 0x222233);
        grid.position.y = 0.01;
        this.scene.add(grid);

        // Create teleport zones
        this.createTeleportZones();
    }

    setupUI() {
        this.playersList.innerHTML = `
            <div id="loading-status" class="player-label" style="background: var(--color-accent-primary);">
                ⌛ Loading 3D Models...
            </div>
            ${this.players.map(p => `
                <div class="player-label">
                    <strong>${p.name}</strong> - ${getClassName(p.class)}
                </div>
            `).join('')}
        `;
    }

    async loadPlayers() {
        const loader = new FBXLoader();
        const spacing = 4;
        const startX = -(this.players.length - 1) * spacing / 2;

        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            const modelPath = `/archetypes/${player.class.toLowerCase()}.fbx`;

            try {
                console.log(`Loading model for ${player.name}: ${modelPath}`);
                const fbx = await new Promise((resolve, reject) => {
                    loader.load(modelPath, resolve, undefined, reject);
                });

                fbx.scale.setScalar(0.01); // Standard scaling for many FBX
                // Don't set position here - it will be set by initial_states or fallback
                fbx.position.set(0, 0, 0);
                fbx.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Start invisible - will be made visible once position is set
                fbx.visible = false;
                this.setModelOpacity(fbx, 0); // Start at 0 opacity

                this.scene.add(fbx);
                this.models.set(player.characterId, fbx);

                const mixer = new THREE.AnimationMixer(fbx);
                this.mixers.push(mixer);
                const actions = {};

                // 1. Setup Idle from base FBX
                if (fbx.animations && fbx.animations.length > 0) {
                    const idleClip = fbx.animations.find(clip =>
                        clip.name.toLowerCase().includes('idle') ||
                        clip.name.toLowerCase().includes('mixamo')
                    ) || fbx.animations[0];

                    actions['idle'] = mixer.clipAction(idleClip);
                }

                // 2. Load Walk animation
                const walkPath = `/archetypes/animations/${player.class.toLowerCase()}_Walk.fbx`;
                try {
                    const walkFbx = await new Promise((resolve, reject) => {
                        loader.load(walkPath, resolve, undefined, reject);
                    });
                    if (walkFbx.animations && walkFbx.animations.length > 0) {
                        const walkClip = walkFbx.animations[0];
                        actions['walk'] = mixer.clipAction(walkClip);
                    }
                } catch (err) {
                    console.warn(`No walk animation for ${player.class}`);
                }

                // Store player data with fallback spawn position
                this.playerData.set(player.characterId, {
                    model: fbx,
                    mixer: mixer,
                    actions: actions,
                    currentActionName: 'idle',
                    positionSet: false,
                    fallbackSpawn: { x: startX + i * spacing, y: 0, z: 0 } // Triangle formation
                });

                // Play idle by default
                if (actions['idle']) {
                    actions['idle'].play();
                }

                if (player.characterId === this.localCharacterId) {
                    this.targetModel = fbx;
                    this.setupMMORPGCamera();
                }

            } catch (error) {
                console.error(`Failed to load model for ${player.name}:`, error);
                // Fallback: simple box
                const geom = new THREE.BoxGeometry(1, 2, 1);
                const mat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6 });
                const cube = new THREE.Mesh(geom, mat);
                cube.position.set(startX + i * spacing, 1, 0);
                this.scene.add(cube);
            }
        }

        // Hide loading status
        const loadingStatus = document.getElementById('loading-status');
        if (loadingStatus) loadingStatus.style.display = 'none';
    }

    setupMMORPGCamera() {
        if (!this.targetModel || !this.controls) return;

        // Reset OrbitControls as we will drive camera ourselves for "Follow Mouse"
        this.controls.enabled = false;
    }

    createTeleportZones() {
        // Clear existing zones
        this.teleportZones.forEach(zone => {
            if (zone.mesh) this.scene.remove(zone.mesh);
            if (zone.ring) this.scene.remove(zone.ring);
        });
        this.teleportZones = [];

        // Use server-provided config instead of local SCENE_CONFIG
        if (!this.currentSceneConfig) {
            console.warn('[GameEngine] No scene config received from server yet');
            return;
        }

        this.currentSceneConfig.teleportZones.forEach(zoneConfig => {
            // Create glowing circle
            const geometry = new THREE.CircleGeometry(zoneConfig.radius, 32);
            const material = new THREE.MeshBasicMaterial({
                color: zoneConfig.color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.3
            });
            const circle = new THREE.Mesh(geometry, material);
            circle.position.set(zoneConfig.x, zoneConfig.y, zoneConfig.z);
            circle.rotation.x = -Math.PI / 2; // Horizontal

            // Add ring outline
            const ringGeometry = new THREE.RingGeometry(zoneConfig.radius - 0.1, zoneConfig.radius, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: zoneConfig.color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(zoneConfig.x, zoneConfig.y + 0.01, zoneConfig.z);
            ring.rotation.x = -Math.PI / 2;

            this.scene.add(circle);
            this.scene.add(ring);

            this.teleportZones.push({
                config: zoneConfig,
                mesh: circle,
                ring: ring,
                material: material,
                ringMaterial: ringMaterial
            });
        });
    }

    checkTeleportZones() {
        if (!this.targetModel || this.teleportZones.length === 0) return;

        // Get my class
        const selectedChar = JSON.parse(sessionStorage.getItem('selectedCharacter'));
        if (!selectedChar) return;

        const myClass = selectedChar.class;
        const myPos = this.targetModel.position;

        // Find my assigned zone
        if (!this.myTeleportZone) {
            this.myTeleportZone = this.teleportZones.find(z => z.config.class === myClass);
        }

        if (!this.myTeleportZone) return;

        // Calculate distance to my zone
        const zonePos = new THREE.Vector3(
            this.myTeleportZone.config.x,
            0,
            this.myTeleportZone.config.z
        );
        const distance = myPos.distanceTo(zonePos);
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

        // Emit events when entering/leaving
        if (this.inMyZone && !wasInZone) {
            console.log('Entered teleport zone!');
            if (this.socket) {
                this.socket.emit('player_entered_zone', { characterId: this.localCharacterId });
            }
        } else if (!this.inMyZone && wasInZone) {
            console.log('Left teleport zone');
            if (this.socket) {
                this.socket.emit('player_left_zone', { characterId: this.localCharacterId });
            }
        }
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    setupMouseLook() {
        this.container.addEventListener('click', () => {
            this.container.requestPointerLock();
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.container) {
                this.cameraRotation.yaw -= e.movementX * 0.003;

                const pitchDelta = e.movementY * 0.003;
                this.cameraRotation.pitch += this.invertY ? pitchDelta : -pitchDelta;

                // Limit pitch (allow going even lower)
                this.cameraRotation.pitch = Math.max(-0.4, Math.min(Math.PI / 2.1, this.cameraRotation.pitch));
            }
        });

        // Add zoom functionality
        window.addEventListener('wheel', (e) => {
            if (document.pointerLockElement === this.container) {
                const zoomSpeed = 0.5;
                if (e.deltaY > 0) {
                    this.cameraDistance += zoomSpeed;
                } else {
                    this.cameraDistance -= zoomSpeed;
                }

                // Limit distance
                this.cameraDistance = Math.max(2, Math.min(25, this.cameraDistance));
            }
        }, { passive: true });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setupSockets() {
        if (typeof io === 'undefined') {
            console.error('Socket.io not found!');
            return;
        }

        this.socket = io();

        this.socket.on('player_updated', (data) => {
            const pd = this.playerData.get(data.characterId);
            if (pd && data.characterId !== this.localCharacterId) {
                // console.log(`Syncing ${data.characterId}`);

                // Only use lerp interpolation AFTER initial position is set
                if (pd.positionSet) {
                    pd.targetPosition = new THREE.Vector3(data.position.x, data.position.y, data.position.z);
                    pd.targetRotation = data.rotation;
                } else {
                    // First update - set directly without lerp
                    pd.model.position.set(data.position.x, data.position.y, data.position.z);
                    pd.model.rotation.y = data.rotation;
                    pd.positionSet = true;
                }

                pd.targetAnimation = data.animation;
                pd.targetTimeScale = data.timeScale || 1;
            }
        });

        this.socket.on('initial_states', (data) => {
            data.states.forEach(state => {
                const pd = this.playerData.get(state.characterId);
                if (pd) {
                    // Cancel any pending disconnect timer (player reconnected)
                    if (this.disconnectTimers.has(state.characterId)) {
                        clearTimeout(this.disconnectTimers.get(state.characterId));
                        this.disconnectTimers.delete(state.characterId);
                        console.log(`Player ${state.characterId} reconnected, disconnect timer canceled`);

                        // Restore full opacity
                        this.fadeModel(pd.model, 1.0, 500);
                    }

                    // If player was marked as fully disconnected, revive them
                    if (pd.disconnected) {
                        console.log(`Player ${state.characterId} returned after timeout - reviving`);
                        pd.disconnected = false;
                        pd.model.visible = true;
                        this.fadeModel(pd.model, 1.0, 800);
                    }

                    pd.model.position.set(state.position.x, state.position.y, state.position.z);
                    pd.model.rotation.y = state.rotation;

                    // Don't use targetPosition for initial load - just set directly
                    // pd.targetPosition = new THREE.Vector3(state.position.x, state.position.y, state.position.z);
                    // pd.targetRotation = state.rotation;
                    pd.targetAnimation = state.animation;
                    pd.targetTimeScale = state.timeScale || 1;
                    pd.positionSet = true;
                    // Now that position is set, make model visible with fade in
                    pd.model.visible = true;
                    this.fadeModel(pd.model, 1.0, 800); // Fade in over 800ms

                    // If it's me, place me at my last known position
                    if (state.characterId === this.localCharacterId) {
                        this.targetModel.position.copy(pd.model.position);
                        this.targetModel.rotation.y = pd.model.rotation.y;

                        // Update camera to focus on new position immediately
                        this.updateCamera();
                    }
                }
            });

            // For any players without saved positions, use fallback spawn
            setTimeout(() => {
                this.playerData.forEach((pd, charId) => {
                    if (!pd.positionSet && pd.fallbackSpawn) {
                        console.log(`No DB position for ${charId}, using fallback spawn`);
                        pd.model.position.set(pd.fallbackSpawn.x, pd.fallbackSpawn.y, pd.fallbackSpawn.z);
                        pd.model.visible = true;
                        this.fadeModel(pd.model, 1.0, 800);
                        pd.positionSet = true;
                    }
                });
            }, 1000);
        });

        // Don't remove players during active game (they might just be refreshing)
        // this.socket.on('player_left', (data) => {
        //     const pd = this.playerData.get(data.playerId);
        //     if (pd) {
        //         this.scene.remove(pd.model);
        //         this.playerData.delete(data.playerId);
        //         this.mixers = this.mixers.filter(m => m !== pd.mixer);
        //         this.players = this.players.filter(p => p.id !== data.playerId);
        //         this.setupUI();
        //     }
        // });

        this.socket.on('player_disconnected', (data) => {
            console.log(`Player ${data.playerId} (char: ${data.characterId}) disconnected - will remove in 5 seconds if not reconnected`);

            if (!data.characterId) return;

            const pd = this.playerData.get(data.characterId);
            if (pd) {
                // Make player semi-transparent
                this.fadeModel(pd.model, 0.4, 500);
            }

            // Set a 5-second timer to remove the player
            const timer = setTimeout(() => {
                const pd = this.playerData.get(data.characterId);
                if (pd) {
                    console.log(`Player ${data.characterId} did not reconnect - hiding from scene`);
                    // Fade out and hide (but don't remove from scene - they might come back!)
                    this.fadeModel(pd.model, 0, 500);
                    setTimeout(() => {
                        pd.model.visible = false;
                        // Mark as disconnected but keep in playerData
                        pd.disconnected = true;
                    }, 500);
                }
                this.disconnectTimers.delete(data.characterId);
            }, 5000);

            this.disconnectTimers.set(data.characterId, timer);
        });

        this.socket.on('player_reconnected', (data) => {
            console.log(`Player ${data.name} (${data.characterId}) has reconnected!`);

            const pd = this.playerData.get(data.characterId);
            if (pd) {
                // Cancel any pending disconnect timer
                if (this.disconnectTimers.has(data.characterId)) {
                    clearTimeout(this.disconnectTimers.get(data.characterId));
                    this.disconnectTimers.delete(data.characterId);
                }

                // Always restore full opacity and visibility on reconnection
                pd.disconnected = false;
                if (!pd.model.visible) {
                    pd.model.visible = true;
                }
                // Restore opacity to 100% (even if they were just semi-transparent)
                this.fadeModel(pd.model, 1.0, 500);
            }
        });

        this.socket.on('teleport_countdown', (data) => {
            console.log(`🔮 Teleportation in ${data.timeLeft} seconds...`);
            // TODO: Show UI countdown
        });

        this.socket.on('teleport_canceled', () => {
            console.log('❌ Teleportation canceled');
            // TODO: Hide UI countdown
        });

        this.socket.on('scene_changed', (data) => {
            console.log(`🌍 Changing to ${data.sceneId}!`);
            this.handleSceneChange(data);
        });

        this.socket.on('scene_config', (data) => {
            console.log(`[GameEngine] Received scene config for ${data.sceneId}`);
            this.currentSceneId = data.sceneId;
            this.currentSceneConfig = data.config;

            // Recreate teleport zones with new config
            this.createTeleportZones();
        });

        this.socket.on('game_complete', () => {
            console.log('🎉 Game Complete!');
            alert('Félicitations ! Vous avez terminé toutes les scènes !');
            window.location.href = '/dashboard.html';
        });
    }

    handleSceneChange(data) {
        console.log(`[GameEngine] Handling scene change to `);

        // Update current scene
        this.currentSceneId = data.sceneId;
        sessionStorage.setItem('currentScene', data.sceneId);

        // Fade out all players
        this.playerData.forEach((pd, charId) => {
            this.fadeModel(pd.model, 0, 500);
        });

        // After fade out, apply new positions and recreate zones
        setTimeout(() => {
            // Apply spawn positions from server
            if (data.spawns) {
                this.playerData.forEach((pd, charId) => {
                    const spawn = data.spawns[charId];
                    if (spawn) {
                        pd.model.position.set(spawn.x, spawn.y, spawn.z);
                        pd.model.rotation.y = 0;
                        pd.positionSet = true;
                        pd.disconnected = false;

                        // Make visible and fade in
                        pd.model.visible = true;
                        this.fadeModel(pd.model, 1.0, 800);

                        console.log(`[GameEngine] Spawned ${charId} at (${spawn.x}, ${spawn.y}, ${spawn.z})`);
                    }
                });
            }

            // Update scene config from server
            if (data.config) {
                this.currentSceneConfig = data.config;
            }

            // Clear and recreate teleport zones
            this.myTeleportZone = null;
            this.inMyZone = false;
            this.createTeleportZones();

            console.log('[GameEngine] Scene change complete!');
        }, 500);
    }

    // Utility: Set model opacity (requires enabling transparency on materials)
    setModelOpacity(model, opacity) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                // Enable transparency if not already enabled
                if (!child.material.transparent) {
                    child.material.transparent = true;
                    child.material.needsUpdate = true;
                }
                child.material.opacity = opacity;
            }
        });
    }

    // Utility: Animate model opacity over time
    fadeModel(model, targetOpacity, duration = 1000) {
        const startOpacity = this.getModelOpacity(model);
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentOpacity = startOpacity + (targetOpacity - startOpacity) * progress;

            this.setModelOpacity(model, currentOpacity);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    // Get current model opacity
    getModelOpacity(model) {
        let opacity = 1;
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                opacity = child.material.opacity || 1;
                return; // Just get the first mesh's opacity
            }
        });
        return opacity;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        this.mixers.forEach(mixer => mixer.update(delta));

        // Update local movement
        if (this.targetModel && document.pointerLockElement === this.container) {
            this.handlePlayerMovement(delta);
        }

        // Update remote players (interpolation)
        this.playerData.forEach((pd, charId) => {
            if (charId !== this.localCharacterId && pd.positionSet) {
                if (pd.targetPosition) {
                    pd.model.position.lerp(pd.targetPosition, 0.2);
                }
                if (pd.targetRotation !== undefined) {
                    // Angular lerp (approximate)
                    pd.model.rotation.y = THREE.MathUtils.lerp(pd.model.rotation.y, pd.targetRotation, 0.2);
                }
                if (pd.targetAnimation) {
                    this.fadeToAction(charId, pd.targetAnimation, 0.2, pd.targetTimeScale || 1);
                }
            }
        });

        // Check teleport zones
        if (this.targetModel) {
            this.checkTeleportZones();
        }

        // Emit local update
        if (this.targetModel && this.socket) {
            const data = this.playerData.get(this.localCharacterId);
            const now = Date.now();
            if (now - this.lastEmit > 50) { // 20Hz
                this.socket.emit('player_update', {
                    characterId: this.localCharacterId,
                    position: {
                        x: this.targetModel.position.x,
                        y: this.targetModel.position.y,
                        z: this.targetModel.position.z
                    },
                    rotation: this.targetModel.rotation.y,
                    animation: data?.currentActionName || 'idle',
                    timeScale: data?.currentTimeScale || 1
                });
                this.lastEmit = now;
            }
        }

        this.updateCamera();

        this.renderer.render(this.scene, this.camera);
    }

    handlePlayerMovement(delta) {
        const moveSpeed = 2 * delta;
        const rotateSpeed = 0.1;

        // Move relative to camera yaw
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.yaw);

        let moveX = 0;
        let moveZ = 0;

        if (this.keys['z'] || this.keys['w']) { moveX += forward.x; moveZ += forward.z; }
        if (this.keys['s']) { moveX -= forward.x; moveZ -= forward.z; }
        if (this.keys['q'] || this.keys['a']) { moveX -= right.x; moveZ -= right.z; }
        if (this.keys['d']) { moveX += right.x; moveZ += right.z; }

        const data = this.playerData.get(this.localCharacterId);
        let isMoving = false;

        if (moveX !== 0 || moveZ !== 0) {
            const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize().multiplyScalar(moveSpeed);
            this.targetModel.position.add(moveVec);

            // Character faces the camera direction (MMORPG style)
            this.targetModel.rotation.y = this.cameraRotation.yaw + Math.PI;
            isMoving = true;
        }

        // Update animation
        if (data) {
            const isBackward = (this.keys['s']) && !(this.keys['z'] || this.keys['w']);
            const nextAction = isMoving ? 'walk' : 'idle';
            const timeScale = isBackward ? -1 : 1;
            this.fadeToAction(this.localCharacterId, nextAction, 0.2, timeScale);
        }
    }

    fadeToAction(characterId, name, duration = 0.2, timeScale = 1) {
        const data = this.playerData.get(characterId);
        if (!data || !data.actions[name]) return;

        // If it's the same action, just update timeScale
        if (data.currentActionName === name) {
            data.actions[name].setEffectiveTimeScale(timeScale);
            data.currentTimeScale = timeScale;
            return;
        }

        const currentAction = data.actions[data.currentActionName];
        const nextAction = data.actions[name];

        if (currentAction) currentAction.fadeOut(duration);

        nextAction
            .reset()
            .setEffectiveTimeScale(timeScale)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();

        data.currentActionName = name;
        data.currentTimeScale = timeScale;
    }

    updateCamera() {
        if (!this.targetModel) return;

        // Calculate camera position based on yaw, pitch and distance
        const x = this.targetModel.position.x + this.cameraDistance * Math.sin(this.cameraRotation.yaw) * Math.cos(this.cameraRotation.pitch);
        const y = this.targetModel.position.y + this.cameraDistance * Math.sin(this.cameraRotation.pitch) + 1.5; // Look slightly above ground
        const z = this.targetModel.position.z + this.cameraDistance * Math.cos(this.cameraRotation.yaw) * Math.cos(this.cameraRotation.pitch);

        this.camera.position.set(x, y, z);

        // Target is slightly above character center
        const targetPoint = new THREE.Vector3(
            this.targetModel.position.x,
            this.targetModel.position.y + 1.2,
            this.targetModel.position.z
        );
        this.camera.lookAt(targetPoint);
    }
}

function getClassName(charClass) {
    switch (charClass) {
        case 'Warrior': return 'Guerrier';
        case 'Mage': return 'Mage';
        case 'Healer': return 'Soigneur';
        default: return charClass;
    }
}

// Start the game engine
new GameEngine();
