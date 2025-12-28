const dialogues = {
	dialogues: {
		0: {
			type: {
				// solo texte ?
				// plus de possibilité plus tard
			},
			dialogue: [
				"Bonjour voyageur ! Bienvenue dans le monde de LittleRPG.",
				"Attention aux monstres qui rôdent aux alentours...",
			],
			local_dialogue: {
				// repeat
				delay: 100, //sec entre chaques
				dialogues: ["Approchez-vous voyageur !"],
			},
		},
		1: {
			type: {
				// solo texte ?
				// plus de possibilité plus tard
			},
			dialogue: [
				"Ola voyageur ! Bienvenue dans le monde de LittleRPG.",
				"Attention aux monstres qui rôdent aux alentours...",
			],
			local_dialogue: {
				// repeat
				delay: 100, //sec entre chaques
				dialogues: ["Approchez-vous inconnu !"],
			},
		},
	},
};

module.exports = dialogues;
