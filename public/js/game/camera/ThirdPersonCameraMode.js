/**
 * ThirdPersonCameraMode - Mode caméra à la troisième personne
 * Vue derrière le joueur avec contrôle souris (yaw/pitch) et zoom
 * C'est le mode actuel du jeu, migré depuis InputManager
 */

import * as THREE from 'three';
import { CameraMode } from './CameraMode.js';

export class ThirdPersonCameraMode extends CameraMode {
    constructor(gameEngine) {
        super(gameEngine);

        // Paramètres de la caméra
        this.cameraRotation = { yaw: 0, pitch: 0.5 }; // radians
        this.cameraDistance = 8; // Distance de la caméra
        this.invertY = true; // Inverser l'axe Y de la souris

        // Limites
        this.minDistance = 2;
        this.maxDistance = 25;
        this.minPitch = -0.4;
        this.maxPitch = Math.PI / 2.1;

        // Sensibilité
        this.mouseSensitivity = 0.003;
        this.zoomSpeed = 0.5;

        // Event handlers (pour pouvoir les remove plus tard)
        this.mouseMoveHandler = null;
        this.wheelHandler = null;
        this.clickHandler = null;
    }

    getName() {
        return 'third-person';
    }

    getDescription() {
        return 'Vue derrière le joueur • Souris pour tourner';
    }

    requiresPointerLock() {
        return true;
    }

    /**
     * Initialisation du mode
     */
    init() {
        // Créer les handlers d'événements
        this.mouseMoveHandler = (e) => this.onMouseMove(e);
        this.wheelHandler = (e) => this.onWheel(e);
        this.clickHandler = () => this.onContainerClick();
    }

    /**
     * Appelé lors de l'activation du mode
     */
    onActivate() {
        super.onActivate();

        // Activer le pointer lock
        const container = this.gameEngine.container;
        if (container) {
            container.addEventListener('click', this.clickHandler);
        }

        // Ajouter les event listeners
        document.addEventListener('mousemove', this.mouseMoveHandler);
        window.addEventListener('wheel', this.wheelHandler, { passive: true });

        // Charger la sensibilité depuis les paramètres si disponible
        if (this.gameEngine.settingsModal) {
            const settings = this.gameEngine.settingsModal.settings;
            if (settings.mouseSensitivity !== undefined) {
                this.mouseSensitivity = 0.003 * settings.mouseSensitivity;
            }
            if (settings.invertMouseY !== undefined) {
                this.invertY = settings.invertMouseY;
            }
        }
    }

    /**
     * Appelé lors de la désactivation du mode
     */
    onDeactivate() {
        super.onDeactivate();

        // Retirer les event listeners
        document.removeEventListener('mousemove', this.mouseMoveHandler);
        window.removeEventListener('wheel', this.wheelHandler);

        const container = this.gameEngine.container;
        if (container) {
            container.removeEventListener('click', this.clickHandler);
        }
    }

    /**
     * Clic sur le conteneur du jeu → demander le pointer lock
     */
    onContainerClick() {
        const container = this.gameEngine.container;
        if (container && document.pointerLockElement !== container) {
            container.requestPointerLock();
        }
    }

    /**
     * Mouvement de la souris → rotation de la caméra
     */
    onMouseMove(e) {
        if (document.pointerLockElement === this.gameEngine.container) {
            // Rotation horizontale (yaw)
            this.cameraRotation.yaw -= e.movementX * this.mouseSensitivity;

            // Rotation verticale (pitch)
            const pitchDelta = e.movementY * this.mouseSensitivity;
            this.cameraRotation.pitch += this.invertY ? pitchDelta : -pitchDelta;

            // Limiter le pitch pour éviter le retournement
            this.cameraRotation.pitch = Math.max(
                this.minPitch,
                Math.min(this.maxPitch, this.cameraRotation.pitch)
            );
        }
    }

    /**
     * Molette de la souris → zoom
     */
    onWheel(e) {
        if (document.pointerLockElement === this.gameEngine.container) {
            if (e.deltaY > 0) {
                this.cameraDistance += this.zoomSpeed;
            } else {
                this.cameraDistance -= this.zoomSpeed;
            }

            // Limiter la distance
            this.cameraDistance = Math.max(
                this.minDistance,
                Math.min(this.maxDistance, this.cameraDistance)
            );
        }
    }

    /**
     * Mise à jour de la caméra (chaque frame)
     */
    update(delta, targetModel, camera) {
        if (!targetModel || !camera) return;

        // Calculer la position de la caméra basée sur yaw, pitch et distance
        const x = targetModel.position.x +
            this.cameraDistance * Math.sin(this.cameraRotation.yaw) * Math.cos(this.cameraRotation.pitch);

        const y = targetModel.position.y +
            this.cameraDistance * Math.sin(this.cameraRotation.pitch) + 1.5; // Légèrement au-dessus du sol

        const z = targetModel.position.z +
            this.cameraDistance * Math.cos(this.cameraRotation.yaw) * Math.cos(this.cameraRotation.pitch);

        camera.position.set(x, y, z);

        // La caméra regarde légèrement au-dessus du centre du personnage
        const targetPoint = new THREE.Vector3(
            targetModel.position.x,
            targetModel.position.y + 1.2,
            targetModel.position.z
        );
        camera.lookAt(targetPoint);
    }

    /**
     * Gestion des inputs (non utilisé dans ce mode, géré par InputManager)
     */
    handleInput(inputManager) {
        // Ce mode utilise les événements directs, pas besoin de handleInput
    }

    /**
     * Gestion du déplacement du joueur (ZQSD relatif à la caméra)
     */
    handlePlayerMovement(delta, targetModel) {
        const inputManager = this.gameEngine.inputManager;

        // Ne pas bouger si le chat est actif
        if (inputManager.chatActive) return false;
        if (!targetModel) return false;

        const moveSpeed = 6 * delta;

        // Déplacement relatif au yaw de la caméra
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            this.cameraRotation.yaw
        );
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            this.cameraRotation.yaw
        );

        let moveX = 0;
        let moveZ = 0;

        // Inputs de mouvement
        if (inputManager.keys['z'] || inputManager.keys['w']) {
            moveX += forward.x;
            moveZ += forward.z;
        }
        if (inputManager.keys['s']) {
            moveX -= forward.x;
            moveZ -= forward.z;
        }
        if (inputManager.keys['q'] || inputManager.keys['a']) {
            moveX -= right.x;
            moveZ -= right.z;
        }
        if (inputManager.keys['d']) {
            moveX += right.x;
            moveZ += right.z;
        }

        let isMoving = false;

        if (moveX !== 0 || moveZ !== 0) {
            const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize().multiplyScalar(moveSpeed);

            // Proposer nouvelle position
            const proposedPosition = targetModel.position.clone().add(moveVec);

            // Vérifier collision
            const myRadius = inputManager.cachedPlayerRadius || 0.3;

            if (this.gameEngine.collisionManager.isValidPosition(proposedPosition, myRadius)) {
                targetModel.position.copy(proposedPosition);
            } else {
                // Logique de glissement (essayer X puis Z séparément)
                const proposedX = targetModel.position.clone().add(new THREE.Vector3(moveVec.x, 0, 0));
                if (this.gameEngine.collisionManager.isValidPosition(proposedX, myRadius)) {
                    targetModel.position.copy(proposedX);
                } else {
                    const proposedZ = targetModel.position.clone().add(new THREE.Vector3(0, 0, moveVec.z));
                    if (this.gameEngine.collisionManager.isValidPosition(proposedZ, myRadius)) {
                        targetModel.position.copy(proposedZ);
                    }
                }
            }

            // Le personnage regarde dans la direction de la caméra
            targetModel.rotation.y = this.cameraRotation.yaw + Math.PI;
            isMoving = true;
        }

        return isMoving;
    }

    /**
     * Obtient le yaw actuel de la caméra (pour compatibilité avec InputManager)
     */
    getCameraYaw() {
        return this.cameraRotation.yaw;
    }

    /**
     * Obtient le pitch actuel de la caméra
     */
    getCameraPitch() {
        return this.cameraRotation.pitch;
    }
}
