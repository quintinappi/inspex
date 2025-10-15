// Create Firebase Auth accounts for users that exist in Firestore but not in Auth
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
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

const defaultPasswords = {
  'inspector@inspex.com': 'inspector123',
  'client@inspex.com': 'client123',
  'quintin@app-i.co.za': 'engineer123',
};

async function createMissingAuthUsers() {
  console.log('🔥 Creating missing Firebase Auth accounts...\n');

  try {
    // First, login as admin to read Firestore
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    console.log('✅ Logged in as admin\n');

    // Sign out to create new users
    await auth.signOut();

    // Get all users from Firestore (need to sign in again for this)
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    await auth.signOut();

    console.log(`Found ${usersSnapshot.size} users in Firestore\n`);

    const usersToCreate = [];
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.email && userData.status !== 'active') {
        usersToCreate.push({
          id: userDoc.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          password: defaultPasswords[userData.email] || 'test123'
        });
      }
    });

    console.log(`Creating ${usersToCreate.length} new auth accounts...\n`);

    for (const user of usersToCreate) {
      try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);

        // Sign out immediately
        await auth.signOut();

        console.log(`✅ Created Auth account for: ${user.email}`);
        console.log(`   Password: ${user.password}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   UID: ${userCredential.user.uid}\n`);

        // Update Firestore user doc with status
        await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
        await updateDoc(doc(db, 'users', user.id), { status: 'active' });
        await auth.signOut();

      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`ℹ️  Auth account already exists for: ${user.email}\n`);
        } else {
          console.error(`❌ Error creating auth for ${user.email}:`, error.message, '\n');
        }
      }
    }

    console.log('\n🎉 Auth accounts creation complete!\n');
    console.log('Available Login Credentials:');
    console.log('  Inspector: inspector@inspex.com / inspector123');
    console.log('  Client: client@inspex.com / client123');
    console.log('  Engineer: quintin@app-i.co.za / engineer123');
    console.log('  Admin: admin@inspex.com / admin123\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

createMissingAuthUsers();
