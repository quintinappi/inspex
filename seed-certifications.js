const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'wl6xr4ukja' // Extract project ID from URL
  });
} else {
  admin.initializeApp({
    projectId: 'wl6xr4ukja'
  });
}

const db = admin.firestore();

async function seedCertifications() {
  try {
    console.log('🔍 Checking existing certifications...');

    // Check existing certifications
    const existingCerts = await db.collection('certifications').get();
    console.log(`Found ${existingCerts.size} existing certifications`);

    if (existingCerts.size > 0) {
      console.log('✅ Certifications already exist, no seeding needed');
      return;
    }

    // Find doors with certification_status = 'certified'
    const doorsSnapshot = await db.collection('doors').where('certification_status', '==', 'certified').get();
    console.log(`Found ${doorsSnapshot.size} doors marked as certified`);

    if (doorsSnapshot.size === 0) {
      console.log('❌ No doors are marked as certified');

      // Find a door with completed inspection to certify
      const completedDoorsSnapshot = await db.collection('doors').where('certification_status', '!=', 'certified').limit(1).get();
      if (completedDoorsSnapshot.size > 0) {
        const doorDoc = completedDoorsSnapshot.docs[0];
        const doorData = doorDoc.data();
        console.log(`Found door to certify: ${doorData.serial_number}`);

        // Mark it as certified
        await db.collection('doors').doc(doorDoc.id).update({
          certification_status: 'certified'
        });
        console.log('✅ Marked door as certified');

        // Create certification document
        const certificationData = {
          door_id: doorDoc.id,
          engineer_id: 'some-engineer-id', // You'll need to use a real engineer ID
          certificate_pdf_path: `certificate-${doorData.serial_number}-${Date.now()}.pdf`,
          certified_at: admin.firestore.FieldValue.serverTimestamp(),
          signature: null
        };

        const certRef = await db.collection('certifications').add(certificationData);
        console.log('✅ Created certification document with ID:', certRef.id);
      } else {
        console.log('❌ No doors found to certify');
      }
      return;
    }

    // Create certification documents for marked doors
    for (const doorDoc of doorsSnapshot.docs) {
      const doorData = doorDoc.data();
      console.log(`Creating certification for door: ${doorData.serial_number} (${doorDoc.id})`);

      // Find engineer who certified this door (you may need to adjust this logic)
      // For now, use a placeholder
      const engineerId = 'placeholder-engineer-id'; // Replace with actual engineer ID

      const certificationData = {
        door_id: doorDoc.id,
        engineer_id: engineerId,
        certificate_pdf_path: `certificate-${doorData.serial_number}-${Date.now()}.pdf`,
        certified_at: admin.firestore.FieldValue.serverTimestamp(),
        signature: null
      };

      const certRef = await db.collection('certifications').add(certificationData);
      console.log(`✅ Created certification document for ${doorData.serial_number} with ID: ${certRef.id}`);
    }

    console.log('🎉 Certification seeding complete!');

  } catch (error) {
    console.error('❌ Error seeding certifications:', error);
    console.error(error.message);
  }
}

seedCertifications()
  .then(() => {
    console.log('\n✅ Seeding complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
