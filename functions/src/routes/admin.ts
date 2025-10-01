import { Router } from 'express';
import { FirestoreDB } from '../database/firestore';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
const db = FirestoreDB.getInstance();

// Get dashboard statistics
router.get('/dashboard', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const statistics = await db.getDashboardStats();
    
    // Get recent doors
    const doors = await db.getAllDoors();
    const recentDoors = doors.slice(0, 10);
    
    // Get recent inspections
    const inspections = await db.getInspectionsByStatus('completed');
    const recentInspections = inspections.slice(0, 10);

    res.json({
      statistics,
      recentDoors,
      recentInspections
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users
router.get('/users', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const usersSnapshot = await db.db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => {
      const userData = doc.data();
      // Don't return password
      delete userData.password;
      return {
        id: doc.id,
        ...userData
      };
    });
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create user
router.post('/users', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['admin', 'inspector', 'engineer', 'client'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = await db.createUser({
      name,
      email,
      password: hashedPassword,
      role: role as any
    });

    res.status(201).json({ 
      message: 'User created successfully',
      userId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user
router.put('/users/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow password updates through this endpoint
    delete updates.password;
    delete updates.id;

    await db.db.collection('users').doc(id).update(updates);
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow deleting self
    if (id === req.user?.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await db.db.collection('users').doc(id).delete();
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get serial number configuration
router.get('/serial-config', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const configDoc = await db.db.collection('system_config').doc('serial_numbers').get();

    if (!configDoc.exists) {
      // Return default configuration
      res.json({
        startingSerial: 200,
        serialPrefix: 'MUF-S199-RBD'
      });
    } else {
      res.json(configDoc.data());
    }
  } catch (error) {
    console.error('Get serial config error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update serial number configuration
router.post('/serial-config', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { startingSerial, serialPrefix } = req.body;

    if (!startingSerial || !serialPrefix) {
      return res.status(400).json({ message: 'Starting serial and prefix are required' });
    }

    const configData = {
      startingSerial: parseInt(startingSerial),
      serialPrefix,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.userId
    };

    await db.db.collection('system_config').doc('serial_numbers').set(configData);

    res.json({
      message: 'Serial number configuration updated successfully',
      config: configData
    });
  } catch (error) {
    console.error('Update serial config error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// System health check
router.get('/health', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const statistics = await db.getDashboardStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      statistics
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;