// Update inspection points in Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, addDoc, query, orderBy } = require('firebase/firestore');
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

async function updateInspectionPoints() {
  try {
    // Authenticate
    console.log('🔐 Authenticating as admin...');
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    console.log('✅ Authenticated successfully\n');

    console.log('🔥 Starting inspection points update...\n');

    // Step 1: Delete all existing inspection points
    console.log('🗑️  Deleting old inspection points...');
    const existingSnapshot = await getDocs(collection(db, 'inspection_points'));

    console.log(`Found ${existingSnapshot.size} existing points to delete`);

    for (const doc of existingSnapshot.docs) {
      await deleteDoc(doc.ref);
      console.log(`  ✅ Deleted: ${doc.id}`);
    }

    console.log(`\n✅ Deleted ${existingSnapshot.size} old points\n`);

    // Step 2: Add new inspection points
    console.log('🌱 Adding new inspection points...\n');

    for (const point of inspectionPoints) {
      const docRef = await addDoc(collection(db, 'inspection_points'), point);
      console.log(`  ✅ ${point.order_index}. ${point.name} (ID: ${docRef.id})`);
    }

    console.log(`\n✅ Added ${inspectionPoints.length} new points\n`);

    // Step 3: Verify the update
    console.log('🔍 Verifying update...\n');
    const verifyQuery = query(
      collection(db, 'inspection_points'),
      orderBy('order_index')
    );
    const verifySnapshot = await getDocs(verifyQuery);

    console.log('📋 Current inspection points in database:\n');
    verifySnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   ${data.order_index}. ${data.name}`);
      if (data.description) {
        console.log(`      (${data.description})`);
      }
    });

    console.log('\n🎉 SUCCESS! Inspection points have been updated.\n');
    console.log('✅ You can now refresh your inspection page to see the changes.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

updateInspectionPoints();
