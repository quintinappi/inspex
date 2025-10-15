// Firebase setup script to initialize the database
// Run this with: node setup-firebase.js

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function setupFirebase() {
  console.log('🔥 Setting up Firebase...\n');

  try {
    // 1. Create admin user
    console.log('Creating admin user...');
    let adminUser;
    try {
      adminUser = await auth.createUser({
        email: 'admin@inspex.com',
        password: 'admin123',
        displayName: 'Admin User'
      });
      console.log('✅ Admin user created:', adminUser.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        adminUser = await auth.getUserByEmail('admin@inspex.com');
        console.log('ℹ️  Admin user already exists:', adminUser.uid);
      } else {
        throw error;
      }
    }

    // 2. Create user document in Firestore
    await db.collection('users').doc(adminUser.uid).set({
      name: 'Admin User',
      email: 'admin@inspex.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Admin user document created in Firestore\n');

    // 3. Create app config
    console.log('Creating app config...');
    await db.collection('config').doc('app_config').set({
      serialPrefix: 'MUF-S199-RBD',
      startingSerial: '200',
      updatedAt: new Date().toISOString()
    });
    console.log('✅ App config created\n');

    // 4. Create sample door
    console.log('Creating sample door...');
    const doorRef = await db.collection('doors').add({
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
    console.log('✅ Sample door created:', doorRef.id, '\n');

    console.log('🎉 Firebase setup complete!\n');
    console.log('You can now log in with:');
    console.log('  Email: admin@inspex.com');
    console.log('  Password: admin123\n');

  } catch (error) {
    console.error('❌ Error setting up Firebase:', error);
  }

  process.exit(0);
}

setupFirebase();
