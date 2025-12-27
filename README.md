# ⚔️ LittleRPG

[English](README_en.md) | [Español](README_es.md)

---

**LittleRPG** est un RPG multijoueur local avec gestion de compte, présentant une esthétique dark fantasy. Construit avec Node.js, Express, SQLite et HTML/CSS/JS vanilla.

### Fonctionnalités

#### 🎮 Gameplay & Esthétique

-  **Moteur Multijoueur**: Mouvement et synchronisation des joueurs en temps réel.
-  **Système de Caméra**: 3 modes de caméra commutables (Troisième personne, Vue de dessus, Isométrique).
-  **Générateur de Carte**: Outil intégré pour créer et éditer des cartes de jeu visuellement.
-  **Interface Dark Fantasy**: Design "Glassmorphism" immersif avec arrière-plans 4K et animations fluides.
-  **Navigation Responsive**: Menu burger adaptatif et mise en page fluide pour tous les appareils.

#### 👤 Compte & Progression

-  **Authentification Sécurisée**: Inscription, Connexion et Gestion de Session avec sécurité stricte.
-  **Système de Personnage**: Créer, renommer et supprimer des personnages avec des classes distinctes (Guerrier, Mage, Guérisseur, Archer).
-  **Conformité RGPD**: Bannière de consentement aux cookies avec logique d'opt-in.
-  **Politique de Session Unique**: Stratégie "Dernière connexion gagne" empêchant les sessions simultanées.

#### 🛠️ Administration & Outils

-  **Accès Basé sur les Rôles**: Système de rôles (SuperAdmin, Admin, Modérateur, Utilisateur).
-  **Tableau de Bord Admin**:
   -  **Statistiques**: Suivi en temps réel des visiteurs, des visites et des pages vues.
   -  **Journaux de Sécurité**: Surveillance des événements "Force Logout" et conflits de session.
   -  **Réinitialisation & Export**: Outils pour sauvegarder et effacer les données statistiques.

**Note :** `map_generator.html` et `stats.html` ont été déplacés vers des emplacements sécurisés accessibles uniquement via l'application serveur.

### Installation

1. **Cloner le dépôt**:

   ```bash
   git clone https://github.com/patobeur/littleRpg.git
   cd littleRpg
   ```

2. **Installer les dépendances**:

   ```bash
   npm install
   ```

3. **Installer nodemon** (optionnel, pour le développement):
   ```bash
   npm install --save-dev nodemon
   ```

### Lancer l'Application

-  **Mode Développement**: `npm run dev`
-  **Mode Production**: `npm start`

Le serveur démarrera sur `http://localhost:3000`

### Structure du Projet

```
littleRpg/
├── server/
│   ├── config.js               # Configuration
│   ├── session-manager.js      # Logique de Session Unique
│   ├── database/               # Base de données SQLite et Migrations
│   ├── models/                 # Modèles de Données
│   ├── middleware/             # Auth, Validation, VisitTracker
│   ├── routes/                 # Routes API
│   └── protected_views/        # VUES ADMIN SÉCURISÉES
│       ├── stats.html          # Tableau de Bord Statistiques
│       └── map_generator/      # Éditeur de Niveaux (index.html)
├── public/
│   ├── lobby.html              # Lobby du Jeu & Chat
│   ├── styles/                 # CSS
│   └── js/                     # Logique Client
└── data/                       # Stockage Base de Données
```

---

## License

Apache-2.0

_Ce projet inclut du code provenant de littleRpg (Patobeur)._

## Attribution

Toute redistribution du code ou d’une version dérivée doit conserver la mention de copyright et la licence, en citant : "littleRpg — Patobeur".

Copyright (c) 2025 Patobeur
