/**
 * ChatManager - Gestionnaire principal du système de chat en jeu
 * Coordonne l'UI, les événements réseau et la logique des canaux
 */

import { ChatUI } from './ChatUI.js';
import { ChatChannels } from './ChatChannels.js';

export class ChatManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.ui = null;
        this.currentChannel = 'global'; // Canal par défaut
        this.isInitialized = false;
    }

    /**
     * Initialise le système de chat
     */
    init() {
        if (this.isInitialized) return;

        // Créer l'interface
        this.ui = new ChatUI(this);
        this.ui.init();

        // Configurer les événements réseau
        this.setupNetworkEvents();

        this.isInitialized = true;
        console.log('[ChatManager] Chat système initialisé');

        // Message de bienvenue
        this.addSystemMessage('Tchat en jeu activé. Utilisez les onglets pour changer de canal.');
    }

    /**
     * Configure les événements Socket.IO pour le chat
     */
    setupNetworkEvents() {
        const socket = this.gameEngine.networkManager.socket;

        // Réception d'un message de chat
        socket.on('chat_message', (data) => {
            this.receiveMessage(data);
        });

        // Message système (connexion, déconnexion, etc.)
        socket.on('system_message', (data) => {
            this.addSystemMessage(data.message);
        });
    }

    /**
     * Envoie un message sur le canal actif
     * @param {string} text - Texte du message
     */
    sendMessage(text) {
        if (!text || text.trim().length === 0) return;

        const socket = this.gameEngine.networkManager.socket;
        const lobbyCode = sessionStorage.getItem('lobbyCode');
        const characterId = this.gameEngine.localCharacterId;

        // Données du message
        const messageData = {
            lobbyCode: lobbyCode,
            characterId: characterId,
            channel: this.currentChannel,
            message: text.trim(),
            timestamp: Date.now()
        };

        // Envoyer au serveur
        socket.emit('chat_message', messageData);

        console.log(`[ChatManager] Message envoyé sur ${this.currentChannel}: ${text}`);
    }

    /**
     * Reçoit un message du serveur
     * @param {Object} data - Données du message
     */
    receiveMessage(data) {
        // Ajouter le message à l'UI
        this.ui.addMessage({
            channel: data.channel,
            playerName: data.playerName,
            message: data.message,
            timestamp: data.timestamp,
            isSystem: false
        });

        // Indicateur si chat réduit
        this.ui.showNewMessageIndicator();
    }

    /**
     * Ajoute un message système dans la console
     * @param {string} text - Texte du message
     */
    addSystemMessage(text) {
        this.ui.addMessage({
            channel: 'console',
            message: text,
            timestamp: Date.now(),
            isSystem: true
        });

        this.ui.showNewMessageIndicator();
    }

    /**
     * Change le canal actif
     * @param {string} channelName - Nom du canal
     */
    switchChannel(channelName) {
        if (!ChatChannels[channelName]) {
            console.warn(`[ChatManager] Canal inconnu: ${channelName}`);
            return;
        }

        this.currentChannel = channelName;
        this.ui.setActiveTab(channelName);

        console.log(`[ChatManager] Canal changé: ${channelName}`);

        // Message de confirmation
        const config = ChatChannels[channelName];
        this.addSystemMessage(`Canal changé: ${config.name} ${config.icon}`);
    }

    /**
     * Nettoie le chat (changement de scène)
     */
    clear() {
        if (this.ui) {
            this.ui.clear();
        }
    }

    /**
     * Obtient le canal actuel
     * @returns {string} Nom du canal actif
     */
    getCurrentChannel() {
        return this.currentChannel;
    }
}
