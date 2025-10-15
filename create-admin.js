// Create admin user using Firebase client SDK
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, collection, addDoc } = require('firebase/firestore');
require('dotenv').config({ path: './client/.env' });

// Firebase configuration from .env
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdminUser() {
  try {
    console.log('🔥 Creating admin user in Firebase...\n');

    // Create admin user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'admin@inspex.com',
      'admin123'
    );

    const user = userCredential.user;
    console.log('✅ Admin user created with UID:', user.uid);

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name: 'Admin User',
      email: 'admin@inspex.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    console.log('✅ User document created in Firestore\n');

    // Create app config
    await setDoc(doc(db, 'config', 'app_config'), {
      serialPrefix: 'MUF-S199-RBD',
      startingSerial: '200',
      updatedAt: new Date().toISOString()
    });
    console.log('✅ App config created\n');

    // Create sample door
    const doorRef = await addDoc(collection(db, 'doors'), {
      doorNumber: 'RBD-001',
      location: 'Mine Site A - Level 1',
      type: 'Refuge Bay Door',
      serialNumber: 'MUF-S199-RBD-200',
      manufacturer: 'Manufab',
      installDate: '2024-01-15',
      lastInspection: new Date().toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Sample door created:', doorRef.id, '\n');

    console.log('🎉 Setup complete!\n');
    console.log('Login credentials:');
    console.log('  Email: admin@inspex.com');
    console.log('  Password: admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'auth/email-already-exists') {
      console.log('\nℹ️  User already exists. You can login with:');
      console.log('  Email: admin@inspex.com');
      console.log('  Password: admin123\n');
    }
    process.exit(1);
  }
}

createAdminUser();
