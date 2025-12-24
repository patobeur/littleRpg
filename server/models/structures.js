const structures = {
	structures: {
		house: {
			name: "house",
			stats: {
				hp: 10000,
				physiqueArmor: 50,
				magicArmor: 30,
			},
			scale: 1,
			radius: 3,
			glb: "house.fbx",// dans public\structures
		},
		rock: {
			name: "rock",
			stats: {
				hp: 5000,
				physiqueArmor: 100,
				magicArmor: 100,
			},
			scale: 1,
			radius: 2,
			glb: "Rock_1.fbx",
		},
		tree: {
			name: "tree",
			stats: {
				hp: 5000,
				physiqueArmor: 100,
				magicArmor: 100,
			},
			scale: 1,
			radius: 2,
			glb: "CommonTree_1.fbx",
		}
	}
};

module.exports = structures;
