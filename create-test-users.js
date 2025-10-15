// Create test users for all roles
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
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

const testUsers = [
  {
    email: 'inspector@test.com',
    password: 'test123',
    name: 'John Inspector',
    role: 'inspector',
    company: 'INSPEX Test Corp',
    phone: '+1 (555) 100-0001'
  },
  {
    email: 'engineer@test.com',
    password: 'test123',
    name: 'Jane Engineer',
    role: 'engineer',
    company: 'INSPEX Test Corp',
    phone: '+1 (555) 100-0002'
  },
  {
    email: 'client@test.com',
    password: 'test123',
    name: 'Bob Client',
    role: 'client',
    company: 'Mining Co Ltd',
    phone: '+1 (555) 100-0003'
  }
];

async function createTestUsers() {
  console.log('🔥 Creating test users in Firebase...\n');

  for (const userData of testUsers) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      const user = userCredential.user;
      console.log(`✅ ${userData.role.toUpperCase()} user created with UID:`, user.uid);

      await setDoc(doc(db, 'users', user.uid), {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        company: userData.company,
        phone: userData.phone,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      console.log(`✅ User document created for ${userData.email}\n`);

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`ℹ️  ${userData.email} already exists\n`);
      } else {
        console.error(`❌ Error creating ${userData.email}:`, error.message, '\n');
      }
    }
  }

  console.log('🎉 Test users setup complete!\n');
  console.log('Test Credentials:');
  console.log('  Inspector: inspector@test.com / test123');
  console.log('  Engineer: engineer@test.com / test123');
  console.log('  Client: client@test.com / test123');
  console.log('  Admin: admin@inspex.com / admin123\n');

  process.exit(0);
}

createTestUsers();
