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
                API.characters.getAll()
            ]);

            currentUser = sessionData.user;
            characters = charactersData.characters;

            // Update welcome message
            document.getElementById('welcome-message').textContent =
                `Welcome, ${currentUser.username}!`;

            // Render character slots
            renderCharacterSlots();

            // Enable create game button if user has at least one character
            document.getElementById('create-game-btn').disabled = characters.length === 0;
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    // Render character slots
    function renderCharacterSlots() {
        const slotsContainer = document.getElementById('character-slots');
        slotsContainer.innerHTML = '';

        for (let i = 0; i < MAX_SLOTS; i++) {
            const character = characters.find(c => c.slot_index === i);
            const slotEl = createSlotElement(i, character);
            slotsContainer.appendChild(slotEl);
        }
    }

    // Create slot element
    function createSlotElement(slotIndex, character) {
        const div = document.createElement('div');

        if (character) {
            // Filled slot
            div.className = 'character-slot filled';
            const classImg = character.class === 'Warrior' ? 'tank.png' : (character.class === 'Mage' ? 'mage.png' : 'healer.png');
            div.innerHTML = `
        <div class="character-name">${character.name}</div>
        <div class="flex items-center gap-4 mb-4">
            <img src="/medias/archetypes/${classImg}" style="width: 60px; height: 60px; border-radius: 8px; border: 1px solid var(--color-border);">
            <div class="text-left">
                <div class="badge badge-primary">${getClassName(character.class)}</div>
                <div class="text-xs text-muted mt-1">Level ${character.level}</div>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs text-left mb-4 w-full">
            <div>💪 Str: ${character.strength}</div>
            <div>🧠 Int: ${character.intelligence}</div>
            <div>⚡ Dex: ${character.dexterity}</div>
            <div>❤️ HP: ${character.max_hp}</div>
        </div>
        <div class="character-actions">
          <button class="btn btn-sm btn-secondary rename-btn" data-character-id="${character.id}">
            Rename
          </button>
          <button class="btn btn-sm btn-danger delete-btn" data-character-id="${character.id}">
            Delete
          </button>
        </div>
      `;

            // Add delete handler
            const deleteBtn = div.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCharacter(character.id);
            });

            // Add rename handler
            const renameBtn = div.querySelector('.rename-btn');
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openRenameModal(character.id, character.name);
            });

            // Add selection handler
            div.addEventListener('click', () => {
                const alreadySelected = div.classList.contains('selected');
                document.querySelectorAll('.character-slot').forEach(s => s.classList.remove('selected'));

                if (!alreadySelected) {
                    div.classList.add('selected');
                    selectedCharacter = character;
                } else {
                    selectedCharacter = null;
                }
            });
        } else {
            // Empty slot
            div.className = 'character-slot empty';
            div.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem;">+</div>
        <div style="color: var(--color-text-muted);">Create Character</div>
      `;
            div.addEventListener('click', () => openCreateModal(slotIndex));
        }

        return div;
    }

    // Open create character modal
    function openCreateModal(slotIndex) {
        document.getElementById('selected-slot').value = slotIndex;
        document.getElementById('character-name').value = '';
        document.getElementById('create-character-modal').classList.remove('hidden');
        hideMessage('error-message');
        hideMessage('success-message');
    }

    // Close modal
    function closeModal() {
        document.getElementById('create-character-modal').classList.add('hidden');
    }

    // Rename modal
    function openRenameModal(id, currentName) {
        document.getElementById('rename-character-id').value = id;
        document.getElementById('new-character-name').value = currentName;
        document.getElementById('rename-character-modal').classList.remove('hidden');
    }

    function closeRenameModal() {
        document.getElementById('rename-character-modal').classList.add('hidden');
    }

    // Helper for class names
    function getClassName(charClass) {
        switch (charClass) {
            case 'Warrior': return 'Guerrier';
            case 'Mage': return 'Mage';
            case 'Healer': return 'Soigneur';
            default: return charClass;
        }
    }

    // Create character
    async function createCharacter(name, slotIndex, charClass) {
        const submitBtn = document.querySelector('#create-character-form button[type="submit"]');

        try {
            setLoading(submitBtn, true);
            hideMessage('error-message');

            await API.characters.create(name, slotIndex, charClass);

            closeModal();
            showSuccess('Character created successfully!', 'success-message');

            // Reload dashboard
            await loadDashboard();
        } catch (error) {
            showError(error.message || 'Failed to create character');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // Rename character
    async function renameCharacter(id, name) {
        const submitBtn = document.querySelector('#rename-character-form button[type="submit"]');

        try {
            setLoading(submitBtn, true);
            await API.characters.rename(id, name);
            closeRenameModal();
            showSuccess('Character renamed successfully!', 'success-message');
            await loadDashboard();
        } catch (error) {
            alert(error.message || 'Failed to rename character');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // Delete character
    async function deleteCharacter(characterId) {
        if (!confirm('Are you sure you want to delete this character?')) {
            return;
        }

        try {
            hideMessage('error-message');
            hideMessage('success-message');

            await API.characters.delete(characterId);

            showSuccess('Character deleted successfully!', 'success-message');

            // Reload dashboard
            await loadDashboard();
        } catch (error) {
            showError(error.message || 'Failed to delete character');
        }
    }

    // Logout handler
    async function handleLogout() {
        try {
            await API.auth.logout();
            redirectTo('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // Event listeners
    document.getElementById('create-character-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('character-name').value.trim();
        const slotIndex = parseInt(document.getElementById('selected-slot').value);
        const charClass = document.querySelector('input[name="charClass"]:checked')?.value || 'Warrior';

        // Validate
        const nameError = validateCharacterName(name);
        if (nameError) {
            showError(nameError);
            return;
        }

        await createCharacter(name, slotIndex, charClass);
    });

    document.getElementById('rename-character-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('rename-character-id').value;
        const name = document.getElementById('new-character-name').value.trim();

        const nameError = validateCharacterName(name);
        if (nameError) {
            alert(nameError);
            return;
        }

        await renameCharacter(id, name);
    });

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    document.getElementById('close-rename-modal').addEventListener('click', closeRenameModal);
    document.getElementById('cancel-rename-btn').addEventListener('click', closeRenameModal);

    document.getElementById('logout-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    document.getElementById('create-game-btn').addEventListener('click', () => {
        if (!selectedCharacter) {
            alert('Please select a character first!');
            return;
        }
        document.getElementById('lobby-selection-modal').classList.remove('hidden');
    });

    document.getElementById('close-lobby-modal').addEventListener('click', () => {
        document.getElementById('lobby-selection-modal').classList.add('hidden');
    });

    document.getElementById('create-game-action').addEventListener('click', () => {
        sessionStorage.setItem('selectedCharacter', JSON.stringify(selectedCharacter));
        sessionStorage.setItem('isLobbyOwner', 'true');
        sessionStorage.setItem('currentLobby', JSON.stringify({ code: '......', players: [] })); // Placeholder
        window.location.href = '/lobby.html';
    });

    document.getElementById('join-lobby-btn').addEventListener('click', () => {
        const code = document.getElementById('lobby-code-input').value.trim().toUpperCase();
        if (!code || code.length !== 6) {
            alert('Please enter a valid 6-character code.');
            return;
        }

        sessionStorage.setItem('selectedCharacter', JSON.stringify(selectedCharacter));
        sessionStorage.setItem('isLobbyOwner', 'false');
        sessionStorage.setItem('currentLobby', JSON.stringify({ code: code, players: [] })); // Placeholder
        window.location.href = '/lobby.html';
    });

    // Close modal when clicking outside
    document.getElementById('create-character-modal').addEventListener('click', (e) => {
        if (e.target.id === 'create-character-modal') {
            closeModal();
        }
    });

    document.getElementById('lobby-selection-modal').addEventListener('click', (e) => {
        if (e.target.id === 'lobby-selection-modal') {
            document.getElementById('lobby-selection-modal').classList.add('hidden');
        }
    });

    document.getElementById('rename-character-modal').addEventListener('click', (e) => {
        if (e.target.id === 'rename-character-modal') {
            closeRenameModal();
        }
    });

    // Load dashboard on page load
    loadDashboard();
})();
