import { Router, Request } from 'express';
import { FirestoreDB } from '../database/firestore';
import { verifyToken, requireRole } from '../middleware/auth';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import multer from 'multer';

// Extend Request interface for multer
declare global {
  namespace Express {
    interface Request {
      file?: any;
    }
  }
}

const router = Router();
const db = FirestoreDB.getInstance();

// Get all users
router.get('/', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const usersSnapshot = await db.db.collection('users').get();

    const users = await Promise.all(usersSnapshot.docs.map(async (doc) => {
      const userData = doc.data();

      // Try to get Firebase Auth data
      let hasAuthAccount = false;
      let authData: any = {};

      try {
        const authUser = await admin.auth().getUserByEmail(userData.email);
        hasAuthAccount = true;
        authData = {
          uid: authUser.uid,
          emailVerified: authUser.emailVerified,
          disabled: authUser.disabled,
          lastSignInTime: authUser.metadata.lastSignInTime,
          creationTime: authUser.metadata.creationTime
        };
      } catch (error) {
        // User doesn't have auth account
        hasAuthAccount = false;
      }

      return {
        id: doc.id,
        ...userData,
        hasAuthAccount,
        authData
      };
    }));

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new user (in Firestore and Firebase Auth)
router.post('/', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role, company, phone, status } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields: name, email, password, role' });
    }

    // Create user in Firebase Auth
    let authUser;
    try {
      authUser = await admin.auth().createUser({
        email,
        password,
        displayName: name,
        emailVerified: true
      });
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        return res.status(400).json({ message: 'Email already in use' });
      }
      throw authError;
    }

    // Create user in Firestore
    const userData = {
      name,
      email,
      role,
      company: company || '',
      phone: phone || '',
      status: status || 'active',
      createdAt: new Date().toISOString()
    };

    await db.db.collection('users').doc(authUser.uid).set(userData);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: authUser.uid,
        ...userData,
        hasAuthAccount: true
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user
router.put('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, role, company, phone, status } = req.body;

    // Update Firestore
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date().toISOString();

    await db.db.collection('users').doc(userId).update(updateData);

    // Update Firebase Auth if email or name changed
    const authUpdateData: any = {};
    if (email) authUpdateData.email = email;
    if (name) authUpdateData.displayName = name;

    if (Object.keys(authUpdateData).length > 0) {
      try {
        await admin.auth().updateUser(userId, authUpdateData);
      } catch (error) {
        console.error('Error updating Firebase Auth:', error);
        // Continue even if auth update fails
      }
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (from both Firestore and Firebase Auth)
router.delete('/:id', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;

    // Delete from Firestore
    await db.db.collection('users').doc(userId).delete();

    // Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(userId);
    } catch (error) {
      console.error('Error deleting from Firebase Auth:', error);
      // Continue even if auth delete fails
    }

    res.json({ message: 'User deleted successfully from Firestore and Firebase Auth' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset user password
router.post('/:id/reset-password', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Update password in Firebase Auth
    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload user signature
router.post('/:id/signature', verifyToken, upload.single('signature'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Only allow users to upload their own signature, or admin to upload any signature
    if (req.user?.role !== 'admin' && req.user?.userId !== userId) {
      return res.status(403).json({ message: 'Cannot upload signature for other users' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No signature file uploaded' });
    }

    // Upload to Firebase Storage
    const bucket = getStorage().bucket();
    const filename = `signatures/${userId}/${Date.now()}-${req.file.originalname}`;
    const file = bucket.file(filename);

    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: new Date().getTime(),
        },
      },
      public: true,
    });

    // Generate public URL
    const signatureUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`;

    // Update user with signature info
    await db.db.collection('users').doc(userId).update({
      signature_url: signatureUrl,
      signature_storage_path: filename,
      updatedAt: new Date().toISOString()
    });

    res.json({
      message: 'Signature uploaded successfully',
      signatureUrl
    });
  } catch (error) {
    console.error('Upload signature error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user signature
router.delete('/:id/signature', verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Only allow users to delete their own signature, or admin to delete any signature
    if (req.user?.role !== 'admin' && req.user?.userId !== userId) {
      return res.status(403).json({ message: 'Cannot delete signature for other users' });
    }

    // Get user to find storage path
    const userDoc = await db.db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    const storagePath = userData?.signature_storage_path;

    // Delete from Firebase Storage if exists
    if (storagePath) {
      try {
        const { getStorage } = require('firebase-admin/storage');
        await getStorage().bucket().file(storagePath).delete();
      } catch (storageError) {
        console.error('Error deleting signature from storage:', storageError);
        // Continue even if storage delete fails
      }
    }

    // Update user to remove signature info
    await db.db.collection('users').doc(userId).update({
      signature_url: null,
      signature_storage_path: null,
      updatedAt: new Date().toISOString()
    });

    res.json({ message: 'Signature deleted successfully' });
  } catch (error) {
    console.error('Delete signature error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
