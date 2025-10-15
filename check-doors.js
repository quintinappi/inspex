// Check what's in the doors collection
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

async function checkDoors() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    console.log('✅ Logged in as admin\n');

    const doorsSnapshot = await getDocs(collection(db, 'doors'));

    console.log(`Found ${doorsSnapshot.size} doors in Firestore:\n`);

    doorsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Serial Number: ${data.serial_number || 'MISSING'}`);
      console.log(`  Drawing Number: ${data.drawing_number || 'MISSING'}`);
      console.log(`  Description: ${data.description || 'MISSING'}`);
      console.log(`  Door Number: ${data.door_number || 'MISSING'}`);
      console.log(`  PO Number: ${data.po_number || 'MISSING'}`);
      console.log(`  Size: ${data.size || 'MISSING'}`);
      console.log(`  Pressure: ${data.pressure || 'MISSING'}`);
      console.log(`  Version: ${data.version || 'MISSING'}`);
      console.log(`  All data:`, JSON.stringify(data, null, 2));
      console.log('\n');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkDoors();
