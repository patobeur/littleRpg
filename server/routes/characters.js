// Character management routes
const express = require('express');
const router = express.Router();
const Character = require('../models/Character');
const { requireAuth } = require('../middleware/auth');
const { validateCharacterCreation } = require('../middleware/validation');

// All character routes require authentication
router.use(requireAuth);

// Get all characters for current user
router.get('/', async (req, res) => {
    try {
        const characters = await Character.findByUserId(req.session.userId);
        res.json({ characters });
    } catch (error) {
        console.error('Error fetching characters:', error);
        res.status(500).json({ error: 'Failed to fetch characters' });
    }
});

// Create new character
router.post('/', validateCharacterCreation, async (req, res) => {
    try {
        const { name, slotIndex, charClass } = req.body;

        const character = await Character.create(req.session.userId, name.trim(), slotIndex, charClass || 'Warrior');

        res.status(201).json({
            success: true,
            character,
        });
    } catch (error) {
        console.error('Error creating character:', error);
        res.status(400).json({ error: error.message });
    }
});

// Rename character
router.patch('/:id/rename', async (req, res) => {
    try {
        const characterId = parseInt(req.params.id, 10);
        const { name } = req.body;

        if (isNaN(characterId)) {
            return res.status(400).json({ error: 'Invalid character ID' });
        }

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        await Character.rename(characterId, req.session.userId, name);

        res.json({ success: true });
    } catch (error) {
        console.error('Error renaming character:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete character
router.delete('/:id', async (req, res) => {
    try {
        const characterId = parseInt(req.params.id, 10);

        if (isNaN(characterId)) {
            return res.status(400).json({ error: 'Invalid character ID' });
        }

        await Character.delete(characterId, req.session.userId);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting character:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
