import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { initializeFirestore } from './database/seedData';

// Route imports
import authRoutes from './routes/auth';
import doorsRoutes from './routes/doors';
import inspectionsRoutes from './routes/inspections';
import certificationsRoutes from './routes/certifications';
import adminRoutes from './routes/admin';
import emailRoutes from './routes/email';
import usersRoutes from './routes/users';
import doorTypesRoutes from './routes/doorTypes';
import { debugDoorQuery, debugAllDoors } from './routes/debug';

const app = express();

// Middleware
app.use(cors({ 
  origin: true,
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firestore data on startup
initializeFirestore().catch(console.error);

// Routes
app.use('/auth', authRoutes);
app.use('/doors', doorsRoutes);
app.use('/inspections', inspectionsRoutes);
app.use('/certifications', certificationsRoutes);
app.use('/admin', adminRoutes);
app.use('/email', emailRoutes);
app.use('/users', usersRoutes);
app.use('/door-types', doorTypesRoutes);

// Debug routes (temporary - remove after debugging)
app.get('/debug/door/MF42-15-1041', debugDoorQuery);
app.get('/debug/doors', debugAllDoors);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'INSPEX API is running on Firebase Functions', timestamp: Date.now() });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', error);
  res.status(500).json({ 
    message: 'Server error', 
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
  });
});

// Export the Express app as a Firebase Function
export const api = onRequest({ 
  region: 'us-central1',
  memory: '1GiB',
  timeoutSeconds: 300,
  maxInstances: 100
}, app);
