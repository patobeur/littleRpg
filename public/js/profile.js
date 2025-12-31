// Profile page functionality
(async function () {
    // Protect page
    await protectPage();

    // Load profile data
    async function loadProfile() {
        try {
            const [profileData, charactersData] = await Promise.all([
                API.users.getProfile(),
                API.characters.getAll()
            ]);

            const user = profileData.user;
            const characters = charactersData.characters || [];

            // 1. Render User Info
            document.getElementById('profile-username').textContent = user.username;
            document.getElementById('profile-email').textContent = user.email || 'Non renseigné';
            document.getElementById('profile-id').textContent = '#' + user.id.toString().padStart(4, '0');
            document.getElementById('profile-role').textContent = (user.role || 'user').toUpperCase();
            document.getElementById('member-since').textContent = formatDate(user.created_at);

            // Avatar (Initials)
            const avatarEl = document.getElementById('profile-avatar');
            avatarEl.textContent = getInitials(user.username);
            avatarEl.style.backgroundColor = stringToColor(user.username);
            avatarEl.style.color = '#fff';

            // 2. Calculate Stats
            const totalLevel = characters.reduce((acc, char) => acc + (char.level || 1), 0);
            const totalGold = characters.reduce((acc, char) => acc + (char.gold || 0), 0);
            // Note: Silver/Copper not summed for simplicity, or we could add them if needed

            document.getElementById('total-characters').textContent = characters.length;
            document.getElementById('total-level').textContent = totalLevel;
            document.getElementById('total-gold').textContent = totalGold.toLocaleString() + ' G';

            // 3. Render Characters List
            renderCharacterList(characters);

            // 4. Check Character Limit (Max 3)
            const createBtn = document.getElementById('create-char-btn');
            if (createBtn) {
                if (characters.length >= 3) {
                    createBtn.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('Failed to load profile:', error);
            alert('Impossible de charger le profil via API.');
        }
    }

    function renderCharacterList(characters) {
        const container = document.getElementById('characters-list');
        container.innerHTML = '';

        if (characters.length === 0) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-8 text-muted border border-dashed border-gray-700 rounded-lg">
                    <div class="text-4xl mb-2">👻</div>
                    <p>Aucun personnage trouvé.</p>
                </div>
            `;
            return;
        }

        characters.forEach(char => {
            const card = document.createElement('div');
            card.className = 'character-card'; // Changed to use CSS class

            // Class Icon/Image
            const classImages = {
                'Warrior': 'tank.jpg',
                'Mage': 'mage.jpg',
                'Healer': 'healer.jpg',
                'Archer': 'archer.jpg'
            };
            const imgUrl = `/medias/archetypes/${classImages[char.class] || 'tank.jpg'}`;

            card.innerHTML = `
                <img src="${imgUrl}" alt="${char.class}" class="character-thumb">
                <div class="character-details">
                    <div class="character-header">
                        <h4 class="character-name text-white">${char.name}</h4>
                        <span class="badge badge-primary text-xs">${char.class}</span>
                    </div>
                    <div class="character-stats-row">
                        <span class="stat-highlight">⚡ Niv. ${char.level}</span>
                        <span class="text-yellow-600">💰 ${char.gold || 0} G</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Helper: Generate consistent color from string
    function stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }

    function formatMapName(sceneId) {
        if (!sceneId) return 'Inconnu';
        return sceneId.charAt(0).toUpperCase() + sceneId.slice(1).replace('_', ' ');
    }

    // Initial load
    loadProfile();
})();
