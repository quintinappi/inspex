const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Environment validation
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => {
    const value = process.env[varName];
    return !value || value.includes('your-super-secret') || value.includes('change-this');
});

if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Warning: The following environment variables are not properly configured: ${missingEnvVars.join(', ')}`);
    console.warn('The application may not function correctly. Please update your .env file.');
}

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Warning: Email credentials not configured. Email notifications will be disabled.');
}

const app = express();
const PORT = process.env.PORT || 9876;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));

// Database setup
const Database = require('./database/database');
const db = new Database();

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected',
    email: process.env.EMAIL_USER ? 'configured' : 'not configured'
  };
  res.json(health);
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'INSPEX API',
    version: '1.0.0',
    description: 'Refuge Bay Door Inspection System API',
    endpoints: {
      auth: '/api/auth',
      doors: '/api/doors',
      inspections: '/api/inspections',
      certifications: '/api/certifications',
      admin: '/api/admin'
    }
  });
});

// Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/doors', require('./routes/doors'));
app.use('/api/inspections', require('./routes/inspections'));
app.use('/api/certifications', require('./routes/certifications'));
app.use('/api/admin', require('./routes/admin'));

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build/index.html'));
    });
}

// Create upload directories
const uploadDirs = ['uploads/inspections', 'certificates'];
uploadDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});