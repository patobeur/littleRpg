/**
 * Configuration des canaux de chat
 * Définit les propriétés de chaque canal disponible
 */

export const ChatChannels = {
    /**
     * Chat local - visible uniquement par les joueurs à proximité
     */
    local: {
        name: 'Local',
        color: '#10b981', // Vert
        icon: '📍',
        radius: 50, // Rayon de portée en unités de jeu
        description: 'Messages visibles à proximité'
    },

    /**
     * Chat global - visible par tous les joueurs du lobby
     */
    global: {
        name: 'Global',
        color: '#3b82f6', // Bleu
        icon: '🌍',
        description: 'Messages visibles par tous'
    },

    /**
     * Chat de guilde - réservé aux membres de la guilde
     * (Placeholder pour future implémentation)
     */
    guild: {
        name: 'Guilde',
        color: '#8b5cf6', // Violet
        icon: '⚔️',
        description: 'Messages de guilde',
        disabled: true // Désactivé pour l'instant
    },

    /**
     * Console système - messages système et debug
     */
    console: {
        name: 'Console',
        color: '#f59e0b', // Orange
        icon: '⚙️',
        description: 'Messages système',
        systemOnly: true // Les joueurs ne peuvent pas écrire ici
    }
};

/**
 * Obtient la configuration d'un canal
 * @param {string} channelName - Nom du canal
 * @returns {Object} Configuration du canal
 */
export function getChannelConfig(channelName) {
    return ChatChannels[channelName] || ChatChannels.global;
}

/**
 * Retourne la liste des canaux disponibles (non désactivés)
 * @returns {Array<string>} Noms des canaux disponibles
 */
export function getAvailableChannels() {
    return Object.keys(ChatChannels).filter(key => !ChatChannels[key].disabled);
}
