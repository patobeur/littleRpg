const archetypes = {
	types: {
		"tank": ["warrior"],
		"dps": ["mage"],
		"support": ["healer"],
	}, // pour plus tard : "Rogue", "Ranger", "Assassin", "Archer"
	chars: {
		Warrior: {
			name: "Bob",
			type: "tank",
			classe: "Warrior",
			stats: {
				speed: 1,
				detectionRange: 5,
				hitDistance: 1,
				autoAttackDamage: 1,
				autoAttackCd: 1,
				strength: 15, intelligence: 5, dexterity: 8, hp: 150, mana: 20,
				physiqueArmor: 20,
				magicArmor: 0,
			},
			scale: 1,
			radius: 0.1, // Fixed collision radius
			fbx: "tank.fbx",
			png: "tank.png",
		},
		Mage: {
			name: "Alice",
			type: "dps",
			classe: "Mage",
			stats: {
				speed: 1.2,
				detectionRange: 6,
				hitDistance: 1,
				autoAttackDamage: 1,
				autoAttackCd: 1,
				strength: 5, intelligence: 15, dexterity: 8, hp: 100, mana: 150,
				physiqueArmor: 0,
				magicArmor: 0,
			},
			scale: 1,
			radius: 0.1,
			fbx: "mage.fbx",
			png: "mage.png",
		},
		Healer: {
			name: "Charles",
			type: "support",
			classe: "Healer",
			stats: {
				speed: 1.1,
				detectionRange: 6,
				hitDistance: 1,
				autoAttackDamage: 1,
				autoAttackCd: 1,
				strength: 6, intelligence: 12, dexterity: 10, hp: 100, mana: 100,
				physiqueArmor: 0,
				magicArmor: 20,
			},
			scale: 1,
			radius: 0.1,
			fbx: "healer.fbx",
			png: "healer.png",
		},
	},
};

module.exports = archetypes;
