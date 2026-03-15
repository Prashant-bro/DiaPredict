const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        user = new User({ name, email, password });
        await user.save();
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        if (!user.password) {
             return res.status(400).json({ message: 'Please login using Google' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { name, email, sub } = payload; // sub is google user id

        // Check if user exists
        let user = await User.findOne({ email });
        
        if (!user) {
            // Create new Google user (no password needed)
            // But we need to modify our user model to allow optional passwords first which we did by setting required: true to false (or giving dummy pass)
            // To be safe without mutating the model again, we will generate a random secure password for Google Auth users.
            const generatePassword = () => Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            
            user = new User({
                name: name,
                email: email,
                password: generatePassword()
            });
            await user.save();
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });

    } catch (error) {
        console.error("Google Auth Error: ", error);
        res.status(400).json({ message: 'Google Authentication Failed' });
    }
});

module.exports = router;
