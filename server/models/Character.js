// Character model
const database = require('../database/database');
const config = require('../config');
const archetypes = require('./archetypes');

class Character {
    // Create a new character
    static async create(userId, name, slotIndex, charClass) {
        try {
            // Validate character name
            if (!this.validateName(name)) {
                throw new Error('Invalid character name');
            }

            // Validate slot index
            if (slotIndex < 0 || slotIndex >= config.characters.maxSlots) {
                throw new Error(`Slot index must be between 0 and ${config.characters.maxSlots - 1}`);
            }

            // Check if slot is already occupied
            const existingCharacter = await database.get(
                'SELECT id FROM characters WHERE user_id = ? AND slot_index = ?',
                [userId, slotIndex]
            );

            if (existingCharacter) {
                throw new Error('Slot is already occupied');
            }

            // Set base stats based on class
            const baseStats = this.getBaseStats(charClass);

            // Insert character
            const result = await database.run(
                `INSERT INTO characters (
                    user_id, name, slot_index, class, 
                    strength, intelligence, dexterity, 
                    max_hp, current_hp, max_mana, current_mana
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId, name, slotIndex, charClass,
                    baseStats.strength, baseStats.intelligence, baseStats.dexterity,
                    baseStats.hp, baseStats.hp, baseStats.mana, baseStats.mana
                ]
            );

            return {
                id: result.lastID,
                user_id: userId,
                name,
                slot_index: slotIndex,
                class: charClass,
                level: 1,
                experience: 0,
                ...baseStats
            };
        } catch (error) {
            throw error;
        }
    }

    // Get all characters for a user
    static async findByUserId(userId) {
        const characters = await database.all(
            `SELECT * 
       FROM characters 
       WHERE user_id = ? 
       ORDER BY slot_index ASC`,
            [userId]
        );
        return characters;
    }

    // Get character by ID
    static async findById(id) {
        const character = await database.get(
            'SELECT * FROM characters WHERE id = ?',
            [id]
        );
        return character;
    }

    // Delete a character
    static async delete(id, userId) {
        const result = await database.run(
            'DELETE FROM characters WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.changes === 0) {
            throw new Error('Character not found or unauthorized');
        }

        return true;
    }

    // Rename a character
    static async rename(id, userId, newName) {
        if (!this.validateName(newName)) {
            throw new Error('Invalid character name');
        }

        const result = await database.run(
            'UPDATE characters SET name = ? WHERE id = ? AND user_id = ?',
            [newName.trim(), id, userId]
        );

        if (result.changes === 0) {
            throw new Error('Character not found or unauthorized');
        }

        return true;
    }

    // Update character level and experience
    static async updateProgress(id, level, experience) {
        await database.run(
            'UPDATE characters SET level = ?, experience = ? WHERE id = ?',
            [level, experience, id]
        );
    }

    // Validate character name
    static validateName(name) {
        const { nameMinLength, nameMaxLength } = config.characters;
        return (
            name &&
            typeof name === 'string' &&
            name.trim().length >= nameMinLength &&
            name.trim().length <= nameMaxLength
        );
    }

    // Get base stats for a class
    static getBaseStats(charClass) {
        // Use stats from archetypes.js
        const archetype = archetypes.chars[charClass];
        if (!archetype) {
            // Default to Warrior if class not found
            return archetypes.chars.Warrior.stats;
        }
        return archetype.stats;
    }

    // Update character position in DB
    static async updatePosition(id, x, y, z, rotation) {
        console.log(`[Character DB] Updating char ${id} to x=${x.toFixed(2)}, z=${z.toFixed(2)}`);
        await database.run(
            'UPDATE characters SET pos_x = ?, pos_y = ?, pos_z = ?, rotation_y = ? WHERE id = ?',
            [x, y, z, rotation, id]
        );
    }

    // Update character's current scene
    static async updateScene(id, sceneId) {
        console.log(`[Character DB] Moving char ${id} to scene ${sceneId}`);
        await database.run(
            'UPDATE characters SET current_scene_id = ? WHERE id = ?',
            [sceneId, id]
        );
    }

    // Reset position for scene change
    static async resetPositionForScene(id, sceneId) {
        console.log(`[Character DB] Resetting position for char ${id} in scene ${sceneId}`);
        await database.run(
            'UPDATE characters SET pos_x = 0, pos_y = 0, pos_z = 0, rotation_y = 0, current_scene_id = ? WHERE id = ?',
            [sceneId, id]
        );
    }

    // Clear position when game ends (position only persists during active game)
    static async clearPosition(id) {
        console.log(`[Character DB] Clearing position for char ${id} (game ended)`);
        await database.run(
            'UPDATE characters SET pos_x = NULL, pos_y = NULL, pos_z = NULL, rotation_y = NULL, current_scene_id = NULL WHERE id = ?',
            [id]
        );
    }
}

module.exports = Character;
