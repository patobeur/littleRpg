import * as THREE from 'three';
import { EnvironmentManager } from './scene/EnvironmentManager.js';
import { ZoneManager } from './scene/ZoneManager.js';
import { RendererManager } from './scene/RendererManager.js';
import { AmbianceManager } from './scene/AmbianceManager.js';

/**
 * Main scene manager that orchestrates all scene-related functionality
 */
export class SceneManager {
    constructor(game) {
        this.game = game;
        this.scene = null;

        // Managers will be initialized after scene is created
        this.environmentManager = null;
        this.zoneManager = null;
        this.rendererManager = null;
        this.ambianceManager = null;

        // Legacy properties for backward compatibility
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.roads = [];
        this.trees = [];
        this.spawnMarkers = [];
        this.teleportZones = [];
    }

    /**
     * Initialize the scene and all managers
     */
    init() {
        this.setupScene();

        // Initialize managers
        this.rendererManager = new RendererManager(this.game.container);
        this.ambianceManager = new AmbianceManager(this.scene);
        this.environmentManager = new EnvironmentManager(this.scene);
        this.zoneManager = new ZoneManager(this.scene);

        // Setup rendering components
        this.renderer = this.rendererManager.setupRenderer();
        this.camera = this.rendererManager.setupCamera();
        this.controls = this.rendererManager.setupControls();

        // Setup ambiance
        this.setupLights();
        this.setupGround();
    }

    /**
     * Setup the THREE.js scene with default settings
     */
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);
    }

    /**
     * Setup lights (delegated to AmbianceManager)
     */
    setupLights() {
        this.ambianceManager.setupLights();
    }

    /**
     * Setup ground (delegated to AmbianceManager)
     */
    setupGround() {
        this.ambianceManager.setupGround();
    }

    /**
     * Create roads (delegated to EnvironmentManager)
     * @param {Array} roadsList - List of road configurations
     */
    createRoads(roadsList) {
        this.environmentManager.createRoads(roadsList);
        // Update legacy property for backward compatibility
        this.roads = this.environmentManager.roads;
    }

    /**
     * Create trees (delegated to EnvironmentManager)
     * @param {Array} treeList - List of tree configurations
     */
    async createTrees(treeList) {
        await this.environmentManager.createTrees(treeList);
        // Update legacy property for backward compatibility
        this.trees = this.environmentManager.trees;
    }

    /**
     * Create spawn markers (delegated to ZoneManager)
     * @param {Array} spawnConfigList - List of spawn configurations
     */
    createSpawnMarkers(spawnConfigList) {
        this.zoneManager.createSpawnMarkers(spawnConfigList);
        // Update legacy property for backward compatibility
        this.spawnMarkers = this.zoneManager.spawnMarkers;
    }

    /**
     * Create teleport zones (delegated to ZoneManager)
     * @param {Array} teleportConfigList - List of teleport zone configurations
     */
    createTeleportZones(teleportConfigList) {
        this.zoneManager.createTeleportZones(teleportConfigList);
        // Update legacy property for backward compatibility
        this.teleportZones = this.zoneManager.teleportZones;
    }

    /**
     * Handle window resize (delegated to RendererManager)
     */
    onWindowResize() {
        this.rendererManager.onWindowResize();
    }

    /**
     * Update scene ambiance (delegated to AmbianceManager)
     * @param {Object} config - Ambiance configuration
     */
    updateAmbiance(config) {
        this.ambianceManager.updateAmbiance(config);
    }
}
