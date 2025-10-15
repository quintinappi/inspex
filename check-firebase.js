// Check Firebase connection and data
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc, collection, getDocs } = require('firebase/firestore');
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

async function checkAndInitialize() {
  try {
    console.log('🔥 Checking Firebase configuration...\n');

    // Try to sign in as admin
    console.log('Signing in as admin...');
    const userCredential = await signInWithEmailAndPassword(
      auth,
      'admin@inspex.com',
      'admin123'
    );
    console.log('✅ Signed in as:', userCredential.user.email);
    console.log('   User UID:', userCredential.user.uid, '\n');

    // Check if user document exists
    console.log('Checking user document...');
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (userDoc.exists()) {
      console.log('✅ User document exists:', userDoc.data());
    } else {
      console.log('⚠️  User document does not exist, creating...');
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: 'Admin User',
        email: 'admin@inspex.com',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      console.log('✅ User document created');
    }
    console.log('');

    // Check config document
    console.log('Checking config document...');
    const configDoc = await getDoc(doc(db, 'config', 'app_config'));
    if (configDoc.exists()) {
      console.log('✅ Config document exists:', configDoc.data());
    } else {
      console.log('⚠️  Config document does not exist, creating...');
      await setDoc(doc(db, 'config', 'app_config'), {
        serialPrefix: 'MUF-S199-RBD',
        startingSerial: '200',
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Config document created');
    }
    console.log('');

    // Check doors collection
    console.log('Checking doors collection...');
    const doorsSnapshot = await getDocs(collection(db, 'doors'));
    console.log(`✅ Found ${doorsSnapshot.size} door(s)`);
    doorsSnapshot.forEach((doc) => {
      console.log('   -', doc.id, ':', doc.data().doorNumber || doc.data().serialNumber);
    });
    console.log('');

    // Check inspections collection
    console.log('Checking door_inspections collection...');
    const inspectionsSnapshot = await getDocs(collection(db, 'door_inspections'));
    console.log(`✅ Found ${inspectionsSnapshot.size} inspection(s)\n`);

    console.log('🎉 Firebase check complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    console.error('\n   Full error:', error);
    process.exit(1);
  }
}

checkAndInitialize();
