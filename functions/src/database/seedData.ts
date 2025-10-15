import { FirestoreDB } from './firestore';

const inspectionPoints = [
  {
    name: 'Drawing Number Confirmation',
    description: 'Confirm Drawing Number used by Fabricator',
    order_index: 1
  },
  {
    name: 'Overall Dimensions',
    description: 'Confirm Over-All Dimensions',
    order_index: 2
  },
  {
    name: 'Member Sizes',
    description: 'Confirm Member Sizes as per Drawing (As Per Drawing)',
    order_index: 3
  },
  {
    name: 'Plate Thickness',
    description: 'Confirm Plate Thickness (HP=6mm / LP=3mm) (140 kPa - HP & LP=3mm)',
    order_index: 4
  },
  {
    name: 'Structural Welding',
    description: 'Confirm Welding on Structural Members. Size and Quality (6mm) (100 x 200 space Weld)',
    order_index: 5
  },
  {
    name: 'Hinge Welding',
    description: 'Confirm Welding on Hinges. Size and Quality (8mm)',
    order_index: 6
  },
  {
    name: 'Hinge Plate Thickness',
    description: 'Confirm Hinge Plate Thickness (8mm)',
    order_index: 7
  },
  {
    name: 'Hinge Pin Dimension',
    description: 'Confirm Hinge Pin Dimension (M24 x 200) (M20 for 140 kPa Door)',
    order_index: 8
  },
  {
    name: 'General Fit Check',
    description: 'Check for General fit, excessive Gaps between frame and door',
    order_index: 9
  },
  {
    name: 'Door Cleaning',
    description: 'Door cleaned of all spatter and welding defects',
    order_index: 10
  },
  {
    name: 'Grease Nipples',
    description: 'Grease nipples fitted to all hinges',
    order_index: 11
  },
  {
    name: 'Door Functionality',
    description: 'Door Functionality & Smooth operation',
    order_index: 12
  },
  {
    name: 'Silicone Seal',
    description: 'Silicone added to the inside joints to insure a water/ airtight seal',
    order_index: 13
  }
];

export async function seedInspectionPoints(): Promise<void> {
  const db = FirestoreDB.getInstance();
  
  try {
    // Check if inspection points already exist
    const existingPoints = await db.getInspectionPoints();
    if (existingPoints.length > 0) {
      console.log('Inspection points already seeded');
      return;
    }

    console.log('Seeding inspection points...');
    
    for (const point of inspectionPoints) {
      await db.db.collection('inspection_points').add(point);
    }
    
    console.log('Successfully seeded inspection points');
  } catch (error) {
    console.error('Error seeding inspection points:', error);
    throw error;
  }
}

export async function seedDefaultUsers(): Promise<void> {
  const db = FirestoreDB.getInstance();
  const bcrypt = require('bcryptjs');
  
  const defaultUsers = [
    {
      name: 'System Admin',
      email: 'admin@inspex.com',
      role: 'admin' as const
    },
    {
      name: 'John Inspector',
      email: 'inspector@inspex.com',
      role: 'inspector' as const
    },
    {
      name: 'Sarah Engineer',
      email: 'engineer@inspex.com',
      role: 'engineer' as const
    },
    {
      name: 'Mike Client',
      email: 'client@inspex.com',
      role: 'client' as const
    }
  ];

  try {
    console.log('Seeding default users...');
    
    for (const userData of defaultUsers) {
      // Check if user already exists
      const existingUser = await db.getUserByEmail(userData.email);
      if (existingUser) {
        console.log(`User ${userData.email} already exists`);
        continue;
      }

      const hashedPassword = await bcrypt.hash('password123', 10);
      await db.createUser({
        ...userData,
        password: hashedPassword
      });
      
      console.log(`Created user: ${userData.email}`);
    }
    
    console.log('Successfully seeded default users');
  } catch (error) {
    console.error('Error seeding default users:', error);
    throw error;
  }
}

export async function initializeFirestore(): Promise<void> {
  try {
    await seedInspectionPoints();
    // NOTE: Default users are now created via the Admin UI with proper Firebase Auth integration
    // await seedDefaultUsers();
    console.log('Firestore initialization completed');
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    throw error;
  }
}