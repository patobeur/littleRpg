import { getClassName } from '../Utils.js';
import { PartyUI } from './PartyUI.js';
import { PartyConfig } from './PartyConfig.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.playersList = document.getElementById('players-ingame');

        // Initialize Party UI system
        this.partyUI = new PartyUI(game);
        this.partyConfig = new PartyConfig(this.partyUI);
    }

    setupUI(players) {
        // Keep fallback simple list (hidden by default)
        if (this.playersList) {
            this.playersList.innerHTML = `
                <div id="loading-status" class="player-label" style="background: var(--color-accent-primary);">
                    ⌛ Loading 3D Models...
                </div>
            `;
            // Hide the simple list since we're using party frames
            this.playersList.style.display = 'none';
        }

        // Sort players: local player first, then others
        const localCharacterId = this.game.entityManager?.localCharacterId;
        const sortedPlayers = [...players].sort((a, b) => {
            if (a.characterId === localCharacterId) return -1;
            if (b.characterId === localCharacterId) return 1;
            return 0;
        });

        // Create party frames for all players (local player first)
        sortedPlayers.forEach(player => {
            this.partyUI.createPartyFrame(player, player.characterId === localCharacterId);
        });

        // Create Location Info Container if not exists
        if (!document.getElementById('location-info')) {
            const locInfo = document.createElement('div');
            locInfo.id = 'location-info';
            locInfo.style.cssText = 'position: absolute; top: 10px; right: 10px; text-align: right; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.8); pointer-events: none; z-index: 100; font-family: var(--font-primary);';
            locInfo.innerHTML = `
                <div id="scenario-name" style="font-size: 1.2rem; font-weight: bold; color: var(--color-accent-primary);"></div>
                <div id="map-name" style="font-size: 1rem; color: #ddd;"></div>
            `;
            document.body.appendChild(locInfo);
        }
    }

    updateLocation(scenarioName, mapName) {
        const scenEl = document.getElementById('scenario-name');
        const mapEl = document.getElementById('map-name');
        if (scenEl) scenEl.textContent = scenarioName || '';
        if (mapEl) mapEl.textContent = mapName || '';
    }

    hideLoading() {
        const loadingStatus = document.getElementById('loading-status');
        if (loadingStatus) loadingStatus.style.display = 'none';
    }

    /**
     * Update player stats in party UI
     */
    updatePlayerStats(characterId, stats) {
        this.partyUI.updatePlayerStats(characterId, stats);
    }

    /**
     * Update player status (online/offline)
     */
    updatePlayerStatus(characterId, status) {
        this.partyUI.updatePlayerStatus(characterId, status);
    }

    /**
     * Add new player frame when they join
     */
    addPlayer(player) {
        const isLocal = player.characterId === this.game.entityManager?.localCharacterId;
        this.partyUI.createPartyFrame(player, isLocal);
    }

    /**
     * Remove player frame when they leave permanently
     */
    removePlayer(characterId) {
        this.partyUI.removePlayerFrame(characterId);
    }

    /**
     * Toggle party configuration panel
     */
    togglePartyConfig() {
        this.partyConfig.toggle();
    }

    /**
     * Update method - called every frame
     */
    update(delta) {
        this.partyUI.update(delta);
    }
}
