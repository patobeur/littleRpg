// Dashboard page functionality
(async function () {
	// Protect page
	await protectPage();

	const MAX_SLOTS = 3;
	let characters = [];
	let currentUser = null;
	let selectedCharacter = null;

	// Load dashboard data
	async function loadDashboard() {
		try {
			const [sessionData, charactersData] = await Promise.all([
				API.auth.checkSession(),
				API.characters.getAll(),
			]);

			currentUser = sessionData.user;
			characters = charactersData.characters;

			// Update welcome message
			document.getElementById(
				"welcome-message"
			).textContent = `Bienvenue, ${currentUser.username} !`;

			// Render character slots
			renderCharacterSlots();

			// Enable create game button if user has at least one character
			document.getElementById("create-game-btn").disabled =
				characters.length === 0;

			loadScenarios(); // Load scenarios for the modal
		} catch (error) {
			console.error("Failed to load dashboard:", error);
		}
	}

	// Render character slots
	function renderCharacterSlots() {
		const slotsContainer = document.getElementById("character-slots");
		slotsContainer.innerHTML = "";

		for (let i = 0; i < MAX_SLOTS; i++) {
			const character = characters.find((c) => c.slot_index === i);
			const slotEl = createSlotElement(i, character);
			slotsContainer.appendChild(slotEl);
		}
	}

	// Create slot element
	function createSlotElement(slotIndex, character) {
		const div = document.createElement("div");

		if (character) {
			// Filled slot
			div.className = "character-slot filled";
			const classImg =
				character.class === "Warrior"
					? "tank.jpg"
					: character.class === "Mage"
						? "mage.jpg"
						: "healer.jpg";
			div.innerHTML = `
        <div class="slot-header">
            <img class="slot-image" src="/medias/archetypes/${classImg}" alt="${character.class
				}">
            <div class="slot-info">
                <div class="character-name">${character.name}</div>
                <div class="slot-meta">
                    <span class="badge badge-primary">${getClassName(
					character.class
				)}</span>
                    <span class="text-xs text-muted">Niv. ${character.level
				}</span>
                </div>
            </div>
        </div>
        
        <div class="slot-stats-grid">
            <div class="stat-entry"><span class="stat-icon">💪</span> <span class="stat-val">${character.strength
				}</span></div>
            <div class="stat-entry"><span class="stat-icon">🧠</span> <span class="stat-val">${character.intelligence
				}</span></div>
            <div class="stat-entry"><span class="stat-icon">⚡</span> <span class="stat-val">${character.dexterity
				}</span></div>
            <div class="stat-entry"><span class="stat-icon">❤️</span> <span class="stat-val">${character.max_hp
				}</span></div>
        </div>

        <div class="character-actions">
          <button class="btn btn-sm btn-secondary rename-btn" data-character-id="${character.id
				}">
            Renommer
          </button>
          <button class="btn btn-sm btn-danger delete-btn" data-character-id="${character.id
				}">
            Supprimer
          </button>
        </div>
      `;

			// Add delete handler
			const deleteBtn = div.querySelector(".delete-btn");
			deleteBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				deleteCharacter(character.id);
			});

			// Add rename handler
			const renameBtn = div.querySelector(".rename-btn");
			renameBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				openRenameModal(character.id, character.name);
			});

			// Add selection handler
			div.addEventListener("click", () => {
				const alreadySelected = div.classList.contains("selected");
				document
					.querySelectorAll(".character-slot")
					.forEach((s) => s.classList.remove("selected"));

				if (!alreadySelected) {
					div.classList.add("selected");
					selectedCharacter = character;
				} else {
					selectedCharacter = null;
				}
			});
		} else {
			// Empty slot
			div.className = "character-slot empty";
			div.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem;">+</div>
        <div style="color: var(--color-text-muted);">Créer Personnage</div>
      `;
			div.addEventListener("click", () => openCreateModal(slotIndex));
		}

		return div;
	}

	// Open create character modal
	function openCreateModal(slotIndex) {
		document.getElementById("selected-slot").value = slotIndex;
		document.getElementById("character-name").value = "";
		document
			.getElementById("create-character-modal")
			.classList.remove("hidden");
		hideMessage("error-message");
		hideMessage("success-message");
	}

	// Close modal
	function closeModal() {
		document.getElementById("create-character-modal").classList.add("hidden");
	}

	// Rename modal
	function openRenameModal(id, currentName) {
		document.getElementById("rename-character-id").value = id;
		document.getElementById("new-character-name").value = currentName;
		document
			.getElementById("rename-character-modal")
			.classList.remove("hidden");
	}

	function closeRenameModal() {
		document.getElementById("rename-character-modal").classList.add("hidden");
	}

	// Helper for class names
	function getClassName(charClass) {
		switch (charClass) {
			case "Warrior":
				return "Guerrier";
			case "Mage":
				return "Mage";
			case "Healer":
				return "Soigneur";
			default:
				return charClass;
		}
	}

	// Create character
	async function createCharacter(name, slotIndex, charClass) {
		const submitBtn = document.querySelector(
			'#create-character-form button[type="submit"]'
		);

		try {
			setLoading(submitBtn, true);
			hideMessage("error-message");

			await API.characters.create(name, slotIndex, charClass);

			closeModal();
			showSuccess("Personnage créé avec succès !", "success-message");

			// Reload dashboard
			await loadDashboard();
		} catch (error) {
			showError(error.message || "Échec de la création du personnage");
		} finally {
			setLoading(submitBtn, false);
		}
	}

	// Rename character
	async function renameCharacter(id, name) {
		const submitBtn = document.querySelector(
			'#rename-character-form button[type="submit"]'
		);

		try {
			setLoading(submitBtn, true);
			await API.characters.rename(id, name);
			closeRenameModal();
			showSuccess("Personnage renommé avec succès !", "success-message");
			await loadDashboard();
		} catch (error) {
			alert(error.message || "Échec du renommage du personnage");
		} finally {
			setLoading(submitBtn, false);
		}
	}

	// Delete character
	async function deleteCharacter(characterId) {
		if (!confirm("Êtes-vous sûr de vouloir supprimer ce personnage ?")) {
			return;
		}

		try {
			hideMessage("error-message");
			hideMessage("success-message");

			await API.characters.delete(characterId);

			showSuccess("Personnage supprimé avec succès !", "success-message");

			// Reload dashboard
			await loadDashboard();
		} catch (error) {
			showError(error.message || "Échec de la suppression du personnage");
		}
	}

	// Logout handler
	async function handleLogout() {
		try {
			await API.auth.logout();
			redirectTo("/");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	}

	// Event listeners
	document
		.getElementById("create-character-form")
		.addEventListener("submit", async (e) => {
			e.preventDefault();

			const name = document.getElementById("character-name").value.trim();
			const slotIndex = parseInt(
				document.getElementById("selected-slot").value
			);
			const charClass =
				document.querySelector('input[name="charClass"]:checked')?.value ||
				"Warrior";

			// Validate
			const nameError = validateCharacterName(name);
			if (nameError) {
				showError(nameError);
				return;
			}

			await createCharacter(name, slotIndex, charClass);
		});

	document
		.getElementById("rename-character-form")
		.addEventListener("submit", async (e) => {
			e.preventDefault();
			const id = document.getElementById("rename-character-id").value;
			const name = document
				.getElementById("new-character-name")
				.value.trim();

			const nameError = validateCharacterName(name);
			if (nameError) {
				alert(nameError);
				return;
			}

			await renameCharacter(id, name);
		});

	document.getElementById("close-modal").addEventListener("click", closeModal);
	document.getElementById("cancel-btn").addEventListener("click", closeModal);

	document
		.getElementById("close-rename-modal")
		.addEventListener("click", closeRenameModal);
	document
		.getElementById("cancel-rename-btn")
		.addEventListener("click", closeRenameModal);

	document.getElementById("logout-link")?.addEventListener("click", (e) => {
		e.preventDefault();
		handleLogout();
	});

	document.getElementById("create-game-btn").addEventListener("click", () => {
		if (!selectedCharacter) {
			alert("Veuillez d'abord sélectionner un personnage !");
			return;
		}
		document
			.getElementById("lobby-selection-modal")
			.classList.remove("hidden");
	});

	document
		.getElementById("close-lobby-modal")
		.addEventListener("click", () => {
			document
				.getElementById("lobby-selection-modal")
				.classList.add("hidden");
		});

	// Load scenarios
	async function loadScenarios() {
		try {
			const response = await fetch("/api/scenarios");
			const scenarios = await response.json();

			const select = document.getElementById("scenario-select");
			select.innerHTML = "";

			scenarios.forEach((sc) => {
				const opt = document.createElement("option");
				opt.value = sc.id;
				opt.innerText = sc.name;
				select.appendChild(opt);
			});

			if (scenarios.length === 0) {
				const opt = document.createElement("option");
				opt.innerText = "Aucun scénario trouvé";
				select.appendChild(opt);
			}
		} catch (e) {
			console.error("Failed to load scenarios", e);
			document.getElementById("scenario-select").innerHTML =
				"<option>Erreur de chargement des scénarios</option>";
		}
	}

	// ... (rest of code)

	// Global Loading Modal
	function showGlobalLoading(message = 'Chargement...') {
		let modal = document.getElementById('global-loading-modal');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'global-loading-modal';
			modal.style.cssText = `
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 50000;
                color: white;
                font-family: 'Cinzel', serif;
            `;
			document.body.appendChild(modal);
		}

		modal.innerHTML = `
            <div style="text-align: center;">
                <div style="
                    width: 50px; 
                    height: 50px; 
                    border: 4px solid #333; 
                    border-top: 4px solid #8b5cf6; 
                    border-radius: 50%; 
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px auto;
                "></div>
                <h2 style="font-size: 2rem; color: white; margin: 0;">${message}</h2>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
		modal.style.display = 'flex';
	}

	function hideGlobalLoading() {
		const modal = document.getElementById('global-loading-modal');
		if (modal) {
			modal.style.display = 'none';
		}
	}

	// Load dashboard on page load
	showGlobalLoading('Chargement du Dashboard...');
	loadDashboard().then(() => hideGlobalLoading());

	// ... Event Listeners updates ...

	document
		.getElementById("create-game-btn-confirm")
		.addEventListener("click", () => {
			const scenarioId = document.getElementById("scenario-select").value;
			if (!scenarioId) {
				alert("Veuillez sélectionner un scénario");
				return;
			}

			showGlobalLoading('Création du salon...');

			// Small delay to let the modal render before redirection (which freezes UI)
			setTimeout(() => {
				sessionStorage.setItem(
					"selectedCharacter",
					JSON.stringify(selectedCharacter)
				);
				sessionStorage.setItem("isLobbyOwner", "true");
				// Store scenarioId so lobby.js can use it
				sessionStorage.setItem(
					"currentLobby",
					JSON.stringify({
						code: "......",
						players: [],
						scenarioId: scenarioId,
					})
				);
				window.location.href = "/lobby.html";
			}, 500);
		});

	document.getElementById("join-lobby-btn").addEventListener("click", () => {
		const code = document
			.getElementById("lobby-code-input")
			.value.trim()
			.toUpperCase();
		if (!code || code.length !== 6) {
			alert("Veuillez entrer un code valide de 6 caractères.");
			return;
		}

		showGlobalLoading('Rejoindre le salon...');

		setTimeout(() => {
			sessionStorage.setItem(
				"selectedCharacter",
				JSON.stringify(selectedCharacter)
			);
			sessionStorage.setItem("isLobbyOwner", "false");
			sessionStorage.setItem(
				"currentLobby",
				JSON.stringify({ code: code, players: [] })
			); // Placeholder
			window.location.href = "/lobby.html";
		}, 500);
	});

	// Close modal when clicking outside
	document
		.getElementById("create-character-modal")
		.addEventListener("click", (e) => {
			if (e.target.id === "create-character-modal") {
				closeModal();
			}
		});

	document
		.getElementById("lobby-selection-modal")
		.addEventListener("click", (e) => {
			if (e.target.id === "lobby-selection-modal") {
				document
					.getElementById("lobby-selection-modal")
					.classList.add("hidden");
			}
		});

	document
		.getElementById("rename-character-modal")
		.addEventListener("click", (e) => {
			if (e.target.id === "rename-character-modal") {
				closeRenameModal();
			}
		});
})();
