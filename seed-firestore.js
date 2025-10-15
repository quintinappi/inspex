// Seed Firestore with sample data
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, addDoc } = require('firebase/firestore');

// Firebase configuration from .env
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

async function seedFirestore() {
  try {
    console.log('🔥 Seeding Firestore with sample data...\n');

    // Create app config
    console.log('Creating app config...');
    await setDoc(doc(db, 'config', 'app_config'), {
      serialPrefix: 'MUF-S199-RBD',
      startingSerial: '200',
      updatedAt: new Date().toISOString()
    });
    console.log('✅ App config created\n');

    // Create sample doors
    console.log('Creating sample doors...');
    const door1 = await addDoc(collection(db, 'doors'), {
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
    console.log('✅ Door 1 created:', door1.id);

    const door2 = await addDoc(collection(db, 'doors'), {
      doorNumber: 'RBD-002',
      location: 'Mine Site B - Level 2',
      type: 'Refuge Bay Door',
      serialNumber: 'MUF-S199-RBD-201',
      manufacturer: 'Manufab',
      installDate: '2024-02-20',
      lastInspection: new Date().toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Door 2 created:', door2.id, '\n');

    // Create sample inspection
    console.log('Creating sample inspection...');
    await addDoc(collection(db, 'door_inspections'), {
      doorId: door1.id,
      doorNumber: 'RBD-001',
      inspector: 'Admin User',
      inspectionDate: new Date().toISOString(),
      status: 'draft',
      checklistItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Sample inspection created\n');

    console.log('🎉 Firestore seeding complete!\n');
    console.log('You can now test the app at http://localhost:3000');
    console.log('Login with:');
    console.log('  Email: admin@inspex.com');
    console.log('  Password: admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedFirestore();
