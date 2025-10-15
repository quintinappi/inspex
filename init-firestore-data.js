// Initialize Firestore data (config and sample data) without creating user
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, addDoc, getDocs } = require('firebase/firestore');
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
const db = getFirestore(app);

async function initializeData() {
  try {
    console.log('🔥 Initializing Firestore data...\n');

    // 1. Create app config
    console.log('Creating app config...');
    await setDoc(doc(db, 'config', 'app_config'), {
      serialPrefix: 'MUF-S199-RBD',
      startingSerial: '200',
      updatedAt: new Date().toISOString()
    });
    console.log('✅ App config created\n');

    // 2. Check if sample door already exists
    console.log('Checking for existing doors...');
    const doorsSnapshot = await getDocs(collection(db, 'doors'));

    if (doorsSnapshot.empty) {
      console.log('Creating sample door...');
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
    } else {
      console.log(`ℹ️  Found ${doorsSnapshot.size} existing door(s), skipping sample door creation\n`);
    }

    console.log('🎉 Firestore initialization complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

initializeData();
