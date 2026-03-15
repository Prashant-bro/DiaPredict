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
app.use(cors());

// DB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/diabetes_system')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'backend' }));

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => console.log(`Backend Server running on port ${PORT}`));
}

// Export for Vercel serverless
module.exports = app;
