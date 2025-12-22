// Input validation middleware
const config = require('../config');

// Validate registration input
function validateRegistration(req, res, next) {
    const { username, email, password, confirmPassword } = req.body;

    // Check required fields
    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate username format
    const { minLength: userMin, maxLength: userMax, pattern } = config.validation.username;
    if (username.length < userMin || username.length > userMax) {
        return res.status(400).json({
            error: `Username must be between ${userMin} and ${userMax} characters`,
        });
    }

    if (!pattern.test(username)) {
        return res.status(400).json({
            error: 'Username can only contain letters, numbers, and underscores',
        });
    }

    // Validate email format
    const emailPattern = config.validation.email.pattern;
    if (!emailPattern.test(email)) {
        return res.status(400).json({
            error: 'Please enter a valid email address',
        });
    }

    // Validate password
    const { minLength: passMin } = config.validation.password;
    if (password.length < passMin) {
        return res.status(400).json({
            error: `Password must be at least ${passMin} characters long`,
        });
    }

    // Check password confirmation
    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    next();
}

// Validate login input
function validateLogin(req, res, next) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    next();
}

// Validate character creation input
function validateCharacterCreation(req, res, next) {
    const { name, slotIndex } = req.body;

    if (!name || slotIndex === undefined) {
        return res.status(400).json({ error: 'Character name and slot are required' });
    }

    const { nameMinLength, nameMaxLength, maxSlots } = config.characters;

    if (typeof name !== 'string' || name.trim().length < nameMinLength || name.trim().length > nameMaxLength) {
        return res.status(400).json({
            error: `Character name must be between ${nameMinLength} and ${nameMaxLength} characters`,
        });
    }

    const slot = parseInt(slotIndex, 10);
    if (isNaN(slot) || slot < 0 || slot >= maxSlots) {
        return res.status(400).json({
            error: `Slot index must be between 0 and ${maxSlots - 1}`,
        });
    }

    // Add parsed slot to request
    req.body.slotIndex = slot;

    next();
}

module.exports = {
    validateRegistration,
    validateLogin,
    validateCharacterCreation,
};
