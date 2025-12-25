/**
 * ChatUI - Gestion de l'interface utilisateur du chat
 * Crée et gère l'affichage du chat en jeu
 */

import { ChatChannels, getAvailableChannels } from './ChatChannels.js';

export class ChatUI {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.container = null;
        this.messagesContainer = null;
        this.inputElement = null;
        this.tabsContainer = null;
        this.isExpanded = true; // Chat ouvert par défaut
        this.messageHistory = []; // Historique des messages
        this.maxMessages = 100; // Maximum de messages conservés
    }

    /**
     * Initialise l'interface du chat
     */
    init() {
        this.createChatContainer();
        this.setupEventListeners();
    }

    /**
     * Crée la structure HTML du chat
     */
    createChatContainer() {
        // Conteneur principal
        this.container = document.createElement('div');
        this.container.id = 'game-chat-container';
        this.container.className = 'game-chat-container';

        // En-tête avec onglets
        const header = document.createElement('div');
        header.className = 'game-chat-header';

        // Conteneur des onglets
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.className = 'game-chat-tabs';
        this.createTabs();

        // Bouton toggle (expand/collapse)
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'game-chat-toggle';
        toggleBtn.innerHTML = '▼';
        toggleBtn.title = 'Réduire/Agrandir';
        toggleBtn.onclick = () => this.toggleChat();

        header.appendChild(this.tabsContainer);
        header.appendChild(toggleBtn);

        // Zone des messages
        this.messagesContainer = document.createElement('div');
        this.messagesContainer.className = 'game-chat-messages';

        // Zone d'input
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'game-chat-input-wrapper';

        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.className = 'game-chat-input';
        this.inputElement.placeholder = 'Entrez votre message...';
        this.inputElement.maxLength = 200;

        inputWrapper.appendChild(this.inputElement);

        // Assemblage
        this.container.appendChild(header);
        this.container.appendChild(this.messagesContainer);
        this.container.appendChild(inputWrapper);

        // Ajout au DOM
        document.body.appendChild(this.container);
    }

    /**
     * Crée les onglets de canaux
     */
    createTabs() {
        const channels = getAvailableChannels();

        channels.forEach(channelKey => {
            const config = ChatChannels[channelKey];
            const tab = document.createElement('button');
            tab.className = 'game-chat-tab';
            tab.dataset.channel = channelKey;
            tab.innerHTML = `${config.icon} <span>${config.name}</span>`;
            tab.title = config.description;
            tab.onclick = () => this.chatManager.switchChannel(channelKey);

            // Premier onglet actif par défaut
            if (channelKey === 'global') {
                tab.classList.add('active');
            }

            this.tabsContainer.appendChild(tab);
        });
    }

    /**
     * Configure les événements
     */
    setupEventListeners() {
        // Envoi de message avec Enter
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.inputElement.value.trim()) {
                this.chatManager.sendMessage(this.inputElement.value.trim());
                this.inputElement.value = '';
            }

            // Empêcher la propagation pour ne pas affecter les contrôles du jeu
            e.stopPropagation();
        });

        // Désactiver les contrôles du jeu quand l'input est focus
        this.inputElement.addEventListener('focus', () => {
            if (this.chatManager.gameEngine.inputManager) {
                this.chatManager.gameEngine.inputManager.chatActive = true;
            }
        });

        this.inputElement.addEventListener('blur', () => {
            if (this.chatManager.gameEngine.inputManager) {
                this.chatManager.gameEngine.inputManager.chatActive = false;
            }
        });
    }

    /**
     * Ajoute un message au chat
     * @param {Object} data - Données du message
     */
    addMessage(data) {
        const { channel, playerName, message, timestamp, isSystem } = data;

        // Créer l'élément message
        const messageEl = document.createElement('div');
        messageEl.className = 'game-chat-message';

        // Couleur du canal
        const channelConfig = ChatChannels[channel] || ChatChannels.global;
        messageEl.style.borderLeftColor = channelConfig.color;

        // Timestamp
        const time = new Date(timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

        // Contenu
        if (isSystem) {
            messageEl.classList.add('system');
            messageEl.innerHTML = `
                <span class="game-chat-time">${timeStr}</span>
                <span class="game-chat-system">${message}</span>
            `;
        } else {
            messageEl.innerHTML = `
                <span class="game-chat-time">${timeStr}</span>
                <span class="game-chat-player" style="color: ${channelConfig.color}">${playerName}:</span>
                <span class="game-chat-text">${this.escapeHtml(message)}</span>
            `;
        }

        // Ajouter au conteneur
        this.messagesContainer.appendChild(messageEl);
        this.messageHistory.push(messageEl);

        // Limiter l'historique
        if (this.messageHistory.length > this.maxMessages) {
            const oldest = this.messageHistory.shift();
            oldest.remove();
        }

        // Auto-scroll vers le bas
        this.scrollToBottom();
    }

    /**
     * Échappe le HTML pour éviter les injections
     * @param {string} text - Texte à échapper
     * @returns {string} Texte échappé
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Scroll automatique vers le bas
     */
    scrollToBottom() {
        if (this.isExpanded) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    /**
     * Change l'onglet actif
     * @param {string} channelName - Nom du canal
     */
    setActiveTab(channelName) {
        const tabs = this.tabsContainer.querySelectorAll('.game-chat-tab');
        tabs.forEach(tab => {
            if (tab.dataset.channel === channelName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Désactiver l'input si c'est un canal système
        const config = ChatChannels[channelName];
        if (config && config.systemOnly) {
            this.inputElement.disabled = true;
            this.inputElement.placeholder = 'Canal système - lecture seule';
        } else {
            this.inputElement.disabled = false;
            this.inputElement.placeholder = 'Entrez votre message...';
        }
    }

    /**
     * Réduit/Agrandit le chat
     */
    toggleChat() {
        this.isExpanded = !this.isExpanded;

        if (this.isExpanded) {
            this.container.classList.remove('collapsed');
            const toggleBtn = this.container.querySelector('.game-chat-toggle');
            toggleBtn.innerHTML = '▼';
            this.scrollToBottom();
        } else {
            this.container.classList.add('collapsed');
            const toggleBtn = this.container.querySelector('.game-chat-toggle');
            toggleBtn.innerHTML = '▲';
        }
    }

    /**
     * Affiche un indicateur de nouveau message (si le chat est réduit)
     */
    showNewMessageIndicator() {
        if (!this.isExpanded) {
            this.container.classList.add('has-new-message');

            // Retirer l'indicateur après expansion
            const removeIndicator = () => {
                this.container.classList.remove('has-new-message');
            };

            this.container.addEventListener('click', removeIndicator, { once: true });
        }
    }

    /**
     * Nettoie l'interface (pour changement de scène, etc.)
     */
    clear() {
        this.messagesContainer.innerHTML = '';
        this.messageHistory = [];
    }
}
