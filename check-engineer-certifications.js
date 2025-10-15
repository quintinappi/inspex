const admin = require('firebase-admin');

// Initialize with Application Default Credentials (uses Firebase CLI auth)
admin.initializeApp({
  projectId: 'inspex001'
});

const db = admin.firestore();

async function checkCertifications() {
  console.log('\n=== CHECKING COMPLETED INSPECTIONS ===\n');
  
  // Get all inspections
  const inspectionsSnapshot = await db.collection('door_inspections').get();
  console.log(`Total inspections: ${inspectionsSnapshot.size}`);
  
  const completed = [];
  const pending = [];
  
  inspectionsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\nInspection ${doc.id}:`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Door ID: ${data.doorId}`);
    console.log(`  Inspector: ${data.inspectorId || data.inspector_id}`);
    console.log(`  Completed: ${data.completedAt || data.completed_at || 'N/A'}`);
    
    if (data.status === 'completed') {
      completed.push({id: doc.id, ...data});
    } else {
      pending.push({id: doc.id, ...data});
    }
  });
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Completed inspections: ${completed.length}`);
  console.log(`Pending inspections: ${pending.length}`);
  
  console.log('\n=== CHECKING CERTIFICATIONS COLLECTION ===\n');
  const certificationsSnapshot = await db.collection('certifications').get();
  console.log(`Total certifications: ${certificationsSnapshot.size}`);
  
  certificationsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\nCertification ${doc.id}:`);
    console.log(`  Door ID: ${data.doorId}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Created: ${data.createdAt}`);
  });
  
  console.log('\n=== CHECKING DOORS COLLECTION ===\n');
  const doorsSnapshot = await db.collection('doors').get();
  console.log(`Total doors: ${doorsSnapshot.size}`);
  
  doorsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`\nDoor ${doc.id}:`);
    console.log(`  Serial: ${data.serialNumber}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Location: ${data.location}`);
  });
}

checkCertifications()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
