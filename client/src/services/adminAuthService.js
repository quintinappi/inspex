import {
  createUserWithEmailAndPassword,
  deleteUser,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut
} from 'firebase/auth';
import { auth } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

class AdminAuthService {
  /**
   * Create a new user with email and password in Firebase Auth
   * Also creates the user document in Firestore
   */
  async createUserWithAuth(userData) {
    const { email, password, name, role, company, phone } = userData;

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Sign out immediately so we don't stay logged in as the new user
      await signOut(auth);

      // Return the UID so it can be used to create the Firestore document
      return {
        success: true,
        uid: firebaseUser.uid,
        message: 'User created successfully in Firebase Auth'
      };
    } catch (error) {
      console.error('Error creating user in Firebase Auth:', error);

      let message = 'Failed to create user';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email already in use';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak (minimum 6 characters)';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      }

      return {
        success: false,
        error: message
      };
    }
  }

  /**
   * Delete user from both Firebase Auth and Firestore
   * Note: This requires admin privileges or the user to be currently signed in
   */
  async deleteUserCompletely(userId, userEmail) {
    try {
      // First, delete from Firestore
      await deleteDoc(doc(db, 'users', userId));

      // Note: Deleting from Firebase Auth requires Admin SDK or the user to be signed in
      // Since we can't delete other users' auth accounts from the client SDK,
      // we'll need to handle this on the backend

      return {
        success: true,
        message: 'User deleted from Firestore. Firebase Auth deletion requires backend admin SDK.',
        needsBackendCleanup: true
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete user'
      };
    }
  }

  /**
   * Reset a user's password
   * This is a placeholder - actual implementation would require Admin SDK on backend
   */
  async resetUserPassword(userEmail, newPassword) {
    // This operation requires Firebase Admin SDK which can't be used in the browser
    // We would need to create a backend endpoint for this
    return {
      success: false,
      error: 'Password reset requires backend implementation with Admin SDK',
      needsBackendImplementation: true
    };
  }

  /**
   * Check if an email has a Firebase Auth account
   * (This is limited - Firebase doesn't allow checking if emails exist for security)
   */
  async checkAuthAccountExists(email) {
    // This would need to be implemented on the backend with Admin SDK
    return {
      success: false,
      error: 'This check requires backend implementation with Admin SDK',
      needsBackendImplementation: true
    };
  }
}

export default new AdminAuthService();
