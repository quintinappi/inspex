const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'wl6xr4ukja' // Extract project ID from URL
  });
} else {
  // Try using application default credentials (Firebase CLI auth)
  admin.initializeApp({
    projectId: 'wl6xr4ukja'
  });
}

const db = admin.firestore();

async function checkFirebaseData() {
  try {
    console.log('\n🔍 ANALYZING FIREBASE DATABASE FOR CERTIFICATIONS ISSUE\n');

    // Check certifications collection
    console.log('=== CERTIFICATIONS COLLECTION ===');
    const certificationsRef = db.collection('certifications');
    const certificationsSnapshot = await certificationsRef.get();

    console.log(`Total certification documents: ${certificationsSnapshot.size}`);

    let certifications = [];
    certificationsSnapshot.forEach(doc => {
      certifications.push({ id: doc.id, ...doc.data() });
    });

    console.log('\n📄 Certification Documents:');
    certifications.forEach((cert, i) => {
      console.log(`${i+1}. ID: ${cert.id}`);
      console.log(`   Door ID: ${cert.door_id}`);
      console.log(`   Engineer ID: ${cert.engineer_id}`);
      console.log(`   PDF Path: ${cert.certificate_pdf_path}`);
      console.log(`   Certified At: ${cert.certified_at ? new Date(cert.certified_at.toDate()) : 'N/A'}`);
      console.log(`   Signature: ${cert.signature ? 'Present' : 'None'}`);
    });

    // Check doors collection
    console.log('\n=== DOORS COLLECTION ===');
    const doorsRef = db.collection('doors');
    const doorsSnapshot = await doorsRef.get();

    console.log(`Total door documents: ${doorsSnapshot.size}`);

    let doors = [];
    doorsSnapshot.forEach(doc => {
      doors.push({ id: doc.id, ...doc.data() });
    });

    console.log('\n🚪 Door Documents:');
    doors.forEach((door, i) => {
      console.log(`${i+1}. ID: ${door.id}`);
      console.log(`   Serial: ${door.serial_number}`);
      console.log(`   Description: ${door.description}`);
      console.log(`   Inspection Status: ${door.inspection_status}`);
      console.log(`   Certification Status: ${door.certification_status}`);

      const hasCertification = certifications.some(cert => cert.door_id === door.id);
      console.log(`   Has Certificate Document: ${hasCertification ? 'YES' : 'NO'}`);
      console.log('');
    });

    // Summary
    console.log('=== SUMMARY ===');
    const doorsCertified = doors.filter(door => door.certification_status === 'certified');
    const doorsWithCerts = doors.filter(door => {
      return certifications.some(cert => cert.door_id === door.id);
    });

    console.log(`Doors with certification_status="certified": ${doorsCertified.length}`);
    console.log(`Doors with certificate documents in DB: ${doorsWithCerts.length}`);
    console.log(`Missing certificate documents: ${doorsCertified.length - doorsWithCerts.length}`);

    // Issues to check
    console.log('\n=== POTENTIAL ISSUES ===');

    if (certifications.length === 0 && doorsCertified.length > 0) {
      console.log('❌ ISSUE FOUND: Doors are marked as certified, but no certificate documents exist!');
      console.log('   This explains why Certifications page shows 0 certificates.');
    }

    if (certifications.length > 0 && doorsCertified.length === 0) {
      console.log('❓ ISSUE FOUND: Certificate documents exist, but no doors are marked as certified.');
      console.log('   This suggests certification process stopped midway.');
    }

    if (certifications.length > 0 && doorsCertified.length > 0) {
      const mismatched = doorsCertified.filter(door => {
        return !certifications.some(cert => cert.door_id === door.id);
      });
      if (mismatched.length > 0) {
        console.log(`❌ ISSUE FOUND: ${mismatched.length} doors marked as certified but missing certificate documents.`);
      }
    }

  } catch (error) {
    console.error('Error accessing Firebase:', error.message);

    // Try alternative method or fallback
    console.log('\n🔄 FALLBACK: Trying to use Firebase CLI auth...');

    // Set project ID for CLI auth
    process.env.FIREBASE_PROJECT_ID = 'wl6xr4ukja';
  }
}

checkFirebaseData()
  .then(() => {
    console.log('\n✅ Firebase analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
