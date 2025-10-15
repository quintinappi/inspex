// Investigate the certification bug - comprehensive analysis
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
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

async function investigateBug() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     CERTIFICATION BUG INVESTIGATION - DETAILED ANALYSIS       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Authenticate
    await signInWithEmailAndPassword(auth, 'admin@inspex.com', 'admin123');
    console.log('✅ Authenticated as admin\n');

    // ============================================
    // 1. CHECK DOORS COLLECTION
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. DOORS COLLECTION ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const doorsSnapshot = await getDocs(collection(db, 'doors'));
    console.log(`Total doors found: ${doorsSnapshot.size}\n`);

    const doors = [];
    doorsSnapshot.forEach((doc) => {
      const data = doc.data();
      doors.push({ id: doc.id, ...data });
      console.log(`Door ID: ${doc.id}`);
      console.log(`  Serial Number: ${data.serial_number}`);
      console.log(`  Description: ${data.description}`);
      console.log(`  Inspection Status: ${data.inspection_status}`);
      console.log(`  Certification Status: ${data.certification_status}`);
      console.log(`  Rejection Reason: ${data.rejection_reason || 'None'}`);
      console.log(`  Created: ${data.createdAt}`);
      console.log(`  Updated: ${data.updatedAt}`);
      console.log('');
    });

    // ============================================
    // 2. CHECK CERTIFICATIONS COLLECTION
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2. CERTIFICATIONS COLLECTION ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const certsSnapshot = await getDocs(collection(db, 'certifications'));
    console.log(`Total certifications found: ${certsSnapshot.size}\n`);

    const certifications = [];
    certsSnapshot.forEach((doc) => {
      const data = doc.data();
      certifications.push({ id: doc.id, ...data });
      console.log(`Certification ID: ${doc.id}`);
      console.log(`  Door ID: ${data.door_id}`);
      console.log(`  Engineer ID: ${data.engineer_id}`);
      console.log(`  PDF Path: ${data.certificate_pdf_path}`);
      console.log(`  Certified At: ${data.certified_at ? new Date(data.certified_at.seconds * 1000).toISOString() : 'N/A'}`);
      console.log(`  Has Signature: ${data.signature ? 'Yes' : 'No'}`);
      console.log('');
    });

    // ============================================
    // 3. CHECK DOOR INSPECTIONS
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3. DOOR INSPECTIONS ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const inspectionsSnapshot = await getDocs(collection(db, 'door_inspections'));
    console.log(`Total inspections found: ${inspectionsSnapshot.size}\n`);

    const inspections = [];
    inspectionsSnapshot.forEach((doc) => {
      const data = doc.data();
      inspections.push({ id: doc.id, ...data });
      console.log(`Inspection ID: ${doc.id}`);
      console.log(`  Door ID: ${data.door_id}`);
      console.log(`  Inspector ID: ${data.inspector_id}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Inspection Date: ${data.inspection_date?.seconds ? new Date(data.inspection_date.seconds * 1000).toISOString() : 'N/A'}`);
      console.log(`  Completed Date: ${data.completed_date?.seconds ? new Date(data.completed_date.seconds * 1000).toISOString() : 'N/A'}`);
      console.log('');
    });

    // ============================================
    // 4. CROSS-REFERENCE ANALYSIS
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4. CROSS-REFERENCE ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const certifiedDoors = doors.filter(door => door.certification_status === 'certified');
    const underReviewDoors = doors.filter(door => door.certification_status === 'under_review');
    const pendingCertDoors = doors.filter(door => door.certification_status === 'pending' && door.inspection_status === 'completed');
    const completedInspections = inspections.filter(insp => insp.status === 'completed');

    console.log(`Doors with certification_status="certified": ${certifiedDoors.length}`);
    console.log(`Doors with certification_status="under_review": ${underReviewDoors.length}`);
    console.log(`Doors ready for certification (completed inspection, pending cert): ${pendingCertDoors.length}`);
    console.log(`Completed inspections: ${completedInspections.length}`);
    console.log(`Certification documents in database: ${certifications.length}\n`);

    // ============================================
    // 5. IDENTIFY MISMATCHES
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5. MISMATCH DETECTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find doors marked as certified but with no certification document
    const orphanedCertifiedDoors = certifiedDoors.filter(door => {
      return !certifications.some(cert => cert.door_id === door.id);
    });

    if (orphanedCertifiedDoors.length > 0) {
      console.log(`🚨 BUG FOUND: ${orphanedCertifiedDoors.length} door(s) marked as "certified" but NO certification document exists!\n`);
      orphanedCertifiedDoors.forEach(door => {
        console.log(`  ❌ Door ID: ${door.id}`);
        console.log(`     Serial: ${door.serial_number}`);
        console.log(`     Status: certification_status="${door.certification_status}"`);
        console.log(`     Missing: Certification document in "certifications" collection`);
        console.log('');
      });
    } else {
      console.log('✅ No orphaned certified doors found\n');
    }

    // Find certification documents for doors that aren't marked as certified
    const orphanedCertifications = certifications.filter(cert => {
      const door = doors.find(d => d.id === cert.door_id);
      return !door || door.certification_status !== 'certified';
    });

    if (orphanedCertifications.length > 0) {
      console.log(`🚨 WARNING: ${orphanedCertifications.length} certification document(s) exist but door status is not "certified"!\n`);
      orphanedCertifications.forEach(cert => {
        const door = doors.find(d => d.id === cert.door_id);
        console.log(`  ⚠️  Certification ID: ${cert.id}`);
        console.log(`     Door ID: ${cert.door_id}`);
        console.log(`     Door Status: ${door ? door.certification_status : 'DOOR NOT FOUND'}`);
        console.log('');
      });
    } else {
      console.log('✅ No orphaned certifications found\n');
    }

    // ============================================
    // 6. ROOT CAUSE ANALYSIS
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('6. ROOT CAUSE ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (orphanedCertifiedDoors.length > 0) {
      console.log('ROOT CAUSE:');
      console.log('  The door status was manually set to "certified" without creating');
      console.log('  a corresponding certification document in the "certifications" collection.\n');
      console.log('IMPACT:');
      console.log('  1. The Certifications page (/certifications) queries the "certifications"');
      console.log('     collection, which is empty, so no PDFs are shown.');
      console.log('  2. The Admin dashboard may show inconsistent status information.');
      console.log('  3. Users cannot download the certificate PDF because it was never generated.\n');
      console.log('EXPECTED WORKFLOW:');
      console.log('  1. Door is inspected → inspection_status="completed"');
      console.log('  2. Engineer reviews → certification_status="under_review" (optional)');
      console.log('  3. Engineer certifies → POST /certifications/certify/:doorId');
      console.log('     - Creates PDF certificate');
      console.log('     - Creates certification document in "certifications" collection');
      console.log('     - Updates door certification_status="certified"');
      console.log('     - Sends email notification with PDF\n');
      console.log('WHAT ACTUALLY HAPPENED:');
      console.log('  The door certification_status was set to "certified" WITHOUT going');
      console.log('  through the certification endpoint, possibly via:');
      console.log('  - Direct Firestore update');
      console.log('  - Manual database edit');
      console.log('  - Incomplete certification process that failed after updating status');
      console.log('  - Bug in the certification workflow\n');
    }

    // ============================================
    // 7. RECOMMENDATIONS
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('7. RECOMMENDED FIXES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('FIX #1: DATA CORRECTION (Immediate)');
    console.log('  Change the door certification_status back to "pending" or "under_review"');
    console.log('  so it appears in the certification queue for proper certification.\n');

    console.log('FIX #2: PROPER CERTIFICATION (Recommended)');
    console.log('  Use the engineer certification workflow:');
    console.log('  1. Log in as an engineer');
    console.log('  2. Go to Certifications tab');
    console.log('  3. Toggle "Show pending reviews"');
    console.log('  4. Click "Review" on the door');
    console.log('  5. Complete the certification form with signature');
    console.log('  6. Submit certification');
    console.log('  This will properly create the PDF and certification document.\n');

    console.log('FIX #3: PREVENT FUTURE ISSUES');
    console.log('  Add validation to ensure certification documents always exist');
    console.log('  when certification_status="certified". Consider:');
    console.log('  - Database triggers/rules to enforce consistency');
    console.log('  - Backend validation before status updates');
    console.log('  - Transaction-based certification to ensure atomicity\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during investigation:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

investigateBug();
