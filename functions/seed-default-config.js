const admin = require('firebase-admin');

const serviceAccount = require('/Users/cash/2. LOCAL CODING/inspex/inspex001-firebase-adminsdk-fbsvc-ea70ce9a92.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedDefaultConfig() {
  console.log('=== SEEDING DEFAULT CONFIGURATION ===\n');
  
  // Check and create serial config
  console.log('1. Checking serial config...');
  const serialConfigRef = db.collection('config').doc('serial');
  const serialDoc = await serialConfigRef.get();
  
  if (!serialDoc.exists) {
    await serialConfigRef.set({
      startingSerial: 200,
      serialPrefix: 'MUF-S199-RBD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('   ✅ Created default serial config');
  } else {
    console.log('   ℹ️ Serial config already exists:', serialDoc.data());
  }
  
  // Check and create company settings
  console.log('\n2. Checking company settings...');
  const companySettingsRef = db.collection('company_settings').doc('default');
  const companyDoc = await companySettingsRef.get();
  
  if (!companyDoc.exists) {
    await companySettingsRef.set({
      name: 'Spectiv Mechanical',
      address: 'South Africa',
      phone: '',
      email: 'doors@spectiv.co.za',
      website: '',
      logo_url: null,
      logo_storage_path: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('   ✅ Created default company settings');
  } else {
    console.log('   ℹ️ Company settings already exist:', companyDoc.data());
  }
  
  // Create a default purchase order for testing
  console.log('\n3. Checking purchase orders...');
  const poSnapshot = await db.collection('purchase_orders').get();
  
  if (poSnapshot.empty) {
    const defaultPO = {
      po_number: 'PO-001',
      client_name: 'Manufab / HCC',
      client_email: 'quintin@app-i.co.za',
      description: 'Refuge Bay Doors - Initial Order',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.collection('purchase_orders').add(defaultPO);
    console.log('   ✅ Created default purchase order: PO-001');
  } else {
    console.log(`   ℹ️ ${poSnapshot.size} purchase order(s) already exist`);
  }
  
  // Create sample door types if none exist
  console.log('\n4. Checking door types...');
  const doorTypesSnapshot = await db.collection('door_types').get();
  
  if (doorTypesSnapshot.empty) {
    const doorTypes = [
      {
        name: 'Refuge Bay Door V1 - 400 kPa',
        description: 'High pressure refuge bay door with 400 kPa rating',
        pressure_high: 400,
        pressure_low: 0,
        sizes: ['1.5M', '1.8M', '2.0M'],
        images: {
          iso_view: null,
          high_pressure_side: null,
          low_pressure_side: null
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        name: 'Refuge Bay Door V2 - 140 kPa',
        description: 'Standard pressure refuge bay door with 140 kPa rating',
        pressure_high: 140,
        pressure_low: 0,
        sizes: ['1.5M', '1.8M', '2.0M'],
        images: {
          iso_view: null,
          high_pressure_side: null,
          low_pressure_side: null
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    for (const doorType of doorTypes) {
      await db.collection('door_types').add(doorType);
    }
    console.log('   ✅ Created 2 default door types');
  } else {
    console.log(`   ℹ️ ${doorTypesSnapshot.size} door type(s) already exist`);
  }
  
  console.log('\n=== SEEDING COMPLETE ===');
  process.exit(0);
}

seedDefaultConfig().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
