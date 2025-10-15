// Check what's happening with rejected doors after re-inspection
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, query, where, orderBy } = require('firebase/firestore');
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

async function debugRejectedDoor() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    console.log('✅ Logged in as admin\n');

    // Find rejected doors
    console.log('=== SEARCHING FOR REJECTED DOORS ===\n');
    const rejectedDoorsQuery = query(
      collection(db, 'doors'),
      where('certification_status', '==', 'rejected')
    );
    const rejectedDoorsSnapshot = await getDocs(rejectedDoorsQuery);

    console.log(`Found ${rejectedDoorsSnapshot.size} rejected doors\n`);

    for (const doorDoc of rejectedDoorsSnapshot.docs) {
      const doorData = doorDoc.data();
      console.log('=== REJECTED DOOR ===');
      console.log('Door ID:', doorDoc.id);
      console.log('Serial Number:', doorData.serial_number);
      console.log('Drawing Number:', doorData.drawing_number);
      console.log('Inspection Status:', doorData.inspection_status);
      console.log('Certification Status:', doorData.certification_status);
      console.log('Rejection Reason:', doorData.rejection_reason);
      console.log('\n');

      // Get all inspections for this door (without orderBy to avoid index requirement)
      console.log('=== INSPECTIONS FOR THIS DOOR ===');
      const inspectionsQuery = query(
        collection(db, 'door_inspections'),
        where('door_id', '==', doorDoc.id)
      );
      const inspectionsSnapshot = await getDocs(inspectionsQuery);

      console.log(`Found ${inspectionsSnapshot.size} inspections:\n`);

      inspectionsSnapshot.forEach((inspDoc) => {
        const inspData = inspDoc.data();
        console.log('  Inspection ID:', inspDoc.id);
        console.log('  Status:', inspData.status);
        console.log('  Date:', inspData.inspection_date?.toDate?.());
        console.log('  Notes:', inspData.notes || 'None');
        console.log('  ---');
      });

      console.log('\n');
    }

    // Also check if there are any doors with completed inspection but still rejected
    console.log('=== CHECKING FOR ANOMALIES ===\n');
    const completedRejectedQuery = query(
      collection(db, 'doors'),
      where('inspection_status', '==', 'completed'),
      where('certification_status', '==', 'rejected')
    );
    const completedRejectedSnapshot = await getDocs(completedRejectedQuery);

    console.log(`Found ${completedRejectedSnapshot.size} doors with completed inspection but still rejected certification status`);

    completedRejectedSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('  Door ID:', doc.id);
      console.log('  Serial:', data.serial_number);
      console.log('  Inspection Status:', data.inspection_status);
      console.log('  Certification Status:', data.certification_status);
      console.log('  Rejection Reason:', data.rejection_reason);
      console.log('  ---');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  process.exit(0);
}

debugRejectedDoor();
