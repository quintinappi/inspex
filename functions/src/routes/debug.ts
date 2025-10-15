import { Request, Response } from 'express';
import { FirestoreDB } from '../database/firestore';

// Temporary debug endpoint to query door data
export const debugDoorQuery = async (req: Request, res: Response) => {
  console.log('🔍 DEBUG: Querying door MF42-15-1041');

  try {
    const db = FirestoreDB.getInstance();

    // Find the door by serial number
    const doorsSnapshot = await db.db.collection('doors')
      .where('serial_number', '==', 'MF42-15-1041')
      .get();

    console.log(`Found ${doorsSnapshot.size} doors`);

    const doors = doorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // If door found, get related data
    let relatedData = { inspections: [], certifications: [] };

    if (doors.length > 0) {
      const doorId = doors[0].id;

      // Get inspections
      const inspectionsSnapshot = await db.db.collection('door_inspections')
        .where('door_id', '==', doorId)
        .get();

      relatedData.inspections = inspectionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get certifications
      const certsSnapshot = await db.db.collection('certifications')
        .where('door_id', '==', doorId)
        .get();

      relatedData.certifications = certsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    res.json({
      targetDoor: 'MF42-15-1041',
      doors,
      relatedData,
      totalDoorsFound: doorsSnapshot.size,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug query error:', error);
    res.status(500).json({
      error: error.message,
      message: 'Debug query failed'
    });
  }
};

// Debug endpoint to get all doors
export const debugAllDoors = async (req: Request, res: Response) => {
  console.log('🔍 DEBUG: Querying all doors');

  try {
    const db = FirestoreDB.getInstance();
    const doorsSnapshot = await db.db.collection('doors').limit(20).get();

    const doors = doorsSnapshot.docs.map(doc => ({
      id: doc.id,
      serial_number: doc.data().serial_number,
      description: doc.data().description,
      inspection_status: doc.data().inspection_status,
      certification_status: doc.data().certification_status
    }));

    const statusCounts = doors.reduce((acc, door) => {
      const certStatus = door.certification_status || 'pending';
      acc[certStatus] = (acc[certStatus] || 0) + 1;
      return acc;
    }, {});

    res.json({
      doors,
      statusCounts,
      totalCount: doors.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug all doors error:', error);
    res.status(500).json({
      error: error.message,
      message: 'Debug all doors query failed'
    });
  }
};