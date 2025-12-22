// API client for authentication and data management
const API = {
    // Base fetch wrapper with error handling
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An error occurred');
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Authentication
    auth: {
        async register(username, email, password, confirmPassword) {
            return API.request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password, confirmPassword }),
            });
        },

        async login(username, password) {
            return API.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
        },

        async logout() {
            return API.request('/api/auth/logout', {
                method: 'POST',
            });
        },

        async checkSession() {
            return API.request('/api/auth/session');
        },
    },

    // Characters
    characters: {
        async getAll() {
            return API.request('/api/characters');
        },

        async create(name, slotIndex, charClass) {
            return API.request('/api/characters', {
                method: 'POST',
                body: JSON.stringify({ name, slotIndex, charClass }),
            });
        },

        async rename(id, name) {
            return API.request(`/api/characters/${id}/rename`, {
                method: 'PATCH',
                body: JSON.stringify({ name }),
            });
        },

        async delete(id) {
            return API.request(`/api/characters/${id}`, {
                method: 'DELETE',
            });
        },
    },

    // Users
    users: {
        async getProfile() {
            return API.request('/api/users/profile');
        },
    },
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
