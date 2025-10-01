import { Router } from 'express';
import { FirestoreDB } from '../database/firestore';
import { verifyToken, requireRole } from '../middleware/auth';
import { Timestamp } from 'firebase-admin/firestore';

const router = Router();
const db = FirestoreDB.getInstance();

// Get all inspections
router.get('/', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const inspections = await db.getInspectionsByStatus('in_progress');
    res.json(inspections);
  } catch (error) {
    console.error('Get inspections error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start inspection
router.post('/start/:doorId', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const doorId = req.params.doorId;
    const inspectorId = req.user?.userId;

    // Check if door exists
    const door = await db.getDoorById(doorId);
    if (!door) {
      return res.status(404).json({ message: 'Door not found' });
    }

    // Check if door already has an active inspection
    const activeInspections = await db.db.collection('door_inspections')
      .where('door_id', '==', doorId)
      .where('status', '==', 'in_progress')
      .get();
    
    if (!activeInspections.empty) {
      return res.status(400).json({ message: 'Door already has an active inspection' });
    }

    // Create inspection
    const inspectionId = await db.createInspection({
      door_id: doorId,
      inspector_id: inspectorId!,
      inspection_date: Timestamp.now(),
      status: 'in_progress'
    });

    // Update door status
    await db.updateDoor(doorId, { inspection_status: 'in_progress' });

    // Create inspection checks for all inspection points
    const inspectionPoints = await db.getInspectionPoints();
    const checks = [];
    
    for (const point of inspectionPoints) {
      const checkId = await db.createInspectionCheck({
        inspection_id: inspectionId,
        inspection_point_id: point.id,
        is_checked: false
      });
      
      checks.push({
        id: checkId,
        inspection_id: inspectionId,
        inspection_point_id: point.id,
        is_checked: false,
        photo_path: null,
        notes: null,
        checked_at: null,
        name: point.name,
        description: point.description,
        order_index: point.order_index
      });
    }

    // Get inspector name
    const inspector = await db.getUserById(inspectorId!);
    
    const inspection = {
      id: inspectionId,
      door_id: doorId,
      inspector_id: inspectorId,
      inspection_date: new Date().toISOString(),
      status: 'in_progress',
      notes: null,
      serial_number: door.serial_number,
      drawing_number: door.drawing_number,
      inspector_name: inspector?.name || 'Unknown Inspector'
    };

    res.status(201).json({ inspection, checks });
  } catch (error) {
    console.error('Start inspection error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get inspection details
router.get('/:id', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const inspectionId = req.params.id;
    
    const inspection = await db.getInspectionById(inspectionId);
    if (!inspection) {
      return res.status(404).json({ message: 'Inspection not found' });
    }

    // Get door details
    const door = await db.getDoorById(inspection.door_id);
    
    // Get inspector details
    const inspector = await db.getUserById(inspection.inspector_id);
    
    // Get checks with point details
    const checks = await db.getChecksByInspectionId(inspectionId);
    const inspectionPoints = await db.getInspectionPoints();
    
    const enhancedChecks = checks.map(check => {
      const point = inspectionPoints.find(p => p.id === check.inspection_point_id);
      return {
        ...check,
        name: point?.name || '',
        description: point?.description || '',
        order_index: point?.order_index || 0
      };
    }).sort((a, b) => a.order_index - b.order_index);

    res.json({
      inspection: {
        ...inspection,
        serial_number: door?.serial_number,
        drawing_number: door?.drawing_number,
        inspector_name: inspector?.name
      },
      checks: enhancedChecks
    });
  } catch (error) {
    console.error('Get inspection details error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update inspection check
router.put('/:inspectionId/checks/:checkId', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const { checkId } = req.params;
    const updates = req.body;

    await db.updateInspectionCheck(checkId, updates);
    
    res.json({ message: 'Check updated successfully' });
  } catch (error) {
    console.error('Update check error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete inspection
router.post('/complete/:inspectionId', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const inspectionId = req.params.inspectionId;
    const { notes } = req.body;

    // Get inspection
    const inspection = await db.getInspectionById(inspectionId);
    if (!inspection) {
      return res.status(404).json({ message: 'Inspection not found' });
    }

    // Update inspection status
    await db.updateInspection(inspectionId, {
      status: 'completed',
      notes
    });

    // Update door status
    await db.updateDoor(inspection.door_id, { inspection_status: 'completed' });

    console.log(`Inspection ${inspectionId} completed`);
    
    res.json({ message: 'Inspection completed successfully' });
  } catch (error) {
    console.error('Complete inspection error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get doors pending inspection (for inspection tabs)
router.get('/doors/pending', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const doors = await db.getDoorsWithPendingInspections();
    res.json(doors);
  } catch (error) {
    console.error('Get pending doors error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get active inspections
router.get('/doors/active', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const inspections = await db.getInspectionsByStatus('in_progress');
    
    // Enhance with door data
    const enhancedInspections = await Promise.all(inspections.map(async (inspection) => {
      const door = await db.getDoorById(inspection.door_id);
      const inspector = await db.getUserById(inspection.inspector_id);
      
      return {
        ...inspection,
        serial_number: door?.serial_number,
        drawing_number: door?.drawing_number,
        inspector_name: inspector?.name
      };
    }));

    res.json(enhancedInspections);
  } catch (error) {
    console.error('Get active inspections error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;