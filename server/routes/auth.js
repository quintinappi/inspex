const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('../database/database');
const { validateEmail, validatePassword, validateRole } = require('../utils/validation');

const router = express.Router();
const db = new Database();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Register (admin only)
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        // Validate inputs
        if (!validateEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters' });
        }

        if (!validateRole(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be inspector, engineer, admin, or client' });
        }

        // Check if user exists
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await db.run(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, name.trim(), role]
        );

        res.status(201).json({ message: 'User created successfully', userId: result.id });
    } catch (error) {
        const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
        res.status(500).json({ message, error: process.env.NODE_ENV === 'production' ? undefined : error.message });
    }
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Get current user
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await db.get(
            'SELECT id, email, name, role FROM users WHERE id = ?',
            [req.user.userId]
        );
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = { router, verifyToken };