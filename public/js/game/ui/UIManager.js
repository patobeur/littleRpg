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

    // --- Interaction UI ---

    showInteractionPrompt(text) {
        let prompt = document.getElementById('interaction-prompt');
        if (!prompt) {
            prompt = document.createElement('div');
            prompt.id = 'interaction-prompt';
            prompt.style.cssText = `
                position: absolute;
                bottom: 15%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                padding: 10px 20px;
                border-radius: 8px;
                color: #fff;
                font-family: 'Cinzel', serif;
                font-size: 18px;
                text-align: center;
                pointer-events: none;
                z-index: 1000;
                border: 1px solid rgba(255, 255, 255, 0.3);
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                animation: fadeIn 0.3s ease;
            `;
            document.body.appendChild(prompt);
        }
        prompt.textContent = text;
        prompt.style.display = 'block';
    }

    hideInteractionPrompt() {
        const prompt = document.getElementById('interaction-prompt');
        if (prompt) {
            prompt.style.display = 'none';
        }
    }

    showInteractionResponse(data) {
        // Simple modal or overlay
        let responseContainer = document.getElementById('interaction-response');
        if (!responseContainer) {
            responseContainer = document.createElement('div');
            responseContainer.id = 'interaction-response';
            responseContainer.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(20, 20, 30, 0.95);
                border: 2px solid #8b5cf6;
                border-radius: 12px;
                padding: 20px;
                min-width: 400px;
                color: white;
                font-family: 'Cinzel', serif;
                z-index: 5000;
                box-shadow: 0 10px 30px rgba(0,0,0,0.8);
                display: flex;
                flex-direction: column;
                gap: 15px;
            `;

            // Close button (supports click or Escape)
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Fermer';
            closeBtn.style.cssText = `
                align-self: flex-end;
                background: #8b5cf6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-family: inherit;
                font-weight: bold;
            `;
            closeBtn.onclick = () => {
                responseContainer.style.display = 'none';
                // Re-enable controls if disabled
            };

            this.responseContent = document.createElement('div');
            responseContainer.appendChild(this.responseContent);
            responseContainer.appendChild(closeBtn);

            document.body.appendChild(responseContainer);
        }

        let html = '';
        if (data.type === 'dialogue') {
            html += `<h2 style="color: #a78bfa; margin: 0 0 10px 0;">${data.name}</h2>`;
            data.text.forEach(line => {
                html += `<p style="margin: 5px 0; font-size: 1.1rem;">${line}</p>`;
            });
        } else if (data.type === 'message') {
            data.text.forEach(line => {
                html += `<p style="margin: 5px 0; font-size: 1.1rem;">${line}</p>`;
            });
        }

        this.responseContent.innerHTML = html;
        responseContainer.style.display = 'flex';
    }
}
