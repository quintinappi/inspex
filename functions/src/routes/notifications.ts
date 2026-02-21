import { Router } from 'express';
import { FirestoreDB } from '../database/firestore';
import { verifyToken } from '../middleware/auth';

const router = Router();
const db = FirestoreDB.getInstance();

router.post('/login', verifyToken, async (req, res) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId;
    const email = req.user?.email;

    if (!role || !userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (role !== 'engineer' && role !== 'client') {
      return res.json({ message: 'No notification required for this role' });
    }

    const userDoc = await db.db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    const admins = await db.db.collection('users').where('role', '==', 'admin').get();
    const adminEmails = admins.docs.map(doc => doc.data().email).filter(Boolean);

    if (adminEmails.length === 0) {
      return res.json({ message: 'No admin recipients configured' });
    }

    try {
      const { notifyAdminUserLogin } = await import('../services/emailService');
      await notifyAdminUserLogin({
        recipientEmails: adminEmails,
        user: {
          id: userId,
          email: email || userData?.email,
          name: userData?.name || '',
          role
        }
      });
    } catch (emailError) {
      console.error('Error sending login notification email:', emailError);
      // Do not fail the request if email fails
    }

    res.json({ message: 'Login notification processed' });
  } catch (error: any) {
    console.error('Login notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
