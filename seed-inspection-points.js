const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, deleteDoc, query, orderBy } = require('firebase/firestore');
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

const inspectionPoints = [
  {
    name: 'Confirm Drawing Number used by Fabricator',
    description: '',
    order_index: 1
  },
  {
    name: 'Confirm Over-All Dimensions',
    description: '',
    order_index: 2
  },
  {
    name: 'Confirm Member Sizes as per Drawing',
    description: 'As Per Drawing',
    order_index: 3
  },
  {
    name: 'Confirm Plate Thickness',
    description: 'HP=6mm / LP=3mm (140 kPa - HP & LP=3mm)',
    order_index: 4
  },
  {
    name: 'Confirm Welding on Structural Members. Size and Quality',
    description: '6mm (100 x 200 space Weld)',
    order_index: 5
  },
  {
    name: 'Confirm Welding on Hinges. Size and Quality',
    description: '8mm',
    order_index: 6
  },
  {
    name: 'Confirm Hinge Plate Thickness',
    description: '8mm',
    order_index: 7
  },
  {
    name: 'Confirm Hinge Pin Dimension',
    description: 'M24 x 200 (M20 for 140 kPa Door)',
    order_index: 8
  },
  {
    name: 'Check for General fit, excessive Gaps between frame and door.',
    description: '',
    order_index: 9
  },
  {
    name: 'Door cleaned of all spatter and welding defects',
    description: '',
    order_index: 10
  },
  {
    name: 'Grease nipples fitted to all hinges',
    description: '',
    order_index: 11
  },
  {
    name: 'Door Functionality & Smooth operation.',
    description: '',
    order_index: 12
  },
  {
    name: 'Silicone added to the inside joints to insure a water/ airtight seal',
    description: '',
    order_index: 13
  }
];

async function seedInspectionPoints() {
  try {
    // Authenticate first
    console.log('🔐 Authenticating...');
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'Admin@2025');
    console.log('✅ Authenticated as admin\n');

    console.log('🌱 Seeding inspection points...\n');

    // Check if inspection points already exist
    const existingPoints = await getDocs(collection(db, 'inspection_points'));

    if (!existingPoints.empty) {
      console.log(`⚠️  Found ${existingPoints.size} existing inspection points.`);
      console.log('❓ Clearing existing points and re-seeding...\n');

      // Delete existing points
      for (const doc of existingPoints.docs) {
        await deleteDoc(doc.ref);
      }
      console.log('✅ Cleared existing points\n');
    }

    // Add new inspection points
    let count = 0;
    for (const point of inspectionPoints) {
      await addDoc(collection(db, 'inspection_points'), point);
      count++;
      console.log(`✅ Added: ${point.name}`);
    }

    console.log(`\n🎉 Successfully seeded ${count} inspection points!\n`);

    // Verify
    const verifyQuery = query(
      collection(db, 'inspection_points'),
      orderBy('order_index')
    );
    const verifySnapshot = await getDocs(verifyQuery);

    console.log('📋 Verification - Inspection Points in Database:');
    verifySnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   ${data.order_index}. ${data.name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding inspection points:', error);
    process.exit(1);
  }
}

seedInspectionPoints();
