const npcs = {
	npcs: {
		Peter: {
			id: "npc_peter_intro",
			type: "npc",
			name: "Peter",
			model: "Peter.fbx", // Correct path based on file structure
			position: { x: 0, y: 0, z: 0 }, // Spawn at 0,0,0 as requested

			data: {},
			dialogue_id: 0,
			scale: 1,
			radius: 0.5,
			xp: 75,
			lv: 4,
			inventory: [],
			png: "Peter.jpg",
			glb: "Peter.fbx",
			animations: {
				//walk_path: "animations/Peter_Walk.fbx",
			},
		},
		Peter0: {
			id: "npc_peter_intro",
			type: "npc",
			name: "Peter0",
			model: "Peter0.fbx", // Correct path based on file structure
			position: { x: 0, y: 0, z: 0 }, // Spawn at 0,0,0 as requested

			data: {},
			dialogue_id: 1,
			scale: 1,
			radius: 0.5,
			xp: 75,
			lv: 4,
			inventory: [],
			png: "Peter0.jpg",
			glb: "Peter0.fbx",
			animations: {
				//walk_path: "animations/Peter_Walk.fbx",
			},
		},
	},
};

module.exports = npcs;
