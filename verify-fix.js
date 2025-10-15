// Comprehensive verification that the fix is working
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');
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

async function verifyFix() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    console.log('✅ Logged in as admin\n');

    const doorId = 'D2DufpInY1SOHtS8TXix';

    console.log('=== CURRENT DOOR STATUS ===');
    const doorDoc = await getDoc(doc(db, 'doors', doorId));
    const doorData = doorDoc.data();

    console.log('Door ID:', doorId);
    console.log('Serial Number:', doorData.serial_number);
    console.log('Inspection Status:', doorData.inspection_status);
    console.log('Certification Status:', doorData.certification_status);
    console.log('Rejection Reason:', doorData.rejection_reason);

    console.log('\n=== VERIFICATION ===');

    if (doorData.certification_status === 'pending') {
      console.log('✅ SUCCESS! Door certification status is now PENDING (was rejected)');
    } else if (doorData.certification_status === 'rejected') {
      console.log('❌ FAIL! Door is still REJECTED');
    } else {
      console.log(`⚠️  Door has unexpected status: ${doorData.certification_status}`);
    }

    if (doorData.rejection_reason === null || doorData.rejection_reason === undefined) {
      console.log('✅ SUCCESS! Rejection reason has been cleared');
    } else {
      console.log(`❌ FAIL! Rejection reason still present: ${doorData.rejection_reason}`);
    }

    console.log('\n=== PENDING CERTIFICATIONS QUERY ===');
    const pendingCertsQuery = query(
      collection(db, 'doors'),
      where('inspection_status', '==', 'completed'),
      where('certification_status', '==', 'pending')
    );
    const pendingCertsSnapshot = await getDocs(pendingCertsQuery);

    console.log(`Found ${pendingCertsSnapshot.size} doors pending certification`);

    let foundOurDoor = false;
    pendingCertsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`  - ${data.serial_number} (${doc.id})`);
      if (doc.id === doorId) {
        foundOurDoor = true;
      }
    });

    if (foundOurDoor) {
      console.log('\n✅ SUCCESS! Our re-inspected door now appears in pending certifications');
    } else {
      console.log('\n❌ FAIL! Our door does NOT appear in pending certifications query');
    }

    console.log('\n=== FINAL VERDICT ===');
    if (
      doorData.certification_status === 'pending' &&
      !doorData.rejection_reason &&
      foundOurDoor
    ) {
      console.log('✅✅✅ ALL CHECKS PASSED! The fix is working correctly!');
      console.log('');
      console.log('USER ACTION REQUIRED:');
      console.log('  1. Clear browser cache or do a hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)');
      console.log('  2. Navigate to the Certifications page');
      console.log('  3. Toggle "Show pending reviews" checkbox');
      console.log('  4. The door should now appear in the pending certifications list');
    } else {
      console.log('❌ Some checks failed. See details above.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  process.exit(0);
}

verifyFix();
