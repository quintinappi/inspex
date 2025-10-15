const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function queryUsers() {
  try {
    console.log('=== Querying Firestore users collection ===\n');
    const snapshot = await db.collection('users').get();
    console.log(`Total users found: ${snapshot.size}\n`);

    if (snapshot.size === 0) {
      console.log('No users found in Firestore users collection!');
      return;
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log('-----------------------------------');
      console.log(`ID: ${doc.id}`);
      console.log(`Name: ${data.name}`);
      console.log(`Email: ${data.email}`);
      console.log(`Role: ${data.role}`);
      console.log(`Status: ${data.status}`);
      console.log(`Created: ${data.createdAt}`);

      // Check if user has Firebase Auth account
      try {
        const authUser = await admin.auth().getUserByEmail(data.email);
        console.log(`Firebase Auth: YES (UID: ${authUser.uid})`);
      } catch (error) {
        console.log(`Firebase Auth: NO`);
      }
    }
    console.log('-----------------------------------\n');
  } catch (error) {
    console.error('Error querying users:', error);
  }
  process.exit(0);
}

queryUsers();
