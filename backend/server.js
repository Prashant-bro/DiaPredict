const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// CORS Configuration
app.use(cors((req, callback) => {
    const origin = req.header('Origin');
    const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null;
    
    const allowed = [
        frontendUrl,
        'http://localhost:3000',
        'http://localhost:5173'
    ].filter(Boolean);

    if (!origin || allowed.includes(origin.replace(/\/$/, ''))) {
        callback(null, { origin: true, credentials: true });
    } else {
        callback(null, { origin: false });
    }
}));

// DB Connection
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/diabetes_system')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// Health check & Root
app.get('/health', (req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({ 
        status: 'healthy', 
        service: 'backend',
        database: states[mongoose.connection.readyState]
    });
});

app.get('/', (req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({ 
        status: 'running', 
        message: 'Diabetes Risk Assessment Backend API',
        database: states[mongoose.connection.readyState]
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));
}

// Export for Vercel serverless
module.exports = app;
