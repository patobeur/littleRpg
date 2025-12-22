// Scene configuration for LittleRPG
// Defines spawn points and teleport zones for each scene

export const SCENE_CONFIG = {
    'scene_01': {
        name: 'Training Grounds',
        spawns: [
            { x: 0, y: 0, z: 5, class: 'Warrior' },   // Top of triangle
            { x: -4, y: 0, z: -2, class: 'Mage' },    // Left bottom
            { x: 4, y: 0, z: -2, class: 'Healer' }    // Right bottom
        ],
        teleportZones: [
            { x: 0, y: 0.1, z: 8, radius: 1.5, class: 'Warrior', color: 0xff4444 },
            { x: -6, y: 0.1, z: -5, radius: 1.5, class: 'Mage', color: 0x4444ff },
            { x: 6, y: 0.1, z: -5, radius: 1.5, class: 'Healer', color: 0x44ff44 }
        ]
    },
    'scene_02': {
        name: 'Dark Forest',
        spawns: [
            { x: -3, y: 0, z: 0, class: 'Warrior' },
            { x: 0, y: 0, z: 0, class: 'Mage' },
            { x: 3, y: 0, z: 0, class: 'Healer' }
        ],
        teleportZones: [
            { x: -3, y: 0.1, z: 10, radius: 1.5, class: 'Warrior', color: 0xff4444 },
            { x: 0, y: 0.1, z: 10, radius: 1.5, class: 'Mage', color: 0x4444ff },
            { x: 3, y: 0.1, z: 10, radius: 1.5, class: 'Healer', color: 0x44ff44 }
        ]
    },
    'scene_03': {
        name: 'Dragon Lair',
        spawns: [
            { x: 0, y: 0, z: -5, class: 'Warrior' },
            { x: -4, y: 0, z: 2, class: 'Mage' },
            { x: 4, y: 0, z: 2, class: 'Healer' }
        ],
        teleportZones: [
            { x: 0, y: 0.1, z: 10, radius: 2, class: 'Warrior', color: 0xff4444 },
            { x: -7, y: 0.1, z: 10, radius: 2, class: 'Mage', color: 0x4444ff },
            { x: 7, y: 0.1, z: 10, radius: 2, class: 'Healer', color: 0x44ff44 }
        ]
    }
};

// Get spawn position for a specific character
export function getSpawnPosition(sceneId, playerClass) {
    const scene = SCENE_CONFIG[sceneId];
    if (!scene) return { x: 0, y: 0, z: 0 };

    const spawn = scene.spawns.find(s => s.class === playerClass);
    return spawn || scene.spawns[0];
}

// Get teleport zone for a specific character
export function getTeleportZone(sceneId, playerClass) {
    const scene = SCENE_CONFIG[sceneId];
    if (!scene) return null;

    return scene.teleportZones.find(z => z.class === playerClass);
}

// Get next scene ID
export function getNextScene(currentSceneId) {
    const sceneIds = Object.keys(SCENE_CONFIG);
    const currentIndex = sceneIds.indexOf(currentSceneId);

    if (currentIndex === -1 || currentIndex === sceneIds.length - 1) {
        return null; // No next scene or end of game
    }

    return sceneIds[currentIndex + 1];
}
