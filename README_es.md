# ⚔️ LittleRPG

[English](README_en.md) | [Français](README.md)

---

**LittleRPG** es un RPG multijugador local con gestión de cuentas, con una estética de fantasía oscura. Construido con Node.js, Express, SQLite y HTML/CSS/JS vainilla.

### Características

#### 🎮 Jugabilidad y Estética

-  **Motor Multijugador**: Movimiento y sincronización de jugadores en tiempo real.
-  **Sistema de Cámara**: 3 modos de cámara conmutables (Tercera persona, Vista superior, Isométrica).
-  **Generador de Mapas**: Herramienta integrada para crear y editar mapas del juego visualmente.
-  **UI de Fantasía Oscura**: Diseño inmersivo "Glassmorphism" con fondos 4K y animaciones fluidas.
-  **Navegación Responsiva**: Menú hamburguesa adaptable y diseño fluido para todos los dispositivos.

#### 👤 Cuenta y Progresión

-  **Autenticación Segura**: Registro, Inicio de sesión y Gestión de sesiones con seguridad estricta.
-  **Sistema de Personajes**: Crear, renombrar y eliminar personajes con distintas clases (Guerrero, Mago, Sanador, Arquero).
-  **Cumplimiento RGPD**: Banner de consentimiento de cookies con lógica de aceptación (opt-in).
-  **Política de Sesión Única**: La estrategia "El último inicio de sesión gana" evita sesiones simultáneas en múltiples dispositivos.

#### 🛠️ Administración y Herramientas

-  **Acceso Basado en Roles**: Sistema de roles (SuperAdmin, Admin, Moderador, Usuario).
-  **Panel de Administración**:
   -  **Estadísticas**: Seguimiento en tiempo real de visitantes, visitas y páginas vistas.
   -  **Registros de Seguridad**: Monitoreo de eventos de "Cierre de sesión forzado" y conflictos de sesión.
   -  **Restablecer y Exportar**: Herramientas para respaldar y borrar datos estadísticos.

**Nota:** `map_generator.html` y `stats.html` se han movido a ubicaciones seguras accesibles solo a través de la aplicación del servidor.

### Instalación

1. **Clonar el repositorio**:

   ```bash
   git clone https://github.com/patobeur/littleRpg.git
   cd littleRpg
   ```

2. **Instalar dependencias**:

   ```bash
   npm install
   ```

3. **Instalar nodemon** (opcional, para desarrollo):
   ```bash
   npm install --save-dev nodemon
   ```

### Ejecutar la Aplicación

-  **Modo Desarrollo**: `npm run dev`
-  **Modo Producción**: `npm start`

El servidor se iniciará en `http://localhost:3000`

### Estructura del Proyecto

```
littleRpg/
├── server/
│   ├── config.js               # Configuración
│   ├── session-manager.js      # Lógica de sesión única
│   ├── database/               # Base de datos SQLite y migraciones
│   ├── models/                 # Modelos de datos
│   ├── middleware/             # Autenticación, validación
│   ├── routes/                 # Rutas de la API
│   └── protected_views/        # VISTAS DE ADMINISTRACIÓN SEGURAS
│       ├── stats.html          # Panel de estadísticas
│       └── map_generator/      # Editor de niveles (index.html)
├── public/
│   ├── lobby.html              # Lobby del juego y chat
│   ├── styles/                 # CSS
│   └── js/                     # Lógica del cliente
└── data/                       # Almacenamiento de base de datos
```

---

## Licencia

Apache-2.0

_Este proyecto incluye código de littleRpg (Patobeur)._

## Atribución

Cualquier redistribución del código o versión derivada debe conservar el aviso de copyright y la licencia, citando: "littleRpg — Patobeur".

Copyright (c) 2025 Patobeur
