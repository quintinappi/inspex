const admin = require('firebase-admin');
const { execSync } = require('child_process');

// Get Firebase auth token from CLI
function getFirebaseToken() {
  try {
    const token = execSync('firebase login:ci', { encoding: 'utf8' }).trim();
    return token;
  } catch (error) {
    console.log('Unable to get CI token, trying to use application default credentials...');
    return null;
  }
}

// Initialize Firebase Admin with proper credentials
async function initializeFirebase() {
  try {
    // Try to initialize with service account from environment
    admin.initializeApp({
      projectId: 'inspex001'
    });

    console.log('✅ Firebase Admin initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);

    // Try alternative approach
    try {
      const serviceAccount = require('/Users/cash/.config/firebase/serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'inspex001'
      });
      console.log('✅ Firebase Admin initialized with service account');
      return true;
    } catch (serviceError) {
      console.error('❌ Service account not available');
      return false;
    }
  }
}

async function checkDoorStatus() {
  console.log('🔍 CHECKING ACTUAL FIRESTORE DATA FOR DOOR MF42-15-1041');
  console.log('='.repeat(70));

  // Initialize Firebase
  const initialized = await initializeFirebase();
  if (!initialized) {
    console.log('\n🔧 ALTERNATIVE APPROACH: Using Firebase CLI directly...');

    try {
      // Use Firebase CLI to query Firestore
      console.log('\n📄 Using Firebase CLI to query doors collection...');

      // Try to use firebase firestore:query command
      const result = execSync(
        'firebase firestore:query --project inspex001 --collection doors --where "serial_number,==,MF42-15-1041"',
        { encoding: 'utf8', stdio: 'pipe' }
      );

      console.log('Query result:', result);

    } catch (cliError) {
      console.error('Firebase CLI query failed:', cliError.message);

      // Last resort - use gcloud CLI
      console.log('\n🔧 LAST RESORT: Trying gcloud CLI...');
      try {
        const gcloudResult = execSync(
          'gcloud firestore export --collection-ids=doors --filter=\'serial_number="MF42-15-1041"\' --project=inspex001',
          { encoding: 'utf8', stdio: 'pipe' }
        );
        console.log('GCloud result:', gcloudResult);
      } catch (gcloudError) {
        console.error('Gcloud CLI also failed:', gcloudError.message);
      }
    }

    return;
  }

  const db = admin.firestore();

  try {
    // Find the door by serial number
    console.log('\n📄 Searching for door with serial number MF42-15-1041...');
    const doorsSnapshot = await db.collection('doors')
      .where('serial_number', '==', 'MF42-15-1041')
      .get();

    console.log(`\n📄 Found ${doorsSnapshot.size} door(s) with serial number MF42-15-1041:`);

    if (doorsSnapshot.empty) {
      console.log('❌ No door found with serial number MF42-15-1041');

      // Search for similar doors
      console.log('\n🔍 Searching for doors with similar serial numbers...');
      const allDoorsSnapshot = await db.collection('doors').limit(10).get();
      allDoorsSnapshot.forEach((doc) => {
        const door = doc.data();
        if (door.serial_number && door.serial_number.includes('MF42')) {
          console.log(`  Found similar door: ${door.serial_number} (ID: ${doc.id})`);
          console.log(`    Inspection Status: "${door.inspection_status}"`);
          console.log(`    Certification Status: "${door.certification_status}"`);
        }
      });
    } else {
      doorsSnapshot.forEach((doc) => {
        const door = doc.data();
        console.log(`\n🚪 Door ID: ${doc.id}`);
        console.log(`  Serial Number: "${door.serial_number}"`);
        console.log(`  Description: "${door.description}"`);
        console.log(`  Inspection Status: "${door.inspection_status}"`);
        console.log(`  Certification Status: "${door.certification_status}"`);
        console.log(`  PO Number: ${door.po_number || 'N/A'}`);
        console.log(`  Drawing Number: ${door.drawing_number || 'N/A'}`);
        console.log(`  Rejection Reason: ${door.rejection_reason || 'N/A'}`);
        console.log(`  Created: ${door.created_at?.toDate?.() || 'N/A'}`);
      });

      // Check inspections and certifications for the found door
      for (const doorDoc of doorsSnapshot.docs) {
        const doorId = doorDoc.id;

        // Check inspections
        console.log(`\n🔍 INSPECTIONS FOR DOOR ${doorId}:`);
        const inspectionsSnapshot = await db.collection('door_inspections')
          .where('door_id', '==', doorId)
          .get();

        if (inspectionsSnapshot.empty) {
          console.log('  No inspections found');
        } else {
          inspectionsSnapshot.forEach((doc) => {
            const inspection = doc.data();
            console.log(`  📋 Inspection ${doc.id}:`);
            console.log(`    Status: "${inspection.status}"`);
            console.log(`    Inspector: ${inspection.inspector_id}`);
            console.log(`    Date: ${inspection.inspection_date?.toDate?.() || inspection.inspection_date}`);
            console.log(`    Completed: ${inspection.completed_date?.toDate?.() || inspection.completed_date}`);
            console.log(`    Notes: ${inspection.notes || 'None'}`);
          });
        }

        // Check certifications
        console.log(`\n🔍 CERTIFICATIONS FOR DOOR ${doorId}:`);
        const certsSnapshot = await db.collection('certifications')
          .where('door_id', '==', doorId)
          .get();

        if (certsSnapshot.empty) {
          console.log('  No certifications found');
        } else {
          certsSnapshot.forEach((doc) => {
            const cert = doc.data();
            console.log(`  📜 Certification ${doc.id}:`);
            console.log(`    Engineer: ${cert.engineer_id}`);
            console.log(`    PDF: ${cert.certificate_pdf_path}`);
            console.log(`    Certified: ${cert.certified_at?.toDate?.() || cert.certified_at}`);
            console.log(`    Signature: ${cert.signature ? 'Yes' : 'No'}`);
          });
        }
      }
    }

    // Summary of all doors
    console.log('\n🔍 DATABASE SUMMARY:');
    const allDoorsSnapshot = await db.collection('doors').get();
    console.log(`Total doors in database: ${allDoorsSnapshot.size}`);

    const certStatusCounts = {};
    const inspectStatusCounts = {};

    allDoorsSnapshot.forEach((doc) => {
      const door = doc.data();
      const certStatus = door.certification_status || 'pending';
      const inspectStatus = door.inspection_status || 'pending';

      certStatusCounts[certStatus] = (certStatusCounts[certStatus] || 0) + 1;
      inspectStatusCounts[inspectStatus] = (inspectStatusCounts[inspectStatus] || 0) + 1;
    });

    console.log('\n📊 CERTIFICATION STATUS BREAKDOWN:');
    Object.entries(certStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} doors`);
    });

    console.log('\n📊 INSPECTION STATUS BREAKDOWN:');
    Object.entries(inspectStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} doors`);
    });

  } catch (error) {
    console.error('❌ Error querying Firestore:', error);
  }

  process.exit(0);
}

checkDoorStatus();