const admin = require('firebase-admin');

const serviceAccount = require('/Users/cash/2. LOCAL CODING/inspex/inspex001-firebase-adminsdk-fbsvc-ea70ce9a92.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function auditDatabase() {
  console.log('=== INSPEX DATABASE AUDIT ===\n');
  
  // Check users collection
  console.log('--- USERS ---');
  const usersSnapshot = await db.collection('users').get();
  console.log(`Total users: ${usersSnapshot.size}\n`);
  
  if (usersSnapshot.size > 0) {
    console.log('User List:');
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  • ${data.name || 'N/A'} (${data.email})`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    Role: ${data.role}`);
      console.log(`    Status: ${data.status || 'N/A'}`);
      console.log(`    Company: ${data.company || 'N/A'}`);
      console.log(`    Phone: ${data.phone || 'N/A'}`);
      console.log(`    Created: ${data.createdAt || 'N/A'}`);
      console.log();
    });
  }
  
  // Check Firebase Auth users
  console.log('--- FIREBASE AUTH USERS ---');
  try {
    const authUsers = await admin.auth().listUsers();
    console.log(`Total Auth users: ${authUsers.users.length}\n`);
    authUsers.users.forEach(user => {
      console.log(`  • ${user.displayName || 'N/A'} (${user.email})`);
      console.log(`    UID: ${user.uid}`);
      console.log(`    Disabled: ${user.disabled}`);
      console.log(`    Email Verified: ${user.emailVerified}`);
      console.log(`    Last Sign In: ${user.metadata.lastSignInTime || 'Never'}`);
      console.log();
    });
  } catch (e) {
    console.log('Could not fetch auth users:', e.message);
  }
  
  // Check doors
  console.log('--- DOORS ---');
  const doorsSnapshot = await db.collection('doors').get();
  console.log(`Total doors: ${doorsSnapshot.size}\n`);
  
  // Check inspection points
  console.log('--- INSPECTION POINTS ---');
  const pointsSnapshot = await db.collection('inspection_points').get();
  console.log(`Total inspection points: ${pointsSnapshot.size}`);
  if (pointsSnapshot.size > 0) {
    pointsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  • ${data.name} (order: ${data.order_index})`);
    });
  }
  console.log();
  
  // Check door inspections
  console.log('--- DOOR INSPECTIONS ---');
  const inspectionsSnapshot = await db.collection('door_inspections').get();
  console.log(`Total inspections: ${inspectionsSnapshot.size}\n`);
  
  // Check certifications
  console.log('--- CERTIFICATIONS ---');
  const certsSnapshot = await db.collection('certifications').get();
  console.log(`Total certifications: ${certsSnapshot.size}\n`);
  
  // Check purchase orders
  console.log('--- PURCHASE ORDERS ---');
  const poSnapshot = await db.collection('purchase_orders').get();
  console.log(`Total purchase orders: ${poSnapshot.size}\n`);
  
  // Check config
  console.log('--- CONFIG ---');
  const configDoc = await db.collection('config').doc('serial').get();
  if (configDoc.exists) {
    console.log('Serial config:', configDoc.data());
  } else {
    console.log('No serial config found');
  }
  console.log();
  
  // Check company settings
  console.log('--- COMPANY SETTINGS ---');
  const companyDoc = await db.collection('company_settings').doc('default').get();
  if (companyDoc.exists) {
    console.log('Company settings:', companyDoc.data());
  } else {
    console.log('No company settings found');
  }
  
  console.log('\n=== END OF AUDIT ===');
  
  process.exit(0);
}

auditDatabase().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
