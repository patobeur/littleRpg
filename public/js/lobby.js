// Lobby page functionality
(async function () {
    // Protect page
    await protectPage();

    const socket = io();
    let currentLobby = null;
    let isReady = false;
    let myCharacter = null;

    // Load character and lobby info from session storage
    async function init() {
        const charData = sessionStorage.getItem('selectedCharacter');
        const lobbyData = sessionStorage.getItem('currentLobby');

        if (!charData) {
            alert('No character selected!');
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
                socket.emit('create_lobby', { character: myCharacter });
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

        currentLobby.players.forEach(player => {
            const playerEl = document.createElement('div');
            playerEl.className = `player-item ${player.isHost ? 'is-host' : ''}`;
            playerEl.id = `player-${player.id}`;

            playerEl.innerHTML = `
                <div class="player-info">
                    <div style="font-size: 1.5rem;">${player.isHost ? '👑' : '👤'}</div>
                    <div>
                        <div class="font-bold">${player.name} ${player.id === socket.id ? '(You)' : ''}</div>
                        <div class="text-xs text-muted">${player.isHost ? 'Host' : 'Comrade'}</div>
                    </div>
                </div>
                <div class="player-status ${player.ready ? 'status-ready' : 'status-waiting'}">
                    ${player.ready ? 'Ready' : 'Waiting...'}
                </div>
            `;
            listContainer.appendChild(playerEl);
        });

        // Update my ready button state
        const readyBtn = document.getElementById('ready-btn');
        if (isReady) {
            readyBtn.textContent = '❌ UNREADY';
            readyBtn.classList.replace('btn-primary', 'btn-secondary');
        } else {
            readyBtn.textContent = '⚔️ I\'M READY !';
            readyBtn.classList.replace('btn-secondary', 'btn-primary');
        }

        // Show start button if I'm host and everyone is ready
        const startBtn = document.getElementById('start-game-btn');
        const isHost = currentLobby.host === socket.id;
        const allReady = currentLobby.players.every(p => p.ready);

        if (isHost) {
            startBtn.classList.remove('hidden');
            startBtn.disabled = !allReady;
        } else {
            startBtn.classList.add('hidden');
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
        addChatMessage('System', `New host assigned: ${currentLobby.players.find(p => p.id === hostId)?.name}`);
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
            <span class="player-name">${speaker}:</span>
            <span class="msg-content">${message}</span>
        `;
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Event listeners
    document.getElementById('ready-btn').addEventListener('click', () => {
        isReady = !isReady;
        socket.emit('ready_status', { ready: isReady });
        renderLobby();
    });

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
