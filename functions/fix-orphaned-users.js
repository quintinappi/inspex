const admin = require('firebase-admin');

const serviceAccount = require('/Users/cash/2. LOCAL CODING/inspex/inspex001-firebase-adminsdk-fbsvc-ea70ce9a92.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixOrphanedUsers() {
  console.log('=== FIXING ORPHANED FIREBASE AUTH USERS ===\n');
  
  // Get all Firebase Auth users
  const authUsers = await admin.auth().listUsers();
  console.log(`Found ${authUsers.users.length} Firebase Auth users\n`);
  
  // Get all Firestore users
  const usersSnapshot = await db.collection('users').get();
  const firestoreUserIds = new Set();
  usersSnapshot.forEach(doc => {
    firestoreUserIds.add(doc.id);
  });
  console.log(`Found ${firestoreUserIds.size} Firestore user documents\n`);
  
  // Find orphaned auth users (exist in Auth but not in Firestore)
  const orphanedUsers = authUsers.users.filter(user => !firestoreUserIds.has(user.uid));
  
  console.log(`Found ${orphanedUsers.length} orphaned users:\n`);
  
  for (const user of orphanedUsers) {
    console.log(`  • ${user.email} (UID: ${user.uid})`);
    
    // Determine role from email
    let role = 'client';
    if (user.email.includes('admin')) role = 'admin';
    else if (user.email.includes('inspector')) role = 'inspector';
    else if (user.email.includes('engineer')) role = 'engineer';
    
    // Create Firestore document
    const userData = {
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      role: role,
      company: '',
      phone: '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: 'Auto-created to fix orphaned auth user'
    };
    
    try {
      await db.collection('users').doc(user.uid).set(userData);
      console.log(`    ✅ Created Firestore document with role: ${role}`);
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n=== FIX COMPLETE ===');
  
  // Show updated user list
  console.log('\n--- UPDATED USER LIST ---');
  const updatedSnapshot = await db.collection('users').get();
  updatedSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`  • ${data.name} (${data.email}) - ${data.role}`);
  });
  
  process.exit(0);
}

fixOrphanedUsers().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
