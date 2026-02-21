import { Router } from 'express';
import { FirestoreDB } from '../database/firestore';

const router = Router();
const db = FirestoreDB.getInstance();

// Public endpoints (no auth)
// NOTE: Keep responses minimal to avoid exposing sensitive config.

router.get('/company-settings', async (req, res) => {
  try {
    const spectiv_logo = await db.getCompanyLogoUrl();
    res.json({ spectiv_logo: spectiv_logo || null });
  } catch (error: any) {
    console.error('Get public company settings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
