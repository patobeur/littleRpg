/**
 * TopDownCameraMode - Mode caméra vue de dessus
 * Vue aérienne (bird's eye view) avec déplacement au clic
 * Style RTS/MOBA
 */

import * as THREE from 'three';
import { CameraMode } from './CameraMode.js';

export class TopDownCameraMode extends CameraMode {
    constructor(gameEngine) {
        super(gameEngine);

        // Paramètres de la caméra
        this.cameraHeight = 25; // Hauteur de la caméra au-dessus du joueur
        this.cameraAngle = Math.PI / 2 - 0.3; // Presque vertical (légère inclinaison)
        this.cameraDistance = 5; // Distance horizontale du joueur

        // Limites de zoom
        this.minHeight = 15;
        this.maxHeight = 40;
        this.zoomSpeed = 2;

        // Déplacement au clic
        this.targetPosition = null; // Position cible où le joueur doit aller
        this.isMovingToTarget = false;
        this.moveSpeed = 6; // Vitesse de déplacement
        this.arrivedThreshold = 0.5; // Distance pour considérer qu'on est arrivé

        // Raycaster pour détecter le clic sur le sol
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Event handlers
        this.clickHandler = null;
        this.mouseMoveHandler = null;
        this.wheelHandler = null;

        // Indicateur visuel de destination (optionnel)
        this.targetMarker = null;
    }

    getName() {
        return 'top-down';
    }

    getDescription() {
        return 'Vue de dessus • Clic pour se déplacer';
    }

    requiresPointerLock() {
        return false; // Pas besoin de pointer lock en top-down
    }

    /**
     * Initialisation du mode
     */
    init() {
        // Créer les handlers d'événements
        this.clickHandler = (e) => this.onMouseClick(e);
        this.mouseMoveHandler = (e) => this.onMouseMove(e);
        this.wheelHandler = (e) => this.onWheel(e);

        // Créer le marqueur de destination (optionnel)
        this.createTargetMarker();
    }

    /**
     * Créer un marqueur visuel pour la destination
     */
    createTargetMarker() {
        // Cercle au sol pour indiquer où le joueur va
        const geometry = new THREE.RingGeometry(0.3, 0.5, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });

        this.targetMarker = new THREE.Mesh(geometry, material);
        this.targetMarker.rotation.x = -Math.PI / 2; // Horizontal
        this.targetMarker.visible = false;
    }

    /**
     * Appelé lors de l'activation du mode
     */
    onActivate() {
        super.onActivate();

        console.log('[TopDownCameraMode] 🎮 Activation du mode...');

        // Ajouter les event listeners
        window.addEventListener('click', this.clickHandler);
        window.addEventListener('mousemove', this.mouseMoveHandler);
        window.addEventListener('wheel', this.wheelHandler, { passive: true });

        console.log('[TopDownCameraMode] ✅ Event listeners attachés');

        // Ajouter le marqueur à la scène
        if (this.targetMarker && this.gameEngine.sceneManager) {
            this.gameEngine.sceneManager.scene.add(this.targetMarker);
            console.log('[TopDownCameraMode] ✅ Marqueur ajouté à la scène');
        }

        // Libérer le pointer lock si actif
        if (document.pointerLockElement) {
            document.exitPointerLock();
            console.log('[TopDownCameraMode] 🔓 Pointer lock libéré');
        }

        console.log('[TopDownCameraMode] 💡 Mode activé - Cliquez sur le sol pour vous déplacer');
    }

    /**
     * Appelé lors de la désactivation du mode
     */
    onDeactivate() {
        super.onDeactivate();

        // Retirer les event listeners
        window.removeEventListener('click', this.clickHandler);
        window.removeEventListener('mousemove', this.mouseMoveHandler);
        window.removeEventListener('wheel', this.wheelHandler);

        // Retirer le marqueur de la scène
        if (this.targetMarker && this.gameEngine.sceneManager) {
            this.gameEngine.sceneManager.scene.remove(this.targetMarker);
        }

        // Annuler le déplacement en cours
        this.targetPosition = null;
        this.isMovingToTarget = false;

        if (this.targetMarker) {
            this.targetMarker.visible = false;
        }
    }

    /**
     * Clic souris → définir la destination
     */
    onMouseClick(e) {
        // Ignorer si le chat est actif
        if (this.gameEngine.inputManager.chatActive) return;

        // Ignorer si la modal de paramètres est ouverte
        if (this.gameEngine.settingsModal && this.gameEngine.settingsModal.isOpen) return;

        // Ne traiter que les clics sur le canvas/conteneur du jeu
        // Ignorer les clics sur les éléments UI (boutons, etc.)
        const isUIElement = e.target.tagName !== 'CANVAS' && e.target.id !== 'game-container';
        if (isUIElement) return;

        // Calculer la position de la souris en coordonnées normalisées
        const rect = this.gameEngine.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast vers le sol (plan Y=0)
        this.raycaster.setFromCamera(this.mouse, this.gameEngine.sceneManager.camera);

        // Créer un plan au niveau du sol
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();

        // Calculer l'intersection
        if (this.raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
            console.log(`[TopDownCameraMode] Clic détecté at: (${intersectPoint.x.toFixed(1)}, ${intersectPoint.z.toFixed(1)})`);

            // Vérifier que la position est valide (dans les limites de la map et pas d'obstacles)
            const myRadius = this.gameEngine.inputManager.cachedPlayerRadius || 0.3;

            if (this.gameEngine.collisionManager.isValidPosition(intersectPoint, myRadius)) {
                // Définir la cible
                this.targetPosition = intersectPoint.clone();
                this.targetPosition.y = 0; // Force au niveau du sol
                this.isMovingToTarget = true;

                // Afficher le marqueur
                if (this.targetMarker) {
                    this.targetMarker.position.copy(this.targetPosition);
                    this.targetMarker.position.y = 0.1; // Légèrement au-dessus du sol
                    this.targetMarker.visible = true;
                }

                console.log(`[TopDownCameraMode] ✅ Destination définie: (${intersectPoint.x.toFixed(1)}, ${intersectPoint.z.toFixed(1)})`);
            } else {
                console.log('[TopDownCameraMode] ❌ Position invalide (obstacle ou hors limites)');
            }
        } else {
            console.log('[TopDownCameraMode] ❌ Pas d\'intersection avec le sol');
        }
    }

    /**
     * Mouvement souris → mettre à jour la position (pour futurs effets hover)
     */
    onMouseMove(e) {
        // Calculer la position de la souris (pour futur: afficher un curseur custom, etc.)
        const rect = this.gameEngine.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Molette souris → zoom
     */
    onWheel(e) {
        if (e.deltaY > 0) {
            this.cameraHeight += this.zoomSpeed;
        } else {
            this.cameraHeight -= this.zoomSpeed;
        }

        // Limiter le zoom
        this.cameraHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.cameraHeight));
    }

    /**
     * Mise à jour de la caméra (chaque frame)
     */
    update(delta, targetModel, camera) {
        if (!targetModel || !camera) return;

        // Position de la caméra : au-dessus et légèrement en retrait du joueur
        const offsetX = this.cameraDistance * Math.sin(this.cameraAngle);
        const offsetZ = this.cameraDistance * Math.cos(this.cameraAngle);

        camera.position.set(
            targetModel.position.x + offsetX,
            targetModel.position.y + this.cameraHeight,
            targetModel.position.z + offsetZ
        );

        // La caméra regarde le joueur
        camera.lookAt(
            targetModel.position.x,
            targetModel.position.y + 1,
            targetModel.position.z
        );
    }

    /**
     * Gestion des inputs (non utilisé, tout se passe au clic)
     */
    handleInput(inputManager) {
        // Ce mode utilise les clics, pas les inputs clavier
    }

    /**
     * Gestion du déplacement du joueur (vers la cible au clic)
     */
    handlePlayerMovement(delta, targetModel) {
        if (!this.isMovingToTarget || !this.targetPosition || !targetModel) {
            return false;
        }

        // Calculer la direction vers la cible
        const direction = new THREE.Vector3();
        direction.subVectors(this.targetPosition, targetModel.position);
        direction.y = 0; // Ignorer Y

        const distance = direction.length();

        // Vérifier si on est arrivé
        if (distance < this.arrivedThreshold) {
            this.isMovingToTarget = false;

            // Masquer le marqueur
            if (this.targetMarker) {
                this.targetMarker.visible = false;
            }

            return false;
        }

        // Normaliser et appliquer la vitesse
        direction.normalize();
        const moveVec = direction.multiplyScalar(this.moveSpeed * delta);

        // Proposer la nouvelle position
        const proposedPosition = targetModel.position.clone().add(moveVec);

        // Vérifier collision
        const myRadius = this.gameEngine.inputManager.cachedPlayerRadius || 0.3;

        if (this.gameEngine.collisionManager.isValidPosition(proposedPosition, myRadius)) {
            targetModel.position.copy(proposedPosition);
        } else {
            // Si collision, arrêter le déplacement
            this.isMovingToTarget = false;
            if (this.targetMarker) {
                this.targetMarker.visible = false;
            }
            console.log('[TopDownCameraMode] Collision détectée, arrêt du déplacement');
        }

        // Faire tourner le personnage vers la direction du mouvement
        const angle = Math.atan2(direction.x, direction.z);
        targetModel.rotation.y = angle;

        return true; // Le joueur bouge
    }

    /**
     * Annule le déplacement en cours
     */
    cancelMovement() {
        this.targetPosition = null;
        this.isMovingToTarget = false;

        if (this.targetMarker) {
            this.targetMarker.visible = false;
        }
    }
}
