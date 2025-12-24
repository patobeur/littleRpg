import { getClassName } from './Utils.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.playersList = document.getElementById('players-ingame');
    }

    setupUI(players) {
        if (!this.playersList) return;

        this.playersList.innerHTML = `
            <div id="loading-status" class="player-label" style="background: var(--color-accent-primary);">
                ⌛ Loading 3D Models...
            </div>
            ${players.map(p => `
                <div class="player-label">
                    <strong>${p.name}</strong> - ${getClassName(p.class)}
                </div>
            `).join('')}
        `;

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

        // Also remove from DOM entirely to avoid clutter if needed
        // but display: none is fine
    }
}
