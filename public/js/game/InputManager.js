import * as THREE from 'three';

export class InputManager {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.mouse = { x: 0, y: 0 };

        // Camera control params
        this.cameraRotation = { yaw: 0, pitch: 0.5 }; // radians
        this.cameraDistance = 8;
        this.invertY = false;

        this.init();
    }

    init() {
        this.setupKeyboard();
        this.setupMouseLook();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    }

    setupMouseLook() {
        // We need the container to exist
        if (!this.game.container) return;

        this.game.container.addEventListener('click', () => {
            this.game.container.requestPointerLock();
        });

        // Attack Listener
        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === this.game.container && e.button === 0) {
                this.handleAttack();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.game.container) {
                this.cameraRotation.yaw -= e.movementX * 0.003;

                const pitchDelta = e.movementY * 0.003;
                this.cameraRotation.pitch += this.invertY ? pitchDelta : -pitchDelta;

                // Limit pitch
                this.cameraRotation.pitch = Math.max(-0.4, Math.min(Math.PI / 2.1, this.cameraRotation.pitch));
            }
        });

        // Add zoom functionality
        window.addEventListener('wheel', (e) => {
            if (document.pointerLockElement === this.game.container) {
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

    updateCamera(targetModel, camera) {
        if (!targetModel || !camera) return;

        // Calculate camera position based on yaw, pitch and distance
        const x = targetModel.position.x + this.cameraDistance * Math.sin(this.cameraRotation.yaw) * Math.cos(this.cameraRotation.pitch);
        const y = targetModel.position.y + this.cameraDistance * Math.sin(this.cameraRotation.pitch) + 1.5; // Look slightly above ground
        const z = targetModel.position.z + this.cameraDistance * Math.cos(this.cameraRotation.yaw) * Math.cos(this.cameraRotation.pitch);

        camera.position.set(x, y, z);

        // Target is slightly above character center
        const targetPoint = new THREE.Vector3(
            targetModel.position.x,
            targetModel.position.y + 1.2,
            targetModel.position.z
        );
        camera.lookAt(targetPoint);
    }

    handlePlayerMovement(delta, targetModel) {
        if (!targetModel) return false;

        const moveSpeed = 6 * delta; // Increased speed for better feeling
        // const rotateSpeed = 0.1;

        // Move relative to camera yaw
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotation.yaw);

        let moveX = 0;
        let moveZ = 0;

        if (this.keys['z'] || this.keys['w']) { moveX += forward.x; moveZ += forward.z; }
        if (this.keys['s']) { moveX -= forward.x; moveZ -= forward.z; }
        if (this.keys['q'] || this.keys['a']) { moveX -= right.x; moveZ -= right.z; }
        if (this.keys['d']) { moveX += right.x; moveZ += right.z; }

        let isMoving = false;

        if (moveX !== 0 || moveZ !== 0) {
            const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize().multiplyScalar(moveSpeed);

            // Propose new position
            const proposedPosition = targetModel.position.clone().add(moveVec);

            // Get local player radius
            const myData = this.game.entityManager.playerData.get(this.game.localCharacterId);
            const myRadius = myData ? (myData.radius || 0.3) : 0.3;

            // Check Collision
            if (this.game.collisionManager.isValidPosition(proposedPosition, myRadius)) {
                targetModel.position.copy(proposedPosition);
            } else {
                // Sliding Logic (Simplified): Try moving in X only, then Z only
                const proposedX = targetModel.position.clone().add(new THREE.Vector3(moveVec.x, 0, 0));
                if (this.game.collisionManager.isValidPosition(proposedX, myRadius)) {
                    targetModel.position.copy(proposedX);
                } else {
                    const proposedZ = targetModel.position.clone().add(new THREE.Vector3(0, 0, moveVec.z));
                    if (this.game.collisionManager.isValidPosition(proposedZ, myRadius)) {
                        targetModel.position.copy(proposedZ);
                    }
                }
            }

            // Character faces the camera direction (MMORPG style) usually acts differently if moving backwards?
            // Simple approach: face movement direction if desired, or face camera yaw if strafing?
            // Current code in game.js: targetModel.rotation.y = this.cameraRotation.yaw + Math.PI;
            // It forces character to look away from camera (forward).
            targetModel.rotation.y = this.cameraRotation.yaw + Math.PI;
            isMoving = true;
        }

        return isMoving;
    }

    handleAttack() {
        // Raycast from center of screen
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.game.sceneManager.camera);

        // Check intersections with Enemies
        const enemies = Array.from(this.game.entityManager.enemies.values()).map(e => e.model).filter(m => m);
        const intersects = raycaster.intersectObjects(enemies, true);

        if (intersects.length > 0) {
            // Find which enemy holds this mesh
            let hitObject = intersects[0].object;
            // Traverse up to find root
            while (hitObject.parent && hitObject.parent.type !== 'Scene') {
                hitObject = hitObject.parent;
            }

            // Find enemy ID
            for (const [id, enemy] of this.game.entityManager.enemies) {
                if (enemy.model === hitObject) {
                    console.log('Attacking enemy:', enemy.name);

                    // Client-Side Range Check (Optional but good feedback)
                    const playerPos = this.game.entityManager.targetModel.position;
                    const dist = playerPos.distanceTo(enemy.model.position);

                    // Simple animation trigger (if exists)
                    // this.game.entityManager.playAction(this.game.localCharacterId, 'attack');

                    this.game.networkManager.emitPlayerAttack(id);
                    break;
                }
            }
        }
    }
}
