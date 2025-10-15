const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCv3YaxHhB-aZnNg5gr-kXtkvz7j6GNyXo",
  authDomain: "inspex001.firebaseapp.com",
  projectId: "inspex001",
  storageBucket: "inspex001.firebasestorage.app",
  messagingSenderId: "645714761263",
  appId: "1:645714761263:web:f3edf55cd460766b6c18da"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function updateDoorStatuses() {
  try {
    // Authenticate first
    console.log('🔐 Authenticating...');
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'Admin@2025');
    console.log('✅ Authenticated as admin\n');

    console.log('🔧 Updating door statuses...\n');

    // Get all doors
    const doorsSnapshot = await getDocs(collection(db, 'doors'));

    if (doorsSnapshot.empty) {
      console.log('⚠️  No doors found in database.');
      process.exit(0);
    }

    console.log(`📋 Found ${doorsSnapshot.size} doors to update\n`);

    let updatedCount = 0;
    for (const doorDoc of doorsSnapshot.docs) {
      const doorData = doorDoc.data();
      const doorId = doorDoc.id;

      // Check if door already has status fields
      if (doorData.inspection_status && doorData.certification_status) {
        console.log(`⏭️  Skipping ${doorData.serial_number || doorId} - already has status fields`);
        continue;
      }

      // Add status fields
      await updateDoc(doc(db, 'doors', doorId), {
        inspection_status: doorData.inspection_status || 'pending',
        certification_status: doorData.certification_status || 'pending',
        updatedAt: new Date().toISOString()
      });

      updatedCount++;
      console.log(`✅ Updated ${doorData.serial_number || doorId} with status fields`);
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} doors!\n`);

    // Verify
    const verifySnapshot = await getDocs(collection(db, 'doors'));
    console.log('📋 Verification - Door Statuses:');
    verifySnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   ${data.serial_number || doc.id}:`);
      console.log(`      - inspection_status: ${data.inspection_status || 'MISSING'}`);
      console.log(`      - certification_status: ${data.certification_status || 'MISSING'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating door statuses:', error);
    process.exit(1);
  }
}

updateDoorStatuses();
