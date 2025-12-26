/**
 * SettingsModal - Gestion de la modal des paramètres du jeu
 * S'ouvre avec ESC ou O, permet de configurer les options
 */

export class SettingsModal {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.isOpen = false;
        this.currentTab = 'game'; // Onglet par défaut

        // Paramètres par défaut
        this.settings = {
            // Contrôles
            invertMouseY: false,
            mouseSensitivity: 1.0,

            // Affichage
            showEnemyHUD: true,
            showPlayerNames: true,
            showFPS: false,

            // Audio (pour future extension)
            masterVolume: 1.0,
            musicVolume: 0.7,
            sfxVolume: 0.8,

            // Graphismes (pour future extension)
            shadows: true,
            particleEffects: true
        };

        // Charger les paramètres sauvegardés
        this.loadSettings();

        // Conteneur de la modal
        this.modalContainer = null;
    }

    /**
     * Initialise la modal
     */
    init() {
        this.createModal();
        this.setupEventListeners();
        console.log('[SettingsModal] Modal de paramètres initialisée');
    }

    /**
     * Crée la structure HTML de la modal
     */
    createModal() {
        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'settings-overlay';
        overlay.className = 'settings-overlay hidden';

        // Modal
        const modal = document.createElement('div');
        modal.className = 'settings-modal';

        // En-tête
        const header = document.createElement('div');
        header.className = 'settings-header';
        header.innerHTML = `
            <h2>⚙️ Paramètres</h2>
            <button class="settings-close" aria-label="Fermer">×</button>
        `;

        // Onglets
        const tabs = document.createElement('div');
        tabs.className = 'settings-tabs';
        tabs.innerHTML = `
            <button class="settings-tab active" data-tab="game">🎮 Jeu</button>
            <button class="settings-tab" data-tab="controls">⌨️ Contrôles</button>
            <button class="settings-tab" data-tab="display">🖥️ Affichage</button>
            <button class="settings-tab" data-tab="audio">🔊 Audio</button>
            <button class="settings-tab" data-tab="graphics">✨ Graphismes</button>
        `;

        // Contenu
        const content = document.createElement('div');
        content.className = 'settings-content';

        // Créer les contenus pour chaque onglet
        content.appendChild(this.createGameTab());
        content.appendChild(this.createControlsTab());
        content.appendChild(this.createDisplayTab());
        content.appendChild(this.createAudioTab());
        content.appendChild(this.createGraphicsTab());

        // Footer avec boutons
        const footer = document.createElement('div');
        footer.className = 'settings-footer';
        footer.innerHTML = `
            <button class="btn btn-secondary" id="settings-reset">Réinitialiser</button>
            <button class="btn btn-primary" id="settings-apply">Appliquer</button>
        `;

        // Assemblage
        modal.appendChild(header);
        modal.appendChild(tabs);
        modal.appendChild(content);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        // Ajout au DOM
        document.body.appendChild(overlay);
        this.modalContainer = overlay;
    }

    /**
     * Crée l'onglet Jeu
     */
    createGameTab() {
        const tab = document.createElement('div');
        tab.className = 'settings-tab-content active';
        tab.dataset.tab = 'game';

        tab.innerHTML = `
            <div class="settings-category">
                <h3>🎮 Session de jeu</h3>
                
                <div class="settings-option" style="flex-direction: column; align-items: stretch; gap: 10px;">
                    <p class="settings-info" style="margin: 0;">
                        Quitter la partie vous ramènera au tableau de bord. 
                        Vous serez retiré du lobby et vos données seront sauvegardées.
                    </p>
                    <button class="btn btn-danger" id="quit-game-btn" style="width: 100%; padding: 12px; font-size: 16px;">
                        🚪 Quitter la partie
                    </button>
                </div>
            </div>
        `;

        return tab;
    }

    /**
     * Crée l'onglet Contrôles
     */
    createControlsTab() {
        const tab = document.createElement('div');
        tab.className = 'settings-tab-content'; // Removed 'active' - now Game tab is default
        tab.dataset.tab = 'controls';

        tab.innerHTML = `
            <div class="settings-category">
                <h3>🖱️ Souris</h3>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>Inverser axe vertical</label>
                        <span class="settings-option-desc">Inverse le haut et le bas de la souris</span>
                    </div>
                    <div class="settings-toggle" data-setting="invertMouseY">
                        <div class="settings-toggle-slider"></div>
                    </div>
                </div>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>Sensibilité</label>
                        <span class="settings-option-desc">Ajuste la vitesse de rotation de la caméra</span>
                    </div>
                    <input type="range" class="settings-slider" data-setting="mouseSensitivity" 
                           min="0.5" max="2" step="0.1" value="${this.settings.mouseSensitivity}">
                    <span class="settings-value">${this.settings.mouseSensitivity}x</span>
                </div>
            </div>
            
            <div class="settings-category">
                <h3>⌨️ Clavier</h3>
                <p class="settings-info">Les raccourcis clavier seront configurables dans une future mise à jour</p>
            </div>
        `;

        return tab;
    }

    /**
     * Crée l'onglet Affichage
     */
    createDisplayTab() {
        const tab = document.createElement('div');
        tab.className = 'settings-tab-content';
        tab.dataset.tab = 'display';

        tab.innerHTML = `
            <div class="settings-category">
                <h3>👁️ Interface</h3>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>HUD des ennemis</label>
                        <span class="settings-option-desc">
                            💡 Désactiver pour améliorer les performances (moins de ressources utilisées)
                        </span>
                    </div>
                    <div class="settings-toggle" data-setting="showEnemyHUD">
                        <div class="settings-toggle-slider"></div>
                    </div>
                </div>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>Noms des joueurs</label>
                        <span class="settings-option-desc">Affiche les noms au-dessus des personnages</span>
                    </div>
                    <div class="settings-toggle" data-setting="showPlayerNames">
                        <div class="settings-toggle-slider"></div>
                    </div>
                </div>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>Compteur FPS</label>
                        <span class="settings-option-desc">Affiche les images par seconde</span>
                    </div>
                    <div class="settings-toggle" data-setting="showFPS">
                        <div class="settings-toggle-slider"></div>
                    </div>
                </div>
            </div>
        `;

        return tab;
    }

    /**
     * Crée l'onglet Audio
     */
    createAudioTab() {
        const tab = document.createElement('div');
        tab.className = 'settings-tab-content';
        tab.dataset.tab = 'audio';

        tab.innerHTML = `
            <div class="settings-category">
                <h3>🔊 Volume</h3>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>Volume général</label>
                    </div>
                    <input type="range" class="settings-slider" data-setting="masterVolume" 
                           min="0" max="1" step="0.1" value="${this.settings.masterVolume}">
                    <span class="settings-value">${Math.round(this.settings.masterVolume * 100)}%</span>
                </div>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>Musique</label>
                    </div>
                    <input type="range" class="settings-slider" data-setting="musicVolume" 
                           min="0" max="1" step="0.1" value="${this.settings.musicVolume}">
                    <span class="settings-value">${Math.round(this.settings.musicVolume * 100)}%</span>
                </div>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>Effets sonores</label>
                    </div>
                    <input type="range" class="settings-slider" data-setting="sfxVolume" 
                           min="0" max="1" step="0.1" value="${this.settings.sfxVolume}">
                    <span class="settings-value">${Math.round(this.settings.sfxVolume * 100)}%</span>
                </div>
            </div>
        `;

        return tab;
    }

    /**
     * Crée l'onglet Graphismes
     */
    createGraphicsTab() {
        const tab = document.createElement('div');
        tab.className = 'settings-tab-content';
        tab.dataset.tab = 'graphics';

        tab.innerHTML = `
            <div class="settings-category">
                <h3>✨ Qualité visuelle</h3>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>Ombres</label>
                        <span class="settings-option-desc">Affiche les ombres portées (impacte les performances)</span>
                    </div>
                    <div class="settings-toggle" data-setting="shadows">
                        <div class="settings-toggle-slider"></div>
                    </div>
                </div>
                
                <div class="settings-option">
                    <div class="settings-option-info">
                        <label>Effets de particules</label>
                        <span class="settings-option-desc">Active les effets visuels de compétences</span>
                    </div>
                    <div class="settings-toggle" data-setting="particleEffects">
                        <div class="settings-toggle-slider"></div>
                    </div>
                </div>
            </div>
        `;

        return tab;
    }

    /**
     * Configure les événements
     */
    setupEventListeners() {
        // Fermeture par bouton X
        const closeBtn = this.modalContainer.querySelector('.settings-close');
        closeBtn.addEventListener('click', () => this.close());

        // Fermeture par clic sur overlay
        this.modalContainer.addEventListener('click', (e) => {
            if (e.target === this.modalContainer) {
                this.close();
            }
        });

        // Changement d'onglets
        const tabButtons = this.modalContainer.querySelectorAll('.settings-tab');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Toggles
        const toggles = this.modalContainer.querySelectorAll('.settings-toggle');
        toggles.forEach(toggle => {
            const setting = toggle.dataset.setting;
            // État initial
            if (this.settings[setting]) {
                toggle.classList.add('active');
            }

            toggle.addEventListener('click', () => {
                const newValue = !toggle.classList.contains('active');
                toggle.classList.toggle('active');
                this.settings[setting] = newValue;
                this.saveSettings();
                this.applySettings();
            });
        });

        // Sliders
        const sliders = this.modalContainer.querySelectorAll('.settings-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const setting = slider.dataset.setting;
                const value = parseFloat(e.target.value);
                this.settings[setting] = value;

                // Mettre à jour l'affichage de la valeur
                const valueDisplay = slider.nextElementSibling;
                if (valueDisplay && valueDisplay.classList.contains('settings-value')) {
                    if (setting.includes('Volume')) {
                        valueDisplay.textContent = `${Math.round(value * 100)}%`;
                    } else {
                        valueDisplay.textContent = `${value}x`;
                    }
                }

                this.saveSettings();
                this.applySettings();
            });
        });

        // Bouton Réinitialiser
        const resetBtn = this.modalContainer.querySelector('#settings-reset');
        resetBtn.addEventListener('click', () => this.resetSettings());

        // Bouton Appliquer (ferme la modal)
        const applyBtn = this.modalContainer.querySelector('#settings-apply');
        applyBtn.addEventListener('click', () => {
            this.applySettings();
            this.close();
        });

        // Utiliser la délégation d'événements pour le bouton Quitter
        // (fonctionne même si le bouton est recréé)
        this.modalContainer.addEventListener('click', (e) => {
            if (e.target.id === 'quit-game-btn' || e.target.closest('#quit-game-btn')) {
                console.log('[SettingsModal] Quit button clicked via delegation!');
                this.quitGame();
            }
        });

        // Écoute globale pour ESC et O
        document.addEventListener('keydown', (e) => {
            // ESC ou O (attention au chat actif)
            if ((e.key === 'Escape' || e.key.toLowerCase() === 'o') && !this.gameEngine.inputManager.chatActive) {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * Change d'onglet
     */
    switchTab(tabName) {
        // Désactiver tous les onglets
        const allTabs = this.modalContainer.querySelectorAll('.settings-tab');
        const allContents = this.modalContainer.querySelectorAll('.settings-tab-content');

        allTabs.forEach(tab => tab.classList.remove('active'));
        allContents.forEach(content => content.classList.remove('active'));

        // Activer l'onglet sélectionné
        const selectedTab = this.modalContainer.querySelector(`.settings-tab[data-tab="${tabName}"]`);
        const selectedContent = this.modalContainer.querySelector(`.settings-tab-content[data-tab="${tabName}"]`);

        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');
            this.currentTab = tabName;
        }
    }

    /**
     * Ouvre la modal
     */
    open() {
        if (this.isOpen) return;

        this.modalContainer.classList.remove('hidden');
        this.isOpen = true;

        // Désactiver le pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        console.log('[SettingsModal] Modal ouverte');
    }

    /**
     * Ferme la modal
     */
    close() {
        if (!this.isOpen) return;

        this.modalContainer.classList.add('hidden');
        this.isOpen = false;

        console.log('[SettingsModal] Modal fermée');
    }

    /**
     * Toggle (ouvre/ferme)
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Applique les paramètres au jeu
     */
    applySettings() {
        // Inverser axe Y de la souris
        if (this.gameEngine.inputManager) {
            this.gameEngine.inputManager.invertY = this.settings.invertMouseY;
        }

        // Affichage HUD ennemis
        if (this.gameEngine.entityManager) {
            this.gameEngine.entityManager.showEnemyHUD = this.settings.showEnemyHUD;
        }

        // Affichage noms joueurs
        if (this.gameEngine.entityManager) {
            this.gameEngine.entityManager.showPlayerNames = this.settings.showPlayerNames;
        }

        console.log('[SettingsModal] Paramètres appliqués', this.settings);
    }

    /**
     * Sauvegarde les paramètres dans localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('[SettingsModal] Erreur de sauvegarde', e);
        }
    }

    /**
     * Charge les paramètres depuis localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('gameSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                console.log('[SettingsModal] Paramètres chargés', this.settings);
            }
        } catch (e) {
            console.error('[SettingsModal] Erreur de chargement', e);
        }
    }

    /**
     * Réinitialise les paramètres par défaut
     */
    resetSettings() {
        if (!confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
            return;
        }

        // Valeurs par défaut
        this.settings = {
            invertMouseY: false,
            mouseSensitivity: 1.0,
            showEnemyHUD: true,
            showPlayerNames: true,
            showFPS: false,
            masterVolume: 1.0,
            musicVolume: 0.7,
            sfxVolume: 0.8,
            shadows: true,
            particleEffects: true
        };

        this.saveSettings();
        this.applySettings();

        // Recharger la modal pour afficher les nouvelles valeurs
        const modal = this.modalContainer.querySelector('.settings-modal');
        modal.remove();
        this.createModal();
        this.modalContainer.querySelector('.settings-overlay').appendChild(modal);

        console.log('[SettingsModal] Paramètres réinitialisés');
    }

    /**
     * Quitte la partie proprement
     */
    quitGame() {
        console.log('[SettingsModal] quitGame() called');

        // Créer une confirmation personnalisée dans la modal
        const confirmOverlay = document.createElement('div');
        confirmOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        const confirmBox = document.createElement('div');
        confirmBox.style.cssText = `
            background: #1a1a2e;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            max-width: 400px;
            border: 2px solid #9d4edd;
        `;

        confirmBox.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #fff;">🚪 Quitter la partie ?</h3>
            <p style="margin: 0 0 30px 0; color: #ccc;">Votre progression sera sauvegardée.</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="confirm-quit-yes" class="btn btn-danger" style="padding: 10px 30px;">Oui, quitter</button>
                <button id="confirm-quit-no" class="btn btn-secondary" style="padding: 10px 30px;">Annuler</button>
            </div>
        `;

        confirmOverlay.appendChild(confirmBox);
        this.modalContainer.querySelector('.settings-modal').appendChild(confirmOverlay);

        // Handlers
        const handleYes = () => {
            console.log('[SettingsModal] User confirmed quit');
            confirmOverlay.remove();
            this.performQuit();
        };

        const handleNo = () => {
            console.log('[SettingsModal] User cancelled quit');
            confirmOverlay.remove();
        };

        document.getElementById('confirm-quit-yes').addEventListener('click', handleYes);
        document.getElementById('confirm-quit-no').addEventListener('click', handleNo);
    }

    performQuit() {
        console.log('[SettingsModal] Performing quit...');

        // Fermer la modal
        this.close();
        console.log('[SettingsModal] Modal closed');

        // Déconnecter proprement du socket
        if (this.gameEngine.networkManager && this.gameEngine.networkManager.socket) {
            console.log('[SettingsModal] Disconnecting from lobby...');
            this.gameEngine.networkManager.socket.disconnect();
        }

        // Nettoyage du sessionStorage
        sessionStorage.removeItem('currentLobby');
        console.log('[SettingsModal] Session storage cleared');

        // Redirection vers le dashboard
        console.log('[SettingsModal] Redirecting to dashboard...');
        window.location.href = '/dashboard.html';
    }
}
