// User model
const bcrypt = require('bcrypt');
const database = require('../database/database');
const config = require('../config');

const SALT_ROUNDS = 10;

class User {
    // Create a new user
    static async create(username, email, password, role = 'user') {
        try {
            // Validate username
            if (!this.validateUsername(username)) {
                throw new Error('Invalid username format');
            }

            // Validate email
            if (!this.validateEmail(email)) {
                throw new Error('Invalid email format');
            }

            // Validate password
            if (!this.validatePassword(password)) {
                throw new Error('Password must be at least 8 characters long');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

            // Insert user
            const result = await database.run(
                'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [username, email, passwordHash, role]
            );

            return {
                id: result.lastID,
                username,
                email,
                role,
            };
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                if (error.message.includes('email')) {
                    throw new Error('Email already exists');
                } else {
                    throw new Error('Username already exists');
                }
            }
            throw error;
        }
    }

    // Find user by ID
    static async findById(id) {
        const user = await database.get(
            'SELECT id, username, email, role, avatar_url, created_at FROM users WHERE id = ?',
            [id]
        );
        return user;
    }

    // Find user by username
    static async findByUsername(username) {
        const user = await database.get(
            'SELECT id, username, email, role, password_hash, avatar_url, created_at FROM users WHERE username = ?',
            [username]
        );
        return user;
    }

    // Find user by email
    static async findByEmail(email) {
        const user = await database.get(
            'SELECT id, username, email, role, password_hash, avatar_url, created_at FROM users WHERE email = ?',
            [email]
        );
        return user;
    }

    // Verify user credentials
    static async verifyCredentials(username, password) {
        const user = await this.findByUsername(username);
        if (!user) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return null;
        }

        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Update user avatar
    static async updateAvatar(userId, avatarUrl) {
        await database.run(
            'UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [avatarUrl, userId]
        );
    }

    // Validate username format
    static validateUsername(username) {
        const { minLength, maxLength, pattern } = config.validation.username;
        return (
            username &&
            username.length >= minLength &&
            username.length <= maxLength &&
            pattern.test(username)
        );
    }

    // Validate password format
    static validatePassword(password) {
        const { minLength, maxLength } = config.validation.password;
        return password && password.length >= minLength && password.length <= maxLength;
    }

    // Validate email format
    static validateEmail(email) {
        const { pattern } = config.validation.email;
        return email && pattern.test(email);
    }
}

module.exports = User;
