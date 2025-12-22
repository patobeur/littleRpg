const enemies = {
	enemies: {
		Alistar: {
			name: "Alistar",
			type: "tank",
			classe: "Warrior",
			stats: {
				speed: 1,
				detectionRange: 5,
				hitDistance: 1,
				autoAttackDamage: 1,
				autoAttackCd: 1,
				strength: 23, intelligence: 5, dexterity: 18, hp: 450, mana: 20,
				physiqueArmor: 35,
				magicArmor: 15,
			},
			scale: 2,
			radius: 0.5,
			xp: 1,
			lv: 4,
			inventory: [],
			png: "Alistar.png",
			glb: "Alistar.fbx",
			animations: {
				walk_path: "enemies/animations/Alistar_Walk.fbx",
				autoattack_path: "enemies/animations/Alistar_AutoAttack.fbx",
				dying_path: "enemies/animations/Alistar_Dying.fbx",
				skill1_path: "enemies/animations/Alistar_Skill1.fbx",
				skill2_path: "enemies/animations/Alistar_Skill2.fbx",
				skill3_path: "enemies/animations/Alistar_Skill3.fbx",
				ultimat_path: "enemies/animations/Alistar_Ultimat.fbx",
			},
		}
	}
};

module.exports = enemies;
