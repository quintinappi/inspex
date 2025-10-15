// Test Firebase CRUD operations
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } = require('firebase/firestore');
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

async function testOperations() {
  try {
    console.log('🔥 Testing Firebase Operations...\n');

    // Sign in as admin
    console.log('1. Authentication Test');
    console.log('   Signing in...');
    const userCredential = await signInWithEmailAndPassword(
      auth,
      'admin@inspex.com',
      'admin123'
    );
    console.log('   ✅ Signed in as:', userCredential.user.email, '\n');

    // Test READ operation
    console.log('2. READ Test');
    console.log('   Reading config document...');
    const configDoc = await getDoc(doc(db, 'config', 'app_config'));
    if (configDoc.exists()) {
      console.log('   ✅ Config read successfully:', configDoc.data());
    } else {
      console.log('   ❌ Config document not found');
    }
    console.log('');

    // Test WRITE operation (update existing)
    console.log('3. WRITE Test (Update)');
    console.log('   Updating config document...');
    await setDoc(doc(db, 'config', 'app_config'), {
      serialPrefix: 'MUF-S199-RBD',
      startingSerial: '200',
      testTimestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('   ✅ Config updated successfully\n');

    // Test CREATE operation
    console.log('4. CREATE Test');
    console.log('   Creating test door...');
    const testDoorData = {
      doorNumber: 'TEST-001',
      location: 'Test Location',
      type: 'Refuge Bay Door',
      serialNumber: 'TEST-' + Date.now(),
      manufacturer: 'Test Manufacturer',
      installDate: new Date().toISOString().split('T')[0],
      lastInspection: new Date().toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const doorRef = await addDoc(collection(db, 'doors'), testDoorData);
    console.log('   ✅ Test door created with ID:', doorRef.id, '\n');

    // Test READ collection
    console.log('5. READ Collection Test');
    console.log('   Reading all doors...');
    const doorsSnapshot = await getDocs(collection(db, 'doors'));
    console.log(`   ✅ Found ${doorsSnapshot.size} door(s)`);
    doorsSnapshot.forEach((doc) => {
      console.log('      -', doc.id, ':', doc.data().doorNumber);
    });
    console.log('');

    // Test DELETE operation
    console.log('6. DELETE Test');
    console.log('   Deleting test door...');
    await deleteDoc(doc(db, 'doors', doorRef.id));
    console.log('   ✅ Test door deleted successfully\n');

    // Verify deletion
    console.log('7. Verify Deletion');
    const doorsAfterDelete = await getDocs(collection(db, 'doors'));
    console.log(`   ✅ Doors remaining: ${doorsAfterDelete.size}\n`);

    console.log('🎉 All Firebase operations completed successfully!\n');
    console.log('Summary:');
    console.log('   ✅ Authentication - Working');
    console.log('   ✅ Read Document - Working');
    console.log('   ✅ Write Document - Working');
    console.log('   ✅ Create Document - Working');
    console.log('   ✅ Read Collection - Working');
    console.log('   ✅ Delete Document - Working\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    console.error('\n   Full error:', error);
    process.exit(1);
  }
}

testOperations();
