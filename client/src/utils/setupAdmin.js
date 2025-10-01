import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const setupInitialAdmin = async () => {
  const adminEmail = 'admin@inspex.com';
  const adminPassword = 'admin123';

  try {
    // Create admin user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;

    // Create admin user document in Firestore
    const adminData = {
      name: 'System Administrator',
      email: adminEmail,
      role: 'admin',
      createdAt: new Date().toISOString(),
      isInitialAdmin: true
    };

    await setDoc(doc(db, 'users', user.uid), adminData);

    console.log('Initial admin user created successfully');
    return { success: true, message: 'Initial admin user created successfully' };

  } catch (error) {
    console.error('Error creating initial admin user:', error);

    // If user already exists, that's okay
    if (error.code === 'auth/email-already-in-use') {
      return { success: true, message: 'Admin user already exists in Auth' };
    }

    return { success: false, error: error.message };
  }
};

export const checkAndSetupAdmin = async () => {
  try {
    // This is a simple check - in a real app you might want to query all users
    // and check if any have admin role, but for now we'll just try to create
    // the default admin if it doesn't exist

    return await setupInitialAdmin();
  } catch (error) {
    console.error('Error checking admin setup:', error);
    return { success: false, error: error.message };
  }
};