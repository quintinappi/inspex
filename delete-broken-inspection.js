const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'inspex001'
  });
}

const db = admin.firestore();

async function deleteBrokenInspection() {
  const inspectionId = 'tM5xnMgqXwYD5RAiZxDX';

  try {
    console.log(`Deleting broken inspection: ${inspectionId}`);

    await db.collection('inspections').doc(inspectionId).delete();

    console.log('✅ Inspection deleted successfully');

    // Verify it's gone
    const doc = await db.collection('inspections').doc(inspectionId).get();

    if (!doc.exists) {
      console.log('✅ Verified: Inspection no longer exists');
      console.log('\nYou can now start a fresh inspection from the Doors page.');
    } else {
      console.log('❌ Warning: Inspection still exists');
    }

  } catch (error) {
    console.error('❌ Error deleting inspection:', error);
  } finally {
    process.exit();
  }
}

deleteBrokenInspection();
