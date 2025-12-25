/**
 * ChatChannelFilter - Logique de filtrage des messages par canal
 * Gère le filtrage côté serveur pour déterminer qui reçoit quels messages
 */

/**
 * Filtre les destinataires du chat local basé sur la distance
 * @param {Map} playerStates - États des joueurs (characterId => state)
 * @param {string} senderId - ID du personnage émetteur
 * @param {number} radius - Rayon de portée du chat local
 * @returns {Array<string>} Liste des characterIds dans le rayon
 */
function filterLocalChat(playerStates, senderId, radius) {
    const senderState = playerStates.get(senderId);
    if (!senderState || !senderState.position) {
        console.warn(`[ChatChannelFilter] Pas de position pour ${senderId}`);
        return [];
    }

    const nearbyPlayers = [];
    const senderPos = senderState.position;

    playerStates.forEach((state, characterId) => {
        // Ne pas inclure l'émetteur lui-même
        if (characterId === senderId) return;

        if (!state.position) return;

        // Calcul de la distance (2D, sur le plan XZ)
        const dx = state.position.x - senderPos.x;
        const dz = state.position.z - senderPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Si dans le rayon, ajouter à la liste
        if (distance <= radius) {
            nearbyPlayers.push(characterId);
        }
    });

    return nearbyPlayers;
}

/**
 * Filtre pour le chat de guilde
 * (Placeholder - à implémenter quand le système de guilde sera créé)
 * @param {Object} lobby - Données du lobby
 * @param {string} senderId - ID du personnage émetteur
 * @returns {Array<string>} Liste des characterIds de la guilde
 */
function filterGuildChat(lobby, senderId) {
    // Pour l'instant, retourne une liste vide
    // TODO: Implémenter la logique de guilde
    console.log('[ChatChannelFilter] Chat de guilde pas encore implémenté');
    return [];
}

/**
 * Filtre pour le chat global (tous les joueurs du lobby)
 * @param {Object} lobby - Données du lobby
 * @returns {Array<string>} Liste de tous les characterIds du lobby
 */
function filterGlobalChat(lobby) {
    return lobby.players.map(p => p.characterId);
}

module.exports = {
    filterLocalChat,
    filterGuildChat,
    filterGlobalChat
};
