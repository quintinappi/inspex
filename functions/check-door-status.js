const admin = require('firebase-admin');

// Initialize Firebase Admin - should work from functions directory
admin.initializeApp({
  projectId: 'inspex001'
});

const db = admin.firestore();

async function checkActualDoorStatus() {
  console.log('🔍 CHECKING ACTUAL FIRESTORE DATA FOR DOOR MF42-15-1041');
  console.log('='.repeat(70));

  try {
    // First, find the door by serial number
    const doorsSnapshot = await db.collection('doors')
      .where('serial_number', '==', 'MF42-15-1041')
      .get();

    console.log(`\n📄 Found ${doorsSnapshot.size} door(s) with serial number MF42-15-1041:`);

    if (doorsSnapshot.empty) {
      console.log('❌ No door found with serial number MF42-15-1041');

      // Let's search for doors with similar serial numbers
      console.log('\n🔍 Searching for doors with similar serial numbers...');
      const allDoorsSnapshot = await db.collection('doors').limit(10).get();
      allDoorsSnapshot.forEach((doc) => {
        const door = doc.data();
        if (door.serial_number && door.serial_number.includes('MF42')) {
          console.log(`  Found similar door: ${door.serial_number} (ID: ${doc.id})`);
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

      // For each door found, check inspections and certifications
      for (const doorDoc of doorsSnapshot.docs) {
        const doorId = doorDoc.id;

        // Check inspections for this door
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

        // Check certifications for this door
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

    // Check ALL doors in the database
    console.log('\n🔍 CHECKING ALL DOORS IN DATABASE:');
    const allDoorsSnapshot = await db.collection('doors').get();
    console.log(`Total doors in database: ${allDoorsSnapshot.size}`);

    const statusCounts = {
      'pending': 0,
      'in_progress': 0,
      'completed': 0,
      'under_review': 0,
      'certified': 0,
      'rejected': 0,
      'other': 0
    };

    console.log('\n📊 ALL DOORS WITH THEIR CERTIFICATION STATUSES:');
    allDoorsSnapshot.forEach((doc) => {
      const door = doc.data();
      const certStatus = door.certification_status || 'pending';
      const inspectStatus = door.inspection_status || 'pending';

      if (statusCounts.hasOwnProperty(certStatus)) {
        statusCounts[certStatus]++;
      } else {
        statusCounts['other']++;
      }

      console.log(`  🚪 ${door.serial_number || 'N/A'} - Inspection: "${inspectStatus}", Certification: "${certStatus}"`);
    });

    console.log('\n📈 CERTIFICATION STATUS BREAKDOWN:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`  ${status}: ${count} doors`);
      }
    });

  } catch (error) {
    console.error('❌ Error checking Firestore:', error);
  }

  process.exit(0);
}

checkActualDoorStatus();