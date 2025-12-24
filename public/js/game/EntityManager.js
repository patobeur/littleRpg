import { PlayerManager } from './entities/PlayerManager.js';
import { EnemyManager } from './entities/EnemyManager.js';
import { StructureManager } from './entities/StructureManager.js';

export class EntityManager {
    constructor(game) {
        this.game = game;

        this.playerManager = new PlayerManager(game);
        this.enemyManager = new EnemyManager(game);
        this.structureManager = new StructureManager(game);
        // this.models = new Map(); // Deprecated?
    }

    // --- Getters to maintain facade ---
    get playerData() { return this.playerManager.playerData; }
    get enemies() { return this.enemyManager.enemies; }
    get structures() { return this.structureManager.structures; }
    get targetModel() { return this.playerManager.targetModel; }
    get localCharacterId() { return this.playerManager.localCharacterId; }

    // --- Delegated Methods ---

    async loadPlayers(players, localCharacterId) {
        return this.playerManager.loadPlayers(players, localCharacterId);
    }

    async loadEnemies(enemyList) {
        return this.enemyManager.loadEnemies(enemyList);
    }

    async loadStructures(structureList) {
        return this.structureManager.loadStructures(structureList);
    }

    update(delta) {
        this.playerManager.update(delta);
        this.enemyManager.update(delta);
    }

    fadeToAction(characterId, name, duration = 0.2, timeScale = 1) {
        this.playerManager.fadeToAction(characterId, name, duration, timeScale);
    }

    updateHUDPositions(camera) {
        this.enemyManager.updateHUDPositions(camera);
    }

    updateEnemyStats(id, stats) {
        this.enemyManager.updateEnemyStats(id, stats);
    }
}
