// Lobby page functionality
(async function () {
    // Protect page
    await protectPage();

    // Configure Socket.IO to match server (WebSocket only)
    const socket = io({
        transports: ['websocket'],
        upgrade: false
    });
    let currentLobby = null;
    let isReady = false;
    let myCharacter = null;

    // Load character and lobby info from session storage
    async function init() {
        const charData = sessionStorage.getItem('selectedCharacter');
        const lobbyData = sessionStorage.getItem('currentLobby');

        if (!charData) {
            alert('Aucun personnage sélectionné !');
            window.location.href = '/dashboard.html';
            return;
        }

        myCharacter = JSON.parse(charData);

        if (lobbyData) {
            // We're joining a lobby we just created or joined via dashboard
            currentLobby = JSON.parse(lobbyData);

            // If we just joined/created, we don't need to emit again, 
            // but we need to tell the server our socket ID is linked to this character
            const isCreation = sessionStorage.getItem('isLobbyOwner') === 'true';
            if (isCreation) {
                socket.emit('create_lobby', { character: myCharacter, scenarioId: currentLobby.scenarioId });
            } else {
                socket.emit('join_lobby', { code: currentLobby.code, character: myCharacter });
            }
        } else {
            window.location.href = '/dashboard.html';
        }
    }

    function renderLobby() {
        if (!currentLobby) return;

        document.getElementById('lobby-code').textContent = currentLobby.code;
        document.getElementById('player-count').textContent = currentLobby.players.length;

        const listContainer = document.getElementById('player-list');
        listContainer.innerHTML = '';

        // Calculate allReady and isHost for the Start Button logic
        const allReady = currentLobby.players.every(p => p.ready);
        const amIHost = currentLobby.host === socket.id;

        currentLobby.players.forEach(player => {
            const playerEl = document.createElement('div');
            playerEl.className = `player-item ${player.isHost ? 'is-host' : ''}`;
            playerEl.id = `player-${player.id}`;

            const isMe = player.id === socket.id;
            let actionHtml = '';

            // Add Buttons for current user
            if (isMe) {
                // Add Start Button if Host (before Ready button)
                if (amIHost) {
                    actionHtml += `
                        <button class="btn btn-primary btn-sm mr-2" id="my-start-btn" ${!allReady ? 'disabled' : ''} style="margin-right: 5px;">
                            🚩 Lancer
                        </button>
                     `;
                }

                // Add Ready Button for current user
                actionHtml += `
                    <button class="btn btn-sm ${isReady ? 'btn-secondary' : 'btn-primary'} mr-2" id="my-ready-btn" style="margin-right: 10px;">
                        ${isReady ? '❌ Pas Prêt' : '⚔️ Prêt !'}
                    </button>
                `;
            }

            playerEl.innerHTML = `
                <div class="player-info">
                    <div style="font-size: 1.5rem;">${player.isHost ? '👑' : '👤'}</div>
                    <div>
                        <div class="font-bold">${escapeHtml(player.name)} ${isMe ? '(Vous)' : ''}</div>
                        <div class="text-xs text-muted">${player.isHost ? 'Hôte' : 'Compagnon'}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center;">
                    ${actionHtml}
                    <div class="player-status ${player.ready ? 'status-ready' : 'status-waiting'}">
                        ${player.ready ? 'Prêt' : 'En attente...'}
                    </div>
                </div>
            `;
            listContainer.appendChild(playerEl);
        });

        // Attach listener to the new dynamic ready button
        const myReadyBtn = document.getElementById('my-ready-btn');
        if (myReadyBtn) {
            myReadyBtn.onclick = () => {
                isReady = !isReady;
                socket.emit('ready_status', { ready: isReady });
                renderLobby();
            };
        }

        // Attach listener to the new dynamic start button
        const myStartBtn = document.getElementById('my-start-btn');
        if (myStartBtn) {
            myStartBtn.onclick = () => {
                socket.emit('start_game');
            };
        }
    }

    // Socket listeners
    socket.on('lobby_created', (lobby) => {
        currentLobby = lobby;
        sessionStorage.setItem('currentLobby', JSON.stringify(lobby));
        renderLobby();
    });

    socket.on('lobby_joined', (lobby) => {
        currentLobby = lobby;
        sessionStorage.setItem('currentLobby', JSON.stringify(lobby));
        renderLobby();
    });

    socket.on('player_joined', (player) => {
        if (!currentLobby) return;
        // Check if player already exists in list (important for reconnection or double events)
        const exists = currentLobby.players.some(p => p.id === player.id);
        if (!exists) {
            currentLobby.players.push(player);
            renderLobby();
        }
    });

    socket.on('player_ready', ({ playerId, ready }) => {
        if (!currentLobby) return;
        const player = currentLobby.players.find(p => p.id === playerId);
        if (player) {
            player.ready = ready;
            if (playerId === socket.id) {
                // Ensure local state matches server state if triggered externally (though rare for ready)
                isReady = ready;
            }
            renderLobby();
        }
    });

    socket.on('player_left', ({ playerId }) => {
        if (!currentLobby) return;
        currentLobby.players = currentLobby.players.filter(p => p.id !== playerId);
        renderLobby();
    });

    socket.on('new_host', ({ hostId }) => {
        if (!currentLobby) return;
        currentLobby.host = hostId;
        currentLobby.players.forEach(p => p.isHost = (p.id === hostId));
        renderLobby();
        addChatMessage('Système', `Nouvel hôte assigné : ${escapeHtml(currentLobby.players.find(p => p.id === hostId)?.name)}`);
    });

    socket.on('chat_message', (data) => {
        addChatMessage(data.playerName, data.message, data.playerId === socket.id);
    });

    socket.on('game_started', (data) => {
        sessionStorage.setItem('gameData', JSON.stringify(data));
        if (currentLobby) {
            sessionStorage.setItem('lobbyCode', currentLobby.code);
        }
        window.location.href = '/game.html';
    });

    socket.on('error', (err) => {
        alert(err.message);
        // window.location.href = '/dashboard.html';
    });

    function addChatMessage(speaker, message, isMe) {
        const chatMessages = document.getElementById('chat-messages');
        const msgEl = document.createElement('div');
        msgEl.className = 'chat-message';
        msgEl.innerHTML = `
            <span class="player-name">${escapeHtml(speaker)}:</span>
            <span class="msg-content">${escapeHtml(message)}</span>
        `;
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Event listeners
    /* Removed global ready-btn listener as it is now dynamic */

    document.getElementById('leave-lobby-btn').addEventListener('click', () => {
        sessionStorage.removeItem('currentLobby');
        sessionStorage.removeItem('isLobbyOwner');
        window.location.href = '/dashboard.html';
    });

    document.getElementById('send-chat-btn').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (message) {
            socket.emit('send_message', { message });
            input.value = '';
        }
    }

    document.getElementById('start-game-btn').addEventListener('click', () => {
        socket.emit('start_game');
    });

    init();
})();
