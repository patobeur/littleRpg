import * as THREE from 'three';

export class InputManager {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.mouse = { x: 0, y: 0 };

        // Performance optimization: Cache player radius (INP improvement)
        this.cachedPlayerRadius = 0.3;

        // Chat state - désactive les contrôles quand le joueur tape dans le chat
        this.chatActive = false;

        this.init();
    }

    init() {
        this.setupKeyboard();
        this.setupAttackListener();
        this.setupCameraSwitch();
    }

    setupKeyboard() {
        // Passive event listeners for better INP performance
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true, { passive: true });
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false, { passive: true });
    }

    setupAttackListener() {
        // Attack Listener
        document.addEventListener('mousedown', (e) => {
            // Ne pas attaquer si le chat est actif
            if (this.chatActive) return;

            if (document.pointerLockElement === this.game.container && e.button === 0) {
                this.handleAttack();
            }
        });
    }

    /**
     * Configure le switch entre modes de caméra (touche C)
     */
    setupCameraSwitch() {
        document.addEventListener('keydown', (e) => {
            // Camera switch (C key)
            if (e.key.toLowerCase() === 'c' && !this.chatActive) {
                if (this.game.cameraManager) {
                    this.game.cameraManager.switchToNextMode();
                }
            }

            // Party config panel (P key)
            if (e.key.toLowerCase() === 'p' && !this.chatActive) {
                if (this.game.uiManager) {
                    this.game.uiManager.togglePartyConfig();
                }
            }
        });
    }

    handleAttack() {
        // Raycast from center of screen
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.game.sceneManager.camera);

        // Check intersections with Enemies
        const enemies = Array.from(this.game.entityManager.enemies.values()).map(e => e.model).filter(m => m);
        const intersects = raycaster.intersectObjects(enemies, true);

        if (intersects.length > 0) {
            // Find which enemy holds this mesh
            let hitObject = intersects[0].object;
            // Traverse up to find root
            while (hitObject.parent && hitObject.parent.type !== 'Scene') {
                hitObject = hitObject.parent;
            }

            // Find enemy ID
            for (const [id, enemy] of this.game.entityManager.enemies) {
                if (enemy.model === hitObject) {
                    console.log('Attacking enemy:', enemy.name);

                    // Client-Side Range Check (Optional but good feedback)
                    const playerPos = this.game.entityManager.targetModel.position;
                    const dist = playerPos.distanceTo(enemy.model.position);

                    // Simple animation trigger (if exists)
                    // this.game.entityManager.playAction(this.game.localCharacterId, 'attack');

                    this.game.networkManager.emitPlayerAttack(id);
                    break;
                }
            }
        }
    }
}
