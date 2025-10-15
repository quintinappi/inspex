const admin = require('firebase-admin');
const serviceAccount = require('./inspex001-firebase-adminsdk-fbsvc-51af46d6f0.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
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
    } else {
      doorsSnapshot.forEach((doc) => {
        const door = doc.data();
        console.log(`\n🚪 Door ID: ${doc.id}`);
        console.log(`  Serial Number: ${door.serial_number}`);
        console.log(`  Description: ${door.description}`);
        console.log(`  Inspection Status: "${door.inspection_status}"`);
        console.log(`  Certification Status: "${door.certification_status}"`);
        console.log(`  PO Number: ${door.po_number || 'N/A'}`);
        console.log(`  Drawing Number: ${door.drawing_number || 'N/A'}`);
        console.log(`  Rejection Reason: ${door.rejection_reason || 'N/A'}`);
        console.log(`  Created: ${door.created_at?.toDate?.() || 'N/A'}`);
      });
    }

    // Check all inspections for this door
    console.log('\n🔍 CHECKING ALL INSPECTIONS FOR THIS DOOR:');
    const allInspectionsSnapshot = await db.collection('door_inspections').get();
    const doorInspections = [];

    allInspectionsSnapshot.forEach((doc) => {
      const inspection = doc.data();
      if (doorsSnapshot.docs.some(doorDoc => doorDoc.id === inspection.door_id)) {
        doorInspections.push({ id: doc.id, ...inspection });
      }
    });

    console.log(`Found ${doorInspections.length} inspection(s) for this door:`);
    doorInspections.forEach((inspection) => {
      console.log(`\n📋 Inspection ID: ${inspection.id}`);
      console.log(`  Door ID: ${inspection.door_id}`);
      console.log(`  Inspector ID: ${inspection.inspector_id}`);
      console.log(`  Status: "${inspection.status}"`);
      console.log(`  Inspection Date: ${inspection.inspection_date?.toDate?.() || inspection.inspection_date}`);
      console.log(`  Completed Date: ${inspection.completed_date?.toDate?.() || inspection.completed_date}`);
      console.log(`  Notes: ${inspection.notes || 'None'}`);
    });

    // Check all certifications for this door
    console.log('\n🔍 CHECKING ALL CERTIFICATIONS FOR THIS DOOR:');
    const allCertsSnapshot = await db.collection('certifications').get();
    const doorCertifications = [];

    allCertsSnapshot.forEach((doc) => {
      const cert = doc.data();
      if (doorsSnapshot.docs.some(doorDoc => doorDoc.id === cert.door_id)) {
        doorCertifications.push({ id: doc.id, ...cert });
      }
    });

    console.log(`Found ${doorCertifications.length} certification(s) for this door:`);
    doorCertifications.forEach((cert) => {
      console.log(`\n📜 Certification ID: ${cert.id}`);
      console.log(`  Door ID: ${cert.door_id}`);
      console.log(`  Engineer ID: ${cert.engineer_id}`);
      console.log(`  PDF Path: ${cert.certificate_pdf_path}`);
      console.log(`  Certified At: ${cert.certified_at?.toDate?.() || cert.certified_at}`);
      console.log(`  Signature: ${cert.signature ? 'Yes' : 'No'}`);
    });

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

    console.log('\n📊 DOOR STATUS BREAKDOWN:');
    allDoorsSnapshot.forEach((doc) => {
      const door = doc.data();
      const certStatus = door.certification_status || 'pending';

      if (statusCounts.hasOwnProperty(certStatus)) {
        statusCounts[certStatus]++;
      } else {
        statusCounts['other']++;
      }

      // Show doors with non-standard statuses
      if (!['pending', 'certified', 'rejected'].includes(certStatus)) {
        console.log(`  🚪 ${door.serial_number} - Certification Status: "${certStatus}"`);
      }
    });

    console.log('\n📈 SUMMARY:');
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