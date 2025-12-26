/**
 * PartyConfig - Configuration Panel for Party UI
 * Provides user interface for customizing party frames
 */
export class PartyConfig {
    constructor(partyUI) {
        this.partyUI = partyUI;
        this.panel = null;
        this.isVisible = false;

        this.init();
    }

    init() {
        this.createPanel();
        this.setupEventListeners();
    }

    /**
     * Create configuration panel HTML
     */
    createPanel() {
        this.panel = document.getElementById('party-config-panel');
        if (!this.panel) {
            this.panel = document.createElement('div');
            this.panel.id = 'party-config-panel';
            document.body.appendChild(this.panel);
        }

        const config = this.partyUI.config;

        this.panel.innerHTML = `
            <div class="party-config-header">
                <div class="party-config-title">⚙️ Configuration du Groupe</div>
                <button class="party-config-close" id="party-config-close">×</button>
            </div>

            <div class="party-config-body">
                <!-- Display Section -->
                <div class="party-config-section">
                    <div class="party-config-section-title">🎨 Affichage</div>
                    
                    <div class="party-config-option">
                        <label class="party-config-label">
                            Taille: <span class="party-config-value" id="scale-value">${Math.round(config.scale * 100)}%</span>
                        </label>
                        <input type="range" class="party-config-input" id="scale-slider" 
                               min="50" max="150" step="5" value="${config.scale * 100}">
                    </div>

                    <div class="party-config-option">
                        <label class="party-config-label">
                            Opacité: <span class="party-config-value" id="opacity-value">${Math.round(config.opacity * 100)}%</span>
                        </label>
                        <input type="range" class="party-config-input" id="opacity-slider" 
                               min="50" max="100" step="5" value="${config.opacity * 100}">
                    </div>

                    <div class="party-config-option">
                        <label class="party-config-label">Disposition</label>
                        <select class="party-config-select" id="layout-select">
                            <option value="vertical" ${config.layout === 'vertical' ? 'selected' : ''}>Verticale</option>
                            <option value="horizontal" ${config.layout === 'horizontal' ? 'selected' : ''}>Horizontale</option>
                            <option value="grid" ${config.layout === 'grid' ? 'selected' : ''}>Grille</option>
                        </select>
                    </div>
                </div>

                <!-- Information Section -->
                <div class="party-config-section">
                    <div class="party-config-section-title">ℹ️ Informations</div>
                    
                    <div class="party-config-option">
                        <label class="party-config-toggle">
                            <input type="checkbox" id="show-mana-toggle" ${config.showMana ? 'checked' : ''}>
                            <div class="party-config-toggle-switch"></div>
                            <span class="party-config-label">Afficher la barre de mana</span>
                        </label>
                    </div>

                    <div class="party-config-option">
                        <label class="party-config-toggle">
                            <input type="checkbox" id="show-level-toggle" ${config.showLevel ? 'checked' : ''}>
                            <div class="party-config-toggle-switch"></div>
                            <span class="party-config-label">Afficher le niveau</span>
                        </label>
                    </div>

                    <div class="party-config-option">
                        <label class="party-config-toggle">
                            <input type="checkbox" id="compact-mode-toggle" ${config.compactMode ? 'checked' : ''}>
                            <div class="party-config-toggle-switch"></div>
                            <span class="party-config-label">Mode compact</span>
                        </label>
                    </div>
                </div>

                <!-- Position Section -->
                <div class="party-config-section">
                    <div class="party-config-section-title">📍 Position</div>
                    
                    <div class="party-config-option">
                        <label class="party-config-toggle">
                            <input type="checkbox" id="lock-position-toggle" ${config.locked ? 'checked' : ''}>
                            <div class="party-config-toggle-switch"></div>
                            <span class="party-config-label">Verrouiller la position</span>
                        </label>
                    </div>

                    <div class="party-config-option">
                        <button class="party-config-button secondary" id="reset-position-btn">
                            🔄 Réinitialiser la position
                        </button>
                    </div>
                </div>
            </div>

            <div class="party-config-footer">
                <button class="party-config-button secondary" id="reset-all-btn">Réinitialiser tout</button>
                <button class="party-config-button primary" id="save-config-btn">Sauvegarder</button>
            </div>
        `;
    }

    /**
     * Setup event listeners for all controls
     */
    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('party-config-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Scale slider
        const scaleSlider = document.getElementById('scale-slider');
        const scaleValue = document.getElementById('scale-value');
        if (scaleSlider && scaleValue) {
            scaleSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                scaleValue.textContent = `${value}%`;
                this.partyUI.updateConfiguration({ scale: value / 100 });
            });
        }

        // Opacity slider
        const opacitySlider = document.getElementById('opacity-slider');
        const opacityValue = document.getElementById('opacity-value');
        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', (e) => {
                const value = e.target.value;
                opacityValue.textContent = `${value}%`;
                this.partyUI.updateConfiguration({ opacity: value / 100 });
            });
        }

        // Layout select
        const layoutSelect = document.getElementById('layout-select');
        if (layoutSelect) {
            layoutSelect.addEventListener('change', (e) => {
                this.partyUI.updateConfiguration({ layout: e.target.value });
            });
        }

        // Show mana toggle
        const showManaToggle = document.getElementById('show-mana-toggle');
        if (showManaToggle) {
            showManaToggle.addEventListener('change', (e) => {
                this.partyUI.updateConfiguration({ showMana: e.target.checked });
            });
        }

        // Show level toggle
        const showLevelToggle = document.getElementById('show-level-toggle');
        if (showLevelToggle) {
            showLevelToggle.addEventListener('change', (e) => {
                this.partyUI.updateConfiguration({ showLevel: e.target.checked });
            });
        }

        // Compact mode toggle
        const compactModeToggle = document.getElementById('compact-mode-toggle');
        if (compactModeToggle) {
            compactModeToggle.addEventListener('change', (e) => {
                this.partyUI.updateConfiguration({ compactMode: e.target.checked });
            });
        }

        // Lock position toggle
        const lockPositionToggle = document.getElementById('lock-position-toggle');
        if (lockPositionToggle) {
            lockPositionToggle.addEventListener('change', (e) => {
                this.partyUI.updateConfiguration({ locked: e.target.checked });
                // Re-enable or disable dragging
                if (!e.target.checked) {
                    this.partyUI.enableDragging();
                }
            });
        }

        // Reset position button
        const resetPositionBtn = document.getElementById('reset-position-btn');
        if (resetPositionBtn) {
            resetPositionBtn.addEventListener('click', () => {
                if (this.partyUI.container) {
                    this.partyUI.container.style.left = '';
                    this.partyUI.container.style.top = '';
                    this.partyUI.config.position = null;
                    this.partyUI.saveConfiguration();
                }
            });
        }

        // Reset all button
        const resetAllBtn = document.getElementById('reset-all-btn');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => {
                if (confirm('Êtes-vous sûr de vouloir réinitialiser toute la configuration ?')) {
                    this.partyUI.resetConfiguration();
                    this.hide();
                    // Refresh panel to show default values
                    setTimeout(() => this.show(), 100);
                }
            });
        }

        // Save button (just closes panel, auto-save is already happening)
        const saveBtn = document.getElementById('save-config-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Show configuration panel
     */
    show() {
        if (this.panel) {
            this.panel.classList.add('visible');
            this.isVisible = true;
        }
    }

    /**
     * Hide configuration panel
     */
    hide() {
        if (this.panel) {
            this.panel.classList.remove('visible');
            this.isVisible = false;
        }
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}
