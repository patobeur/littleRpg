# ⚔️ LittleRPG

A local multiplayer RPG with account management, featuring a dark fantasy aesthetic. Built with Node.js, Express, SQLite, and vanilla HTML/CSS/JS.

## Features

### 🎮 Gameplay & Aesthetics
- **Multiplayer Engine**: Real-time player movement and synchronization.
- **Camera System**: 3 switchable camera modes (Third-Person, Top-Down, Isometric).
- **Map Generator**: Built-in tool (`/map_generator.html`) to create and edit game maps visually.
- **Dark Fantasy UI**: Immersive "Glassmorphism" design with 4K backgrounds and smooth animations.
- **Responsive Navigation**: Adaptive burger menu and fluid layout for all devices.

### 👤 Account & Progression
- **Secure Authentication**: Registration, Login, and Session Management with strict security.
- **Character System**: Create, rename, and delete characters with distinct classes (Warrior, Mage, Healer, Archer).
- **GDPR Compliance**: Cookie consent banner with opt-in tracking logic.
- **Single Session Policy**: "Last Login Wins" strategy prevents concurrent sessions on multiple devices.

### 🛠️ Admin & Tools
- **Role-Based Access**: Role system (SuperAdmin, Admin, Moderator, User).
- **Admin Dashboard**:
    - **Statistics**: Real-time tracking of visitors, visits, and page views.
    - **Security Logs**: Monitoring of "Force Logout" events and session conflicts.
    - **Reset & Export**: Tools to backup and clear statistical data.

## Tech Stack

- **Backend**: Node.js, Express, Socket.io (implied usage for multiplayer)
- **Database**: SQLite with automatic migrations
- **Authentication**: `express-session`, `bcrypt`, Custom Session Manager
- **Security**: `helmet`, `csurf` (CSRF tokens), `express-rate-limit`, Input Sanitization (`escapeHtml`)
- **Frontend**: Vanilla HTML/CSS/JS (Lightweight, no frameworks)
- **Fonts**: Cinzel (Headings), Inter (Body)

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd d:\laragon\www\littleRpg
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install nodemon** (optional, for dev):
   ```bash
   npm install --save-dev nodemon
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## Project Structure

```
littleRpg/
├── server/
│   ├── config.js               # Configuration (Session, Ports, etc.)
│   ├── session-manager.js      # Single Session Enforcement Logic
│   ├── database/               # SQLite DB and Migrations
│   ├── models/                 # Data Models (User, Character, Visit)
│   ├── middleware/             # Auth, Validation, VisitTracker
│   └── routes/                 # API Routes (Auth, Stats, Characters)
├── public/
│   ├── map_generator.html      # Level Editor Tool
│   ├── stats.html              # Admin Statistics Dashboard
│   ├── lobby.html              # Game Lobby & Chat
│   ├── styles/                 # CSS (Components, Layouts, Home)
│   └── js/                     # Client-side Logic
└── data/                       # Database Storage
```

## Security Features

- **XSS Protection**: Comprehensive input sanitization on chat and lobby.
- **Session Security**: HTTPOnly cookies, Double-Submit CSRF implementation.
- **Brute Force Protection**: Rate limiting on sensitive endpoints.
- **Identity Enforcement**: Automatic invalidation of old sessions upon new login.
- **Audit Logging**: Tracking of security-critical events.

## License

Apache-2.0

*Ce projet inclut du code provenant de littleRpg (Patobeur).*

## Attribution

Toute redistribution du code ou d’une version dérivée doit conserver la mention de copyright et la licence, en citant : "littleRpg — Patobeur".

Copyright (c) 2025 Patobeur
