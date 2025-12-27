# ⚔️ LittleRPG

[Français](README.md) | [Español](README_es.md)

---

**LittleRPG** is a local multiplayer RPG with account management, featuring a dark fantasy aesthetic. Built with Node.js, Express, SQLite, and vanilla HTML/CSS/JS.

### Features

#### 🎮 Gameplay & Aesthetics

-  **Multiplayer Engine**: Real-time player movement and synchronization.
-  **Camera System**: 3 switchable camera modes (Third-Person, Top-Down, Isometric).
-  **Map Generator**: Built-in tool to create and edit game maps visually.
-  **Dark Fantasy UI**: Immersive "Glassmorphism" design with 4K backgrounds and smooth animations.
-  **Responsive Navigation**: Adaptive burger menu and fluid layout for all devices.

#### 👤 Account & Progression

-  **Secure Authentication**: Registration, Login, and Session Management with strict security.
-  **Character System**: Create, rename, and delete characters with distinct classes (Warrior, Mage, Healer, Archer).
-  **GDPR Compliance**: Cookie consent banner with opt-in tracking logic.
-  **Single Session Policy**: "Last Login Wins" strategy prevents concurrent sessions on multiple devices.

#### 🛠️ Admin & Tools

-  **Role-Based Access**: Role system (SuperAdmin, Admin, Moderator, User).
-  **Admin Dashboard**:
   -  **Statistics**: Real-time tracking of visitors, visits, and page views.
   -  **Security Logs**: Monitoring of "Force Logout" events and session conflicts.
   -  **Reset & Export**: Tools to backup and clear statistical data.

**Note:** `map_generator.html` and `stats.html` have been moved to secured locations accessible only via the server application.

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/patobeur/littleRpg.git
   cd littleRpg
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Install nodemon** (optional, for development):
   ```bash
   npm install --save-dev nodemon
   ```

### Running the Application

-  **Development Mode**: `npm run dev`
-  **Production Mode**: `npm start`

The server will start on `http://localhost:3000`

### Project Structure

```
littleRpg/
├── server/
│   ├── config.js               # Configuration
│   ├── session-manager.js      # Single Session Enforcement Logic
│   ├── database/               # SQLite DB and Migrations
│   ├── models/                 # Data Models
│   ├── middleware/             # Auth, Validation, VisitTracker
│   ├── routes/                 # API Routes
│   └── protected_views/        # SECURED ADMIN VIEWS
│       ├── stats.html          # Admin Statistics Dashboard
│       └── map_generator/      # Level Editor Tool (index.html)
├── public/
│   ├── lobby.html              # Game Lobby & Chat
│   ├── styles/                 # CSS
│   └── js/                     # Client-side Logic
└── data/                       # Database Storage
```

---

## License

Apache-2.0

_This project includes code from littleRpg (Patobeur)._

## Attribution

Any redistribution of code or derived version must retain the copyright notice and license, citing: "littleRpg — Patobeur".

Copyright (c) 2025 Patobeur
