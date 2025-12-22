# ⚔️ LittleRPG

A local multiplayer RPG with account management featuring a dark fantasy aesthetic. Built with Node.js, Express, SQLite, and vanilla HTML/CSS/JS.

## Features

-  **Account Management**: Secure registration and login with bcrypt password hashing
-  **Character System**: Create up to 5 characters per account
-  **Profile Management**: View account information and character statistics
-  **Dark Fantasy UI**: Beautiful, responsive interface with gothic aesthetics
-  **Security**: HTTPOnly cookies, rate limiting, helmet protection, and server-side validation

## Tech Stack

-  **Backend**: Node.js, Express
-  **Database**: SQLite with automatic migrations
-  **Authentication**: express-session with HTTPOnly cookies, bcrypt
-  **Security**: helmet, express-rate-limit
-  **Frontend**: Vanilla HTML/CSS/JS (no heavy frameworks)
-  **Fonts**: Cinzel (headings), Inter (body text)

## Installation

1. **Clone or navigate to the project directory**:

   ```bash
   cd d:\laragon\www\littleRpg
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Install nodemon** (if not already installed):
   ```bash
   npm install --save-dev nodemon
   ```

## Running the Application

### Development Mode (with auto-restart)

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
│   ├── config.js              # Server configuration
│   ├── server.js              # Main Express server
│   ├── database/
│   │   ├── database.js        # SQLite connection wrapper
│   │   └── migrations.js      # Database migrations
│   ├── models/
│   │   ├── User.js           # User model
│   │   └── Character.js      # Character model
│   ├── middleware/
│   │   ├── auth.js           # Authentication middleware
│   │   └── validation.js     # Input validation
│   └── routes/
│       ├── auth.js           # Authentication endpoints
│       ├── characters.js     # Character management
│       └── users.js          # User profile endpoints
├── public/
│   ├── index.html            # Login page
│   ├── register.html         # Registration page
│   ├── profile.html          # User profile
│   ├── dashboard.html        # Character dashboard
│   ├── styles/
│   │   ├── main.css          # Base styles and variables
│   │   ├── components.css    # Reusable components
│   │   └── layouts.css       # Page layouts
│   └── js/
│       ├── api.js            # API client
│       └── utils.js          # Utility functions
├── data/                     # Created automatically
│   └── rpg.db               # SQLite database
├── package.json
└── README.md
```

## API Endpoints

### Authentication

-  `POST /api/auth/register` - Register new user
-  `POST /api/auth/login` - Login user
-  `POST /api/auth/logout` - Logout user
-  `GET /api/auth/session` - Check session status

### Characters

-  `GET /api/characters` - Get all user characters
-  `POST /api/characters` - Create new character
-  `DELETE /api/characters/:id` - Delete character

### Users

-  `GET /api/users/profile` - Get user profile

## Usage

1. **Start the server**: Run `npm run dev`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Register**: Create a new account
4. **Create characters**: Add up to 5 characters
5. **Manage profile**: View your account information

## Security Features

-  Passwords hashed with bcrypt (10 salt rounds)
-  HTTPOnly cookies for session management
-  Rate limiting on all endpoints (100 req/15min)
-  Stricter rate limiting on auth endpoints (5 req/15min)
-  Helmet.js for HTTP header security
-  Server-side input validation
-  SQL injection protection via parameterized queries
-  CSRF protection through SameSite cookies

## Configuration

Edit `server/config.js` to customize:

-  Server port (default: 3000)
-  Session secret (change in production!)
-  Rate limiting rules
-  Character slot limits
-  Validation rules

## Future Features

-  Multiplayer game functionality
-  Character classes and abilities
-  Inventory system
-  Real-time gameplay with WebSocket
-  Battle system

## Development

The project uses nodemon in development mode for automatic server restart on file changes.

To add new features:

1. Create database migration in `server/database/migrations.js`
2. Add models as needed in `server/models/`
3. Create routes in `server/routes/`
4. Build frontend UI in `public/`

## License

Apache-2.0

Ce projet inclut du code provenant de littleRpg (Patobeur).

## Attribution

Toute redistribution du code ou d’une version dérivée doit conserver la mention de copyright et la licence, en citant : "littleRpg — Patobeur".

Copyright (c) 2025 Patobeur
