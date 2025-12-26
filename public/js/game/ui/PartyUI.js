import { getClassName } from '../Utils.js';

/**
 * PartyUI - MMO-Style Party Frames System
 * Manages player frames with health/mana bars, class colors, and drag-and-drop
 */
export class PartyUI {
    constructor(game) {
        this.game = game;
        this.frames = new Map(); // characterId -> frameElement
        this.container = null;
        this.config = this.loadConfiguration();
        this.draggedFrame = null;
        this.dragOffset = { x: 0, y: 0 };

        this.init();
    }

    init() {
        // Create container if it doesn't exist
        this.container = document.getElementById('party-frames-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'party-frames-container';
            document.body.appendChild(this.container);
        }

        // Apply saved configuration
        this.applyConfiguration(this.config);

        // Setup drag and drop if not locked
        if (!this.config.locked) {
            this.enableDragging();
        }
    }

    /**
     * Create a party frame for a player
     */
    createPartyFrame(player, isLocal = false) {
        // Remove existing frame if any
        if (this.frames.has(player.characterId)) {
            this.removePlayerFrame(player.characterId);
        }

        const frame = document.createElement('div');
        frame.className = `party-frame ${player.class.toLowerCase()} entering`;
        frame.dataset.characterId = player.characterId;
        frame.draggable = !this.config.locked;

        // Add local-player class for visual distinction
        if (isLocal) {
            frame.classList.add('local-player');
        }

        // Frame content
        frame.innerHTML = `
            <div class="party-frame-content">
                <div class="party-player-info">
                    <div class="party-player-name">${player.name}</div>
                    <div class="party-player-level">Lv.${player.level || 1}</div>
                </div>
                <div class="party-class-icon" title="${getClassName(player.class)}">
                    ${this.getClassIcon(player.class)}
                </div>
                <div class="party-stats-bars">
                    <div class="party-health-bar">
                        <div class="party-health-fill" style="width: 100%"></div>
                        <div class="party-health-text">100%</div>
                    </div>
                    <div class="party-mana-bar ${this.config.showMana ? '' : 'hidden'}">
                        <div class="party-mana-fill" style="width: 100%"></div>
                        <div class="party-mana-text">100%</div>
                    </div>
                </div>
                <div class="party-status-indicator"></div>
            </div>
        `;

        // Apply compact mode if enabled
        if (this.config.compactMode) {
            frame.classList.add('compact');
        }

        // Setup drag events
        if (!this.config.locked) {
            this.setupFrameDragEvents(frame);
        }

        this.container.appendChild(frame);
        this.frames.set(player.characterId, frame);

        // Remove entering animation class after animation
        setTimeout(() => frame.classList.remove('entering'), 400);

        return frame;
    }

    /**
     * Get class icon emoji
     */
    getClassIcon(charClass) {
        const icons = {
            'Warrior': '⚔️',
            'Mage': '🔮',
            'Healer': '✨'
        };
        return icons[charClass] || '❓';
    }

    /**
     * Update player stats (health, mana)
     */
    updatePlayerStats(characterId, stats) {
        const frame = this.frames.get(characterId);
        if (!frame) return;

        const { health, maxHealth, mana, maxMana } = stats;

        // Update health bar
        if (health !== undefined && maxHealth !== undefined) {
            const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
            const healthFill = frame.querySelector('.party-health-fill');
            const healthText = frame.querySelector('.party-health-text');

            if (healthFill) {
                healthFill.style.width = `${healthPercent}%`;

                // Add critical animation if health is low
                if (healthPercent <= 25) {
                    healthFill.classList.add('critical');
                } else {
                    healthFill.classList.remove('critical');
                }
            }

            if (healthText) {
                healthText.textContent = `${Math.round(healthPercent)}%`;
            }
        }

        // Update mana bar
        if (mana !== undefined && maxMana !== undefined && this.config.showMana) {
            const manaPercent = Math.max(0, Math.min(100, (mana / maxMana) * 100));
            const manaFill = frame.querySelector('.party-mana-fill');
            const manaText = frame.querySelector('.party-mana-text');

            console.log(`[PartyUI] Updating mana for ${characterId}: ${mana}/${maxMana} (${manaPercent.toFixed(1)}%)`, manaFill);

            if (manaFill) {
                manaFill.style.width = `${manaPercent}%`;
            }

            if (manaText) {
                manaText.textContent = `${Math.round(manaPercent)}%`;
            }
        }
    }

    /**
     * Update player status (online/offline)
     */
    updatePlayerStatus(characterId, status) {
        const frame = this.frames.get(characterId);
        if (!frame) return;

        const indicator = frame.querySelector('.party-status-indicator');

        if (status === 'disconnected' || status === 'offline') {
            frame.classList.add('disconnected');
            if (indicator) indicator.classList.add('offline');
        } else {
            frame.classList.remove('disconnected');
            if (indicator) indicator.classList.remove('offline');
        }
    }

    /**
     * Remove player frame
     */
    removePlayerFrame(characterId) {
        const frame = this.frames.get(characterId);
        if (frame) {
            // Fade out animation
            frame.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            frame.style.opacity = '0';
            frame.style.transform = 'translateX(-20px)';

            setTimeout(() => {
                frame.remove();
                this.frames.delete(characterId);
            }, 300);
        }
    }

    /**
     * Setup drag events for a frame
     */
    setupFrameDragEvents(frame) {
        frame.addEventListener('dragstart', (e) => {
            this.draggedFrame = frame;
            frame.classList.add('dragging');
            this.container.classList.add('dragging');

            // Store offset
            const rect = frame.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;

            e.dataTransfer.effectAllowed = 'move';
        });

        frame.addEventListener('dragend', (e) => {
            frame.classList.remove('dragging');
            this.container.classList.remove('dragging');
            this.draggedFrame = null;
        });
    }

    /**
     * Enable dragging for container repositioning
     */
    enableDragging() {
        if (!this.container) return;

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        // Add drag handle visualization
        this.container.style.cursor = 'move';

        const handleMouseDown = (e) => {
            // Only drag if clicking on container background (not on frames)
            if (e.target === this.container) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;

                const rect = this.container.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                this.container.style.cursor = 'grabbing';
            }
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            this.container.style.left = `${initialLeft + dx}px`;
            this.container.style.top = `${initialTop + dy}px`;
        };

        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                this.container.style.cursor = 'move';

                // Save position
                this.config.position = {
                    left: this.container.style.left,
                    top: this.container.style.top
                };
                this.saveConfiguration();
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    /**
     * Apply configuration settings
     */
    applyConfiguration(config) {
        if (!this.container) return;

        // Scale
        const scale = config.scale || 1;
        this.container.style.transform = `scale(${scale})`;
        this.container.style.transformOrigin = 'top left';

        // Opacity
        const opacity = config.opacity || 1;
        this.container.style.opacity = opacity;

        // Layout
        const layout = config.layout || 'vertical';
        this.container.className = `layout-${layout}`;
        this.container.id = 'party-frames-container';

        // Position
        if (config.position) {
            this.container.style.left = config.position.left;
            this.container.style.top = config.position.top;
        }

        // Update all frames
        this.frames.forEach((frame) => {
            // Compact mode
            if (config.compactMode) {
                frame.classList.add('compact');
            } else {
                frame.classList.remove('compact');
            }

            // Mana bars visibility
            const manaBar = frame.querySelector('.party-mana-bar');
            if (manaBar) {
                if (config.showMana) {
                    manaBar.classList.remove('hidden');
                } else {
                    manaBar.classList.add('hidden');
                }
            }

            // Level visibility
            const levelEl = frame.querySelector('.party-player-level');
            if (levelEl) {
                levelEl.style.display = config.showLevel ? 'block' : 'none';
            }
        });

        // Lock/unlock
        this.container.style.pointerEvents = config.locked ? 'none' : 'auto';
    }

    /**
     * Load configuration from localStorage
     */
    loadConfiguration() {
        const defaultConfig = {
            scale: 1,
            opacity: 1,
            layout: 'vertical',
            showMana: true,
            showLevel: true,
            compactMode: false,
            locked: false,
            position: null
        };

        try {
            const saved = localStorage.getItem('littlerpg_party_config');
            if (saved) {
                return { ...defaultConfig, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Failed to load party config:', error);
        }

        return defaultConfig;
    }

    /**
     * Save configuration to localStorage
     */
    saveConfiguration() {
        try {
            localStorage.setItem('littlerpg_party_config', JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save party config:', error);
        }
    }

    /**
     * Update configuration and apply changes
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.applyConfiguration(this.config);
        this.saveConfiguration();
    }

    /**
     * Reset configuration to defaults
     */
    resetConfiguration() {
        this.config = {
            scale: 1,
            opacity: 1,
            layout: 'vertical',
            showMana: true,
            showLevel: true,
            compactMode: false,
            locked: false,
            position: null
        };

        this.container.style.left = '';
        this.container.style.top = '';

        this.applyConfiguration(this.config);
        this.saveConfiguration();
    }

    /**
     * Update method called every frame (for future animations)
     */
    update(delta) {
        // Reserved for future animations or updates
    }
}
