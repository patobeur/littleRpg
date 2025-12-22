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
            const characters = charactersData.characters;

            // Update UI
            document.getElementById('profile-username').textContent = user.username;
            document.getElementById('profile-avatar').textContent = getInitials(user.username);
            document.getElementById('profile-date').textContent = formatDate(user.created_at);
            document.getElementById('character-count').textContent = characters.length;
        } catch (error) {
            console.error('Failed to load profile:', error);
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
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    // Load data on page load
    loadProfile();
})();
