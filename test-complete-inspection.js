// Test completing the inspection through the backend API
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
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

async function testCompleteInspection() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    console.log('✅ Logged in as admin\n');

    // Get Firebase ID token
    const token = await auth.currentUser.getIdToken();
    console.log('✅ Got auth token\n');

    const inspectionId = 'HNRtaySDAttNA2f9cTzH'; // The latest completed inspection
    const apiUrl = process.env.REACT_APP_API_URL;

    console.log(`Testing: POST ${apiUrl}/inspections/complete/${inspectionId}\n`);

    // Call the backend API
    const response = await fetch(`${apiUrl}/inspections/complete/${inspectionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        notes: 'Testing re-inspection fix'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    // Now check the door status
    console.log('\n=== CHECKING DOOR STATUS AFTER API CALL ===\n');
    const doorId = 'D2DufpInY1SOHtS8TXix';
    const doorDoc = await getDoc(doc(db, 'doors', doorId));

    if (doorDoc.exists()) {
      const doorData = doorDoc.data();
      console.log('Door ID:', doorId);
      console.log('Inspection Status:', doorData.inspection_status);
      console.log('Certification Status:', doorData.certification_status);
      console.log('Rejection Reason:', doorData.rejection_reason);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  process.exit(0);
}

testCompleteInspection();
