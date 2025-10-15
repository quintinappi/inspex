// Fix serial number config to correct value
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
require('dotenv').config({ path: './client/.env' });

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function fixConfig() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    console.log('✅ Logged in as admin\n');

    await setDoc(doc(db, 'config', 'app_config'), {
      serialPrefix: 'MUF-S199-RBD',
      startingSerial: '200',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('✅ Serial config updated to:');
    console.log('   Prefix: MUF-S199-RBD');
    console.log('   Starting Serial: 200\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

fixConfig();
