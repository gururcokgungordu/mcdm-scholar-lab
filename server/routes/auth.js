import express from 'express';
import db from '../db.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
    try {
        const { name, email, password, university, school, purpose } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = db.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        const newUser = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            email,
            password,
            university: university || '',
            school: school || '',
            purpose: purpose || 'education',
            role: 'USER',
            isPro: false,
            createdAt: Date.now()
        };

        db.createUser(newUser);

        // Return user without password
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message || 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = db.findUserByCredentials(email, password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || 'Login failed' });
    }
});

// GET /api/auth/users - Admin only: get all users
router.get('/users', (req, res) => {
    try {
        const users = db.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: error.message || 'Failed to get users' });
    }
});

export default router;
