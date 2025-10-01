const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'inspex001'
});

const db = admin.firestore();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create inspection points
    const inspectionPoints = [
      {
        id: 'door_frame_inspection',
        title: 'Door Frame Inspection',
        description: 'Check door frame for damage, alignment, and structural integrity',
        category: 'structural',
        required: true,
        order: 1
      },
      {
        id: 'hinge_mechanism',
        title: 'Hinge Mechanism',
        description: 'Inspect hinges for proper operation, lubrication, and wear',
        category: 'mechanical',
        required: true,
        order: 2
      },
      {
        id: 'sealing_gaskets',
        title: 'Sealing Gaskets',
        description: 'Check rubber seals and gaskets for integrity and proper sealing',
        category: 'sealing',
        required: true,
        order: 3
      },
      {
        id: 'pressure_testing',
        title: 'Pressure Testing',
        description: 'Perform pressure test to verify door meets specified pressure rating',
        category: 'pressure',
        required: true,
        order: 4
      },
      {
        id: 'locking_mechanism',
        title: 'Locking Mechanism',
        description: 'Test locking mechanism for proper engagement and security',
        category: 'mechanical',
        required: true,
        order: 5
      },
      {
        id: 'emergency_release',
        title: 'Emergency Release',
        description: 'Verify emergency release system functions correctly',
        category: 'safety',
        required: true,
        order: 6
      },
      {
        id: 'surface_coating',
        title: 'Surface Coating',
        description: 'Inspect paint and surface treatment for defects',
        category: 'finish',
        required: false,
        order: 7
      },
      {
        id: 'documentation_check',
        title: 'Documentation Check',
        description: 'Verify all required documentation is complete and accurate',
        category: 'administrative',
        required: true,
        order: 8
      }
    ];

    console.log('📋 Adding inspection points...');
    for (const point of inspectionPoints) {
      await db.collection('inspection_points').doc(point.id).set(point);
      console.log(`✅ Added inspection point: ${point.title}`);
    }

    // Create default serial number configuration
    console.log('🔢 Setting up serial number configuration...');
    await db.collection('system_config').doc('serial_numbers').set({
      startingSerial: 200,
      serialPrefix: 'MUF-S199-RBD',
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    });
    console.log('✅ Serial number configuration created');

    // Create a sample purchase order
    console.log('📦 Creating sample purchase order...');
    const poRef = await db.collection('purchase_orders').add({
      po_number: 'PO-2024-001',
      created_at: new Date().toISOString(),
      status: 'active'
    });
    console.log('✅ Sample purchase order created');

    // Create a sample door
    console.log('🚪 Creating sample door...');
    await db.collection('doors').add({
      po_id: poRef.id,
      door_number: 1,
      serial_number: 'MUF-S199-RBDV1-200-0',
      drawing_number: 'S200',
      job_number: 'JOB-001',
      description: '1.5 Meter 400 kPa Door Refuge Bay Door',
      pressure: 400,
      door_type: 'V1',
      size: '1.5',
      inspection_status: 'pending',
      certification_status: 'pending',
      completion_status: 'pending',
      paid_status: 'pending',
      created_at: new Date().toISOString()
    });
    console.log('✅ Sample door created');

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('You can now:');
    console.log('- View doors in the Doors section');
    console.log('- Configure serial numbers in Admin panel');
    console.log('- Start inspections on the sample door');
    console.log('- Generate engraving plates');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    admin.app().delete();
  }
}

seedDatabase();