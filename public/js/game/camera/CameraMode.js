/**
 * CameraMode - Classe de base abstraite pour tous les modes de caméra
 * Chaque mode de caméra doit étendre cette classe et implémenter les méthodes
 */

export class CameraMode {
    /**
     * @param {Object} gameEngine - Référence au moteur de jeu
     */
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.isActive = false;
    }

    /**
     * Initialise le mode (appelé une seule fois)
     * À surcharger si nécessaire
     */
    init() {
        // Override in child classes if needed
    }

    /**
     * Mise à jour de la caméra (appelée à chaque frame)
     * @param {number} delta - Temps écoulé depuis la dernière frame
     * @param {THREE.Object3D} targetModel - Modèle du joueur à suivre
     * @param {THREE.Camera} camera - Caméra Three.js
     * @abstract
     */
    update(delta, targetModel, camera) {
        throw new Error('update() doit être implémenté par les classes enfants');
    }

    /**
     * Gère les inputs spécifiques au mode
     * @param {InputManager} inputManager - Gestionnaire d'inputs
     * @abstract
     */
    handleInput(inputManager) {
        throw new Error('handleInput() doit être implémenté par les classes enfants');
    }

    /**
     * Appelé lors de l'activation du mode
     * Permet de configurer des événements, réinitialiser des états, etc.
     */
    onActivate() {
        this.isActive = true;
        console.log(`[CameraMode] Mode activé: ${this.getName()}`);
    }

    /**
     * Appelé lors de la désactivation du mode
     * Permet de nettoyer des événements, libérer des ressources, etc.
     */
    onDeactivate() {
        this.isActive = false;
        console.log(`[CameraMode] Mode désactivé: ${this.getName()}`);
    }

    /**
     * Retourne le nom du mode
     * @returns {string}
     * @abstract
     */
    getName() {
        throw new Error('getName() doit être implémenté par les classes enfants');
    }

    /**
     * Retourne une description du mode
     * @returns {string}
     */
    getDescription() {
        return 'Mode de caméra';
    }

    /**
     * Retourne si le mode nécessite le pointer lock
     * @returns {boolean}
     */
    requiresPointerLock() {
        return false;
    }

    /**
     * Gère le déplacement du joueur (peut être différent selon le mode)
     * @param {number} delta - Temps écoulé
     * @param {THREE.Object3D} targetModel - Modèle du joueur
     * @returns {boolean} - True si le joueur bouge
     */
    handlePlayerMovement(delta, targetModel) {
        // Par défaut, déléguer à InputManager (pourra être surchargé)
        return false;
    }
}
