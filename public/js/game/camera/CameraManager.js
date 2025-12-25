/**
 * CameraManager - Gestionnaire central des modes de caméra
 * Gère l'enregistrement, la sélection et le switch entre différents modes
 */

export class CameraManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;

        // Map des modes disponibles (name => CameraMode instance)
        this.modes = new Map();

        // Mode actuellement actif
        this.currentMode = null;
        this.currentModeName = null;

        // Paramètres de transition
        this.transitionDuration = 0.5; // secondes
        this.isTransitioning = false;
    }

    /**
     * Enregistre un nouveau mode de caméra
     * @param {CameraMode} mode - Instance d'un mode de caméra
     */
    registerMode(mode) {
        const name = mode.getName();

        if (this.modes.has(name)) {
            console.warn(`[CameraManager] Mode "${name}" déjà enregistré, écrasement`);
        }

        this.modes.set(name, mode);
        mode.init();

        console.log(`[CameraManager] Mode enregistré: ${name}`);
    }

    /**
     * Active un mode de caméra spécifique
     * @param {string} modeName - Nom du mode à activer
     * @returns {boolean} - True si le changement a réussi
     */
    setMode(modeName) {
        // Vérifier que le mode existe
        if (!this.modes.has(modeName)) {
            console.error(`[CameraManager] Mode inconnu: ${modeName}`);
            return false;
        }

        // Si c'est déjà le mode actif, ignorer
        if (this.currentModeName === modeName) {
            console.log(`[CameraManager] Mode "${modeName}" déjà actif`);
            return true;
        }

        // Désactiver l'ancien mode
        if (this.currentMode) {
            this.currentMode.onDeactivate();

            // Libérer le pointer lock si nécessaire
            if (this.currentMode.requiresPointerLock() && document.pointerLockElement) {
                document.exitPointerLock();
            }
        }

        // Activer le nouveau mode
        const newMode = this.modes.get(modeName);
        newMode.onActivate();

        this.currentMode = newMode;
        this.currentModeName = modeName;

        console.log(`[CameraManager] Mode changé: ${modeName}`);

        // Notifier l'utilisateur via l'UI
        this.showModeNotification(modeName, newMode.getDescription());

        return true;
    }

    /**
     * Passe au mode suivant (cycle)
     */
    switchToNextMode() {
        const modeNames = Array.from(this.modes.keys());

        if (modeNames.length === 0) {
            console.warn('[CameraManager] Aucun mode disponible');
            return;
        }

        const currentIndex = modeNames.indexOf(this.currentModeName);
        const nextIndex = (currentIndex + 1) % modeNames.length;
        const nextModeName = modeNames[nextIndex];

        this.setMode(nextModeName);
    }

    /**
     * Retourne le mode actuellement actif
     * @returns {CameraMode|null}
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * Retourne le nom du mode actif
     * @returns {string|null}
     */
    getCurrentModeName() {
        return this.currentModeName;
    }

    /**
     * Mise à jour du mode actif (appelée chaque frame)
     * @param {number} delta - Temps écoulé
     * @param {THREE.Object3D} targetModel - Modèle à suivre
     * @param {THREE.Camera} camera - Caméra Three.js
     */
    update(delta, targetModel, camera) {
        if (!this.currentMode) {
            console.warn('[CameraManager] Aucun mode actif');
            return;
        }

        // Mettre à jour le mode actif
        this.currentMode.update(delta, targetModel, camera);
    }

    /**
     * Délègue la gestion des inputs au mode actif
     * @param {InputManager} inputManager
     */
    handleInput(inputManager) {
        if (this.currentMode) {
            this.currentMode.handleInput(inputManager);
        }
    }

    /**
     * Gère le déplacement du joueur via le mode actif
     * @param {number} delta
     * @param {THREE.Object3D} targetModel
     * @returns {boolean}
     */
    handlePlayerMovement(delta, targetModel) {
        if (!this.currentMode) return false;
        return this.currentMode.handlePlayerMovement(delta, targetModel);
    }

    /**
     * Affiche une notification temporaire à l'écran lors du changement de mode
     * @param {string} modeName - Nom du mode
     * @param {string} description - Description du mode
     */
    showModeNotification(modeName, description) {
        // Créer ou réutiliser la notification
        let notification = document.getElementById('camera-mode-notification');

        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'camera-mode-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(139, 92, 246, 0.9);
                color: white;
                padding: 15px 30px;
                border-radius: 10px;
                font-family: var(--font-secondary);
                font-size: 1.1rem;
                font-weight: 600;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                z-index: 5000;
                text-align: center;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
            `;
            document.body.appendChild(notification);
        }

        // Mettre à jour le contenu
        notification.innerHTML = `
            📷 Mode: <strong>${modeName}</strong><br>
            <small style="font-size: 0.85rem; opacity: 0.9;">${description}</small>
        `;

        // Animation d'apparition
        setTimeout(() => notification.style.opacity = '1', 10);

        // Masquer après 2 secondes
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 2000);
    }

    /**
     * Retourne la liste des modes disponibles
     * @returns {Array<string>}
     */
    getAvailableModes() {
        return Array.from(this.modes.keys());
    }
}
