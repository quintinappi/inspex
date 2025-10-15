// Set default passwords for all users
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, updatePassword, signOut } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
require('dotenv').config({ path: '/Volumes/Q/Coding/inspex/client/.env' });

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

// User accounts with their default passwords
const userAccounts = [
  { email: 'admin@inspex.com', password: 'Admin@2025', role: 'Administrator' },
  { email: 'quintin@de-bruin.co.za', password: 'Inspector@2025', role: 'Inspector' },
  { email: 'quintin@app-i.co.za', password: 'Engineer@2025', role: 'Engineer' },
  { email: 'spectivmech@gmail.com', password: 'Client@2025', role: 'Client' }
];

async function setPasswords() {
  console.log('='.repeat(60));
  console.log('INSPEX USER ACCOUNTS');
  console.log('='.repeat(60));
  console.log('\n📋 Current User Accounts:\n');

  for (const account of userAccounts) {
    console.log(`${account.role}`);
    console.log(`  Email: ${account.email}`);
    console.log(`  Password: ${account.password}`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('\n⚠️  IMPORTANT: All users should change their passwords after first login!\n');
  console.log('='.repeat(60));

  process.exit(0);
}

setPasswords();
