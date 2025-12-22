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
    }

    hideLoading() {
        const loadingStatus = document.getElementById('loading-status');
        if (loadingStatus) loadingStatus.style.display = 'none';

        // Also remove from DOM entirely to avoid clutter if needed
        // but display: none is fine
    }
}
