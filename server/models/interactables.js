const interactables = {
    // Defines types/templates
    templates: {
        npc: {
            radius: 1.5,
            action: 'dialogue'
        },
        chest: {
            radius: 1.0,
            action: 'loot'
        }
    },
    // Instances in the world
    list: [
        {
            id: 'npc_peter_intro',
            type: 'npc',
            name: 'Peter',
            model: 'npc/Peter.fbx', // Correct path based on file structure
            position: { x: 0, y: 0, z: 0 }, // Spawn at 0,0,0 as requested
            scale: 1,
            data: {
                dialogue: [
                    "Bonjour voyageur ! Bienvenue dans le monde de LittleRPG.",
                    "Attention aux monstres qui rôdent aux alentours..."
                ]
            }
        }
    ]
};

module.exports = interactables;
