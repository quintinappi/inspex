import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { FirestoreDB } from '../database/firestore';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    uid: string;
    role: string;
    email: string;
  };
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get user data from Firestore
    const db = FirestoreDB.getInstance();
    const user = await db.getUserById(decodedToken.uid);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      userId: decodedToken.uid,
      uid: decodedToken.uid,
      role: user.role,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};