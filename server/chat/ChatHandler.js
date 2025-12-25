/**
 * ChatHandler - Gestionnaire principal du chat côté serveur
 * Gère la réception, filtrage et diffusion des messages de chat
 */

const { filterLocalChat, filterGuildChat, filterGlobalChat } = require('./ChatChannelFilter');

class ChatHandler {
    constructor(lobbyManager) {
        this.lobbyManager = lobbyManager;

        // Rayon du chat local (doit correspondre à ChatChannels.js côté client)
        this.localChatRadius = 50;

        // Limite de caractères pour les messages
        this.maxMessageLength = 200;

        // Rate limiting simple (anti-spam)
        this.lastMessageTime = new Map(); // characterId => timestamp
        this.messageDelay = 500; // Minimum 500ms entre chaque message
    }

    /**
     * Traite un message de chat entrant
     * @param {Object} socket - Socket du client
     * @param {Object} data - Données du message
     */
    handleChatMessage(socket, data) {
        const { lobbyCode, characterId, channel, message, timestamp } = data;

        // Validation de base
        if (!lobbyCode || !characterId || !channel || !message) {
            console.warn('[ChatHandler] Données de message invalides', data);
            return;
        }

        // Rate limiting (anti-spam)
        const now = Date.now();
        const lastTime = this.lastMessageTime.get(characterId) || 0;
        if (now - lastTime < this.messageDelay) {
            console.warn(`[ChatHandler] Spam détecté pour ${characterId}`);
            return;
        }
        this.lastMessageTime.set(characterId, now);

        // Nettoyer le message
        const cleanMessage = this.sanitizeMessage(message);
        if (!cleanMessage) {
            console.warn('[ChatHandler] Message vide après nettoyage');
            return;
        }

        // Obtenir le lobby
        const lobby = this.lobbyManager.lobbies.get(lobbyCode);
        if (!lobby) {
            console.warn(`[ChatHandler] Lobby ${lobbyCode} introuvable`);
            return;
        }

        // Trouver le joueur
        const player = lobby.players.find(p => p.characterId === characterId);
        if (!player) {
            console.warn(`[ChatHandler] Joueur ${characterId} non trouvé dans lobby ${lobbyCode}`);
            return;
        }

        // Diffuser le message selon le canal
        this.broadcastToChannel(lobbyCode, channel, {
            channel,
            playerName: player.name,
            message: cleanMessage,
            timestamp: now
        }, characterId);

        console.log(`[ChatHandler] Message de ${player.name} sur ${channel}: ${cleanMessage}`);
    }

    /**
     * Diffuse un message sur un canal spécifique
     * @param {string} lobbyCode - Code du lobby
     * @param {string} channel - Nom du canal
     * @param {Object} messageData - Données du message à diffuser
     * @param {string} senderId - ID du personnage émetteur
     */
    broadcastToChannel(lobbyCode, channel, messageData, senderId) {
        const lobby = this.lobbyManager.lobbies.get(lobbyCode);
        if (!lobby) return;

        let recipients = [];

        // Déterminer les destinataires selon le canal
        switch (channel) {
            case 'local':
                recipients = this.getLocalRecipients(lobbyCode, senderId);
                // Ajouter l'émetteur lui-même pour voir son message
                recipients.push(senderId);
                break;

            case 'global':
                recipients = filterGlobalChat(lobby);
                break;

            case 'guild':
                recipients = filterGuildChat(lobby, senderId);
                // Ajouter l'émetteur
                recipients.push(senderId);
                break;

            case 'console':
                // Les joueurs ne peuvent pas envoyer dans la console
                console.warn(`[ChatHandler] Tentative d'envoi dans console par ${senderId}`);
                return;

            default:
                console.warn(`[ChatHandler] Canal inconnu: ${channel}`);
                return;
        }

        // Envoyer le message aux destinataires
        recipients.forEach(characterId => {
            const recipient = lobby.players.find(p => p.characterId === characterId);
            if (recipient) {
                // Envoyer via socket
                this.lobbyManager.io.to(recipient.id).emit('chat_message', messageData);
            }
        });
    }

    /**
     * Obtient les joueurs à portée pour le chat local
     * @param {string} lobbyCode - Code du lobby
     * @param {string} senderId - ID du personnage émetteur
     * @returns {Array<string>} Liste des characterIds à portée
     */
    getLocalRecipients(lobbyCode, senderId) {
        const playerStates = this.lobbyManager.playerStates;
        return filterLocalChat(playerStates, senderId, this.localChatRadius);
    }

    /**
     * Nettoie et valide un message
     * @param {string} text - Message à nettoyer
     * @returns {string} Message nettoyé
     */
    sanitizeMessage(text) {
        if (!text || typeof text !== 'string') return '';

        // Trim et limite de longueur
        let clean = text.trim();
        if (clean.length > this.maxMessageLength) {
            clean = clean.substring(0, this.maxMessageLength);
        }

        // Supprimer les caractères de contrôle
        clean = clean.replace(/[\x00-\x1F\x7F]/g, '');

        return clean;
    }

    /**
     * Envoie un message système à tous les joueurs d'un lobby
     * @param {string} lobbyCode - Code du lobby
     * @param {string} text - Texte du message système
     */
    sendSystemMessage(lobbyCode, text) {
        this.lobbyManager.io.to(lobbyCode).emit('system_message', {
            message: text,
            timestamp: Date.now()
        });
    }

    /**
     * Envoie un message système à un joueur spécifique
     * @param {string} socketId - ID du socket du joueur
     * @param {string} text - Texte du message système
     */
    sendSystemMessageToPlayer(socketId, text) {
        this.lobbyManager.io.to(socketId).emit('system_message', {
            message: text,
            timestamp: Date.now()
        });
    }
}

module.exports = ChatHandler;
