import { Router } from 'express';
import { FirestoreDB } from '../database/firestore';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
const db = FirestoreDB.getInstance();

// Get all doors
router.get('/', verifyToken, async (req, res) => {
  try {
    const doors = await db.getAllDoors();
    
    // Enhance with PO data and inspection status
    const enhancedDoors = await Promise.all(doors.map(async (door) => {
      // Get PO data
      let po_number = null;
      if (door.po_id) {
        const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
        if (poDoc.exists) {
          po_number = poDoc.data()?.po_number;
        }
      }

      // Check for active inspection
      const activeInspections = await db.db.collection('door_inspections')
        .where('door_id', '==', door.id)
        .where('status', '==', 'in_progress')
        .get();
      
      const current_inspection_status = 
        !activeInspections.empty ? 'in_progress' :
        door.inspection_status === 'completed' ? 'completed' : 'pending';

      return {
        ...door,
        po_number,
        current_inspection_status
      };
    }));

    res.json(enhancedDoors);
  } catch (error) {
    console.error('Get doors error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single door
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const door = await db.getDoorById(req.params.id);
    if (!door) {
      return res.status(404).json({ message: 'Door not found' });
    }

    // Get PO data
    let po_number = null;
    if (door.po_id) {
      const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
      if (poDoc.exists) {
        po_number = poDoc.data()?.po_number;
      }
    }

    res.json({ ...door, po_number });
  } catch (error) {
    console.error('Get door error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new door
router.post('/', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const { po_number, door_number, job_number, pressure, size } = req.body;

    if (!po_number || !door_number || !job_number || !pressure || !size) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['1.5', '1.8', '2.0'].includes(size)) {
      return res.status(400).json({ message: 'Invalid size. Must be 1.5, 1.8, or 2.0' });
    }

    // Create or find purchase order
    let po = await db.getPurchaseOrderByNumber(po_number);
    if (!po) {
      const poId = await db.createPurchaseOrder(po_number);
      po = { id: poId, po_number, created_at: new Date() as any };
    }

    // Generate serial and drawing numbers
    const nextNum = await db.getNextSerialNumber();
    const doorType = parseInt(pressure) === 400 ? 'V1' : 'V2';
    const serialNumber = await db.generateSerialNumber(nextNum, doorType);
    const drawingNumber = db.generateDrawingNumber(nextNum);
    
    // Create description
    const description = `${size} Meter ${pressure} kPa Door Refuge Bay Door`;

    // Create door
    const doorId = await db.createDoor({
      po_id: po.id,
      door_number: parseInt(door_number),
      serial_number: serialNumber,
      drawing_number: drawingNumber,
      job_number,
      description,
      pressure: parseInt(pressure),
      door_type: doorType,
      size,
      inspection_status: 'pending',
      certification_status: 'pending',
      completion_status: 'pending',
      paid_status: 'pending'
    });

    // Get the created door with PO data
    const newDoor = await db.getDoorById(doorId);
    
    res.status(201).json({
      ...newDoor,
      po_number: po.po_number
    });
  } catch (error) {
    console.error('Create door error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update door
router.put('/:id', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const updates = req.body;
    await db.updateDoor(req.params.id, updates);
    
    const updatedDoor = await db.getDoorById(req.params.id);
    res.json(updatedDoor);
  } catch (error) {
    console.error('Update door error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get doors ready for inspection
router.get('/ready/inspection', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const doors = await db.getDoorsWithPendingInspections();
    res.json(doors);
  } catch (error) {
    console.error('Get doors ready for inspection error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;