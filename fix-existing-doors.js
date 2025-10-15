// Fix existing doors with missing serial numbers
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
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

async function fixDoors() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    console.log('✅ Logged in as admin\n');

    const doorsSnapshot = await getDocs(collection(db, 'doors'));
    let counter = 200;

    console.log(`Fixing ${doorsSnapshot.size} doors...\n`);

    for (const doorDoc of doorsSnapshot.docs) {
      const data = doorDoc.data();

      // Generate serial number: MUF-S{num}-RBD{version}-01-0
      const serialNumber = `MUF-S${counter.toString().padStart(3, '0')}-RBD${data.version}-01-0`;

      // Generate drawing number: S{num}
      const drawingNumber = `S${counter.toString().padStart(3, '0')}`;

      // Generate description
      const description = `${data.size} Meter ${data.pressure} kPa Refuge Bay Door`;

      // Update the door
      await updateDoc(doc(db, 'doors', doorDoc.id), {
        serial_number: serialNumber,
        drawing_number: drawingNumber,
        description: description,
        inspection_status: 'pending',
        certification_status: 'pending',
        updatedAt: new Date().toISOString()
      });

      console.log(`✅ Fixed door ${doorDoc.id}`);
      console.log(`   Serial: ${serialNumber}`);
      console.log(`   Drawing: ${drawingNumber}`);
      console.log(`   Description: ${description}\n`);

      counter++;
    }

    console.log('✅ All doors fixed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

fixDoors();
