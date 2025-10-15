const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'inspex-app'
});

const db = admin.firestore();

async function verifyDoorStatus() {
  const doorId = 'D2DufpInY1SOHtS8TXix';
  const serialNumber = 'MF42-15-1041';

  console.log('🔍 Checking door status for certified door...');
  console.log(`Door ID: ${doorId}`);
  console.log(`Serial Number: ${serialNumber}`);
  console.log('');

  try {
    // Check the door record
    const doorDoc = await db.collection('doors').doc(doorId).get();

    if (!doorDoc.exists) {
      console.log('❌ Door not found in Firestore');
      process.exit(1);
    }

    const door = doorDoc.data();
    console.log('📄 Door Record:');
    console.log(`  Serial Number: ${door.serial_number}`);
    console.log(`  Inspection Status: ${door.inspection_status}`);
    console.log(`  Certification Status: ${door.certification_status}`);
    console.log(`  Description: ${door.description}`);
    console.log('');

    // Check for certifications
    const certsSnapshot = await db.collection('certifications')
      .where('door_id', '==', doorId)
      .get();

    console.log(`📜 Found ${certsSnapshot.size} certification(s) for this door:`);

    if (certsSnapshot.empty) {
      console.log('  ❌ No certifications found - This is the problem!');
      console.log('  The door should have a certification record if it was certified.');
    } else {
      certsSnapshot.forEach((certDoc) => {
        const cert = certDoc.data();
        console.log(`  ✅ Certification ${certDoc.id}:`);
        console.log(`    Engineer ID: ${cert.engineer_id}`);
        console.log(`    PDF Path: ${cert.certificate_pdf_path}`);
        console.log(`    Certified At: ${cert.certified_at?.toDate?.() || cert.certified_at}`);
        console.log(`    Signature: ${cert.signature ? 'Yes' : 'No'}`);
      });
    }
    console.log('');

    // Check if status needs fixing
    if (door.certification_status !== 'certified' && !certsSnapshot.empty) {
      console.log('🔧 ISSUE FOUND: Door has certification(s) but status is not "certified"');
      console.log(`  Current status: "${door.certification_status}"`);
      console.log(`  Should be: "certified"`);
      console.log('');

      console.log('🛠️  Fixing door status...');
      await db.collection('doors').doc(doorId).update({
        certification_status: 'certified'
      });

      console.log('✅ Door status updated to "certified"');
    } else if (door.certification_status === 'certified') {
      console.log('✅ Door status is correctly set to "certified"');
    } else {
      console.log('ℹ️  Door status is "pending" - no certifications found, which is correct');
    }

    // Get engineer info for debugging
    if (!certsSnapshot.empty) {
      const cert = certsSnapshot.docs[0].data();
      const engineerDoc = await db.collection('users').doc(cert.engineer_id).get();

      if (engineerDoc.exists) {
        const engineer = engineerDoc.data();
        console.log('');
        console.log('👷 Engineer Info:');
        console.log(`  Name: ${engineer.name}`);
        console.log(`  Email: ${engineer.email}`);
        console.log(`  Role: ${engineer.role}`);
        console.log(`  User ID (Firebase Auth UID): ${engineerDoc.id}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

verifyDoorStatus();