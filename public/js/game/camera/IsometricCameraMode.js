/**
 * IsometricCameraMode - Mode caméra isométrique
 * Vue à 45° (style Diablo, Age of Empires, Path of Exile)
 * Déplacement au clic + rotation optionnelle de la caméra
 */

import * as THREE from 'three';
import { CameraMode } from './CameraMode.js';

export class IsometricCameraMode extends CameraMode {
    constructor(gameEngine) {
        super(gameEngine);

        // Paramètres de la caméra
        this.cameraDistance = 20; // Distance de la caméra
        this.cameraHeight = 15; // Hauteur
        this.cameraAngle = Math.PI / 4; // 45 degrés
        this.cameraRotation = 0; // Rotation autour du joueur (0 = Nord)

        // Limites de zoom
        this.minDistance = 0.5; // Zoom proche
        this.maxDistance = 35;
        this.zoomSpeed = 1.5;

        // Rotation de la caméra (optionnel)
        this.canRotate = true;
        this.rotationSpeed = Math.PI / 4; // 45° par clic (4 directions fixes)

        // Déplacement au clic
        this.targetPosition = null;
        this.isMovingToTarget = false;
        this.moveSpeed = 6;
        this.arrivedThreshold = 0.5;

        // Raycaster pour détecter le clic sur le sol
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Event handlers
        this.clickHandler = null;
        this.mouseMoveHandler = null;
        this.wheelHandler = null;
        this.keyHandler = null;

        // Marqueur visuel
        this.targetMarker = null;
    }

    getName() {
        return 'isometric';
    }

    getDescription() {
        return 'Vue isométrique 45° • Clic ou Q/E pour tourner';
    }

    requiresPointerLock() {
        return false;
    }

    /**
     * Initialisation du mode
     */
    init() {
        // Créer les handlers
        this.clickHandler = (e) => this.onMouseClick(e);
        this.mouseMoveHandler = (e) => this.onMouseMove(e);
        this.wheelHandler = (e) => this.onWheel(e);
        this.keyHandler = (e) => this.onKeyPress(e);

        // Créer le marqueur de destination
        this.createTargetMarker();
    }

    /**
     * Créer un marqueur visuel pour la destination
     */
    createTargetMarker() {
        const geometry = new THREE.RingGeometry(0.3, 0.5, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x3b82f6, // Bleu
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });

        this.targetMarker = new THREE.Mesh(geometry, material);
        this.targetMarker.rotation.x = -Math.PI / 2;
        this.targetMarker.visible = false;
    }

    /**
     * Activation du mode
     */
    onActivate() {
        super.onActivate();

        console.log('[IsometricCameraMode] 🎮 Activation du mode...');

        // Event listeners
        window.addEventListener('click', this.clickHandler);
        window.addEventListener('mousemove', this.mouseMoveHandler);
        window.addEventListener('wheel', this.wheelHandler, { passive: true });
        window.addEventListener('keydown', this.keyHandler);

        console.log('[IsometricCameraMode] ✅ Event listeners attachés');

        // Ajouter le marqueur
        if (this.targetMarker && this.gameEngine.sceneManager) {
            this.gameEngine.sceneManager.scene.add(this.targetMarker);
            console.log('[IsometricCameraMode] ✅ Marqueur ajouté');
        }

        // Libérer pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
            console.log('[IsometricCameraMode] 🔓 Pointer lock libéré');
        }

        console.log('[IsometricCameraMode] 💡 Cliquez pour bouger • Q/E pour tourner la vue');
    }

    /**
     * Désactivation du mode
     */
    onDeactivate() {
        super.onDeactivate();

        // Retirer les listeners
        window.removeEventListener('click', this.clickHandler);
        window.removeEventListener('mousemove', this.mouseMoveHandler);
        window.removeEventListener('wheel', this.wheelHandler);
        window.removeEventListener('keydown', this.keyHandler);

        // Retirer le marqueur
        if (this.targetMarker && this.gameEngine.sceneManager) {
            this.gameEngine.sceneManager.scene.remove(this.targetMarker);
        }

        // Annuler déplacement
        this.targetPosition = null;
        this.isMovingToTarget = false;
        if (this.targetMarker) {
            this.targetMarker.visible = false;
        }
    }

    /**
     * Clic souris → destination
     */
    onMouseClick(e) {
        // Ignorer si chat actif ou paramètres ouverts
        if (this.gameEngine.inputManager.chatActive) return;
        if (this.gameEngine.settingsModal && this.gameEngine.settingsModal.isOpen) return;

        // Vérifier que c'est un clic sur le jeu
        const isUIElement = e.target.tagName !== 'CANVAS' && e.target.id !== 'game-container';
        if (isUIElement) return;

        // Position souris normalisée
        const rect = this.gameEngine.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast vers le sol
        this.raycaster.setFromCamera(this.mouse, this.gameEngine.sceneManager.camera);

        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();

        if (this.raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
            console.log(`[IsometricCameraMode] Clic at: (${intersectPoint.x.toFixed(1)}, ${intersectPoint.z.toFixed(1)})`);

            const myRadius = this.gameEngine.inputManager.cachedPlayerRadius || 0.3;

            if (this.gameEngine.collisionManager.isValidPosition(intersectPoint, myRadius)) {
                this.targetPosition = intersectPoint.clone();
                this.targetPosition.y = 0;
                this.isMovingToTarget = true;

                // Marqueur
                if (this.targetMarker) {
                    this.targetMarker.position.copy(this.targetPosition);
                    this.targetMarker.position.y = 0.1;
                    this.targetMarker.visible = true;
                }

                console.log(`[IsometricCameraMode] ✅ Destination: (${intersectPoint.x.toFixed(1)}, ${intersectPoint.z.toFixed(1)})`);
            } else {
                console.log('[IsometricCameraMode] ❌ Position invalide');
            }
        }
    }

    /**
     * Mouvement souris
     */
    onMouseMove(e) {
        const rect = this.gameEngine.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Molette → zoom
     */
    onWheel(e) {
        if (e.deltaY > 0) {
            this.cameraDistance += this.zoomSpeed;
        } else {
            this.cameraDistance -= this.zoomSpeed;
        }

        this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));
    }

    /**
     * Touches Q/E → rotation de la caméra (4 directions fixes)
     */
    onKeyPress(e) {
        if (!this.canRotate) return;
        if (this.gameEngine.inputManager.chatActive) return;

        const key = e.key.toLowerCase();

        if (key === 'q') {
            // Rotation anti-horaire (gauche)
            this.cameraRotation += this.rotationSpeed;
            console.log('[IsometricCameraMode] 🔄 Rotation gauche');
        } else if (key === 'e') {
            // Rotation horaire (droite)
            this.cameraRotation -= this.rotationSpeed;
            console.log('[IsometricCameraMode] 🔄 Rotation droite');
        }
    }

    /**
     * Mise à jour de la caméra (chaque frame)
     */
    update(delta, targetModel, camera) {
        if (!targetModel || !camera) return;

        // Position caméra en isométrique (45°)
        // Calculer avec rotation
        const offsetX = this.cameraDistance * Math.cos(this.cameraAngle) * Math.sin(this.cameraRotation);
        const offsetZ = this.cameraDistance * Math.cos(this.cameraAngle) * Math.cos(this.cameraRotation);
        const offsetY = this.cameraDistance * Math.sin(this.cameraAngle);

        camera.position.set(
            targetModel.position.x + offsetX,
            targetModel.position.y + offsetY + this.cameraHeight,
            targetModel.position.z + offsetZ
        );

        // Regarder le joueur
        camera.lookAt(
            targetModel.position.x,
            targetModel.position.y + 1,
            targetModel.position.z
        );
    }

    /**
     * Gestion inputs
     */
    handleInput(inputManager) {
        // Utilise les clics, pas besoin
    }

    /**
     * Déplacement joueur
     */
    handlePlayerMovement(delta, targetModel) {
        if (!this.isMovingToTarget || !this.targetPosition || !targetModel) {
            return false;
        }

        // Direction vers cible
        const direction = new THREE.Vector3();
        direction.subVectors(this.targetPosition, targetModel.position);
        direction.y = 0;

        const distance = direction.length();

        // Arrivé ?
        if (distance < this.arrivedThreshold) {
            this.isMovingToTarget = false;
            if (this.targetMarker) {
                this.targetMarker.visible = false;
            }
            return false;
        }

        // Déplacer
        direction.normalize();
        const moveVec = direction.multiplyScalar(this.moveSpeed * delta);

        const proposedPosition = targetModel.position.clone().add(moveVec);
        const myRadius = this.gameEngine.inputManager.cachedPlayerRadius || 0.3;

        if (this.gameEngine.collisionManager.isValidPosition(proposedPosition, myRadius)) {
            targetModel.position.copy(proposedPosition);
        } else {
            // Collision, arrêter
            this.isMovingToTarget = false;
            if (this.targetMarker) {
                this.targetMarker.visible = false;
            }
            console.log('[IsometricCameraMode] Collision, arrêt');
        }

        // Rotation personnage
        const angle = Math.atan2(direction.x, direction.z);
        targetModel.rotation.y = angle;

        return true;
    }

    /**
     * Annuler déplacement
     */
    cancelMovement() {
        this.targetPosition = null;
        this.isMovingToTarget = false;
        if (this.targetMarker) {
            this.targetMarker.visible = false;
        }
    }
}
