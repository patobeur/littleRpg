/**
 * Simple Logger with ANSI colors for server terminal
 */

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",

    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        gray: "\x1b[90m",
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
    }
};

const Logger = {
    info: (msg, ...args) => console.log(`${colors.fg.cyan}[INFO]${colors.reset} ${msg}`, ...args),
    success: (msg, ...args) => console.log(`${colors.fg.green}[SUCCESS]${colors.reset} ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`${colors.fg.yellow}[WARN]${colors.reset} ${msg}`, ...args),
    error: (msg, ...args) => console.error(`${colors.fg.red}[ERROR]${colors.reset} ${msg}`, ...args),

    // Specific for game events
    chat: (player, message) => console.log(`${colors.fg.magenta}[CHAT]${colors.reset} ${colors.bright}${player}:${colors.reset} ${message}`),
    lobby: (msg, ...args) => console.log(`${colors.fg.blue}[LOBBY]${colors.reset} ${msg}`, ...args),
    game: (msg, ...args) => console.log(`${colors.fg.magenta}[GAME]${colors.reset} ${msg}`, ...args),
};

module.exports = Logger;
