const containers = {
    containers: {
        "1box_0": {
            id: "1box_0",
            name: "1box_0",
            stats: {
                hp: 500,
                physiqueArmor: 100,
                magicArmor: 100,
            },
            scale: 1,
            radius: 1,
            glb: "1box_0.fbx", // Using FBX as per user request/standard
            loot: {
                minGold: 10,
                maxGold: 25
            }
        },
        "3box_0": {
            id: "3box_0",
            name: "3box_0",
            stats: {
                hp: 1500,
                physiqueArmor: 100,
                magicArmor: 100,
            },
            scale: 1,
            radius: 1.5,
            glb: "3box_0.fbx",
            loot: {
                minGold: 30,
                maxGold: 75
            }
        }
    }
};

module.exports = containers;
