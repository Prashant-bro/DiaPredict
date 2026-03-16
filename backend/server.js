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

// CORS - Allow all origins for now to unblock deployment
// You can restrict this later once everything works
app.use(cors());

// DB Connection with retry logic for serverless
let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    
    const mongoUri = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/diabetes_system';
    
    try {
        await mongoose.connect(mongoUri);
        isConnected = true;
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.log('MongoDB connection error:', err.message);
        isConnected = false;
    }
};

// Connect on startup
connectDB();

// Middleware to ensure DB connection on every request (handles cold starts)
app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }
    next();
});

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
        database: states[mongoose.connection.readyState],
        env_check: {
            MONGO_URL: process.env.MONGO_URL ? 'SET' : 'NOT SET',
            MONGO_URI: process.env.MONGO_URI ? 'SET' : 'NOT SET',
            FRONTEND_URL: process.env.FRONTEND_URL ? 'SET' : 'NOT SET',
            JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
            GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
            ML_API_URL: process.env.ML_API_URL ? 'SET' : 'NOT SET'
        }
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
