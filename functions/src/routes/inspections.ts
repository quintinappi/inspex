import { Router } from 'express';
import { FirestoreDB, DoorInspection } from '../database/firestore';
import { verifyToken, requireRole } from '../middleware/auth';
import { Timestamp } from 'firebase-admin/firestore';

const router = Router();
const db = FirestoreDB.getInstance();

// Get all inspections
router.get('/', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    // Get all inspections (both in_progress and completed)
    const allInspections = await db.db.collection('door_inspections')
      .orderBy('inspection_date', 'desc')
      .get();

    const enhancedInspections = await Promise.all(allInspections.docs.map(async (doc) => {
      const inspectionData = doc.data() as Omit<DoorInspection, 'id'>;
      const inspection = { id: doc.id, ...inspectionData };

      // Get door details
      const door = await db.getDoorById(inspection.door_id);

      // Get inspector details
      const inspector = await db.getUserById(inspection.inspector_id);

      // Get checks count
      const checksSnapshot = await db.db.collection('inspection_checks')
        .where('inspection_id', '==', inspection.id)
        .get();

      const totalChecks = checksSnapshot.size;
      const completedChecks = checksSnapshot.docs.filter(doc => doc.data().is_checked === true).length;

      return {
        ...inspection,
        serial_number: door?.serial_number || 'N/A',
        inspector_name: inspector?.name || 'Unknown',
        total_checks: totalChecks,
        completed_checks: completedChecks,
        inspection_date: inspection.inspection_date?.toDate?.()?.toISOString() || inspection.inspection_date,
        completed_date: inspection.completed_date?.toDate?.()?.toISOString() || inspection.completed_date,
        certification_status: door?.certification_status || 'pending'
      };
    }));

    res.json(enhancedInspections);
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
    // Exception: Allow new inspections for rejected doors (they need re-inspection)
    const activeInspections = await db.db.collection('door_inspections')
      .where('door_id', '==', doorId)
      .where('status', '==', 'in_progress')
      .get();

    if (!activeInspections.empty && door.certification_status !== 'rejected') {
      return res.status(400).json({ message: 'Door already has an active inspection' });
    }

    // If door is rejected, mark any old completed inspections as superseded
    if (door.certification_status === 'rejected') {
      const oldInspections = await db.db.collection('door_inspections')
        .where('door_id', '==', doorId)
        .where('status', '==', 'completed')
        .get();

      // Mark all old inspections as superseded
      const batch = db.db.batch();
      oldInspections.docs.forEach(doc => {
        batch.update(doc.ref, { status: 'superseded' });
      });
      if (!oldInspections.empty) {
        await batch.commit();
        console.log(`Marked ${oldInspections.size} old inspections as superseded for rejected door ${doorId}`);
      }
    }

    // Create inspection
    const inspectionId = await db.createInspection({
      door_id: doorId,
      inspector_id: inspectorId!,
      inspection_date: Timestamp.now(),
      status: 'in_progress'
    });
    console.log(`[POST /inspections/start/:doorId] Created inspection with ID: ${inspectionId} for door: ${doorId}`);

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
    console.log(`[GET /inspections/:id] Fetching inspection with ID: ${inspectionId}`);

    const inspection = await db.getInspectionById(inspectionId);
    console.log(`[GET /inspections/:id] Inspection found:`, inspection ? 'YES' : 'NO');

    if (!inspection) {
      console.error(`[GET /inspections/:id] Inspection ${inspectionId} not found in Firestore`);
      return res.status(404).json({ message: 'Inspection not found', inspectionId });
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
      completed_date: Timestamp.now(),
      notes
    });

    // Get door to check current status
    const door = await db.getDoorById(inspection.door_id);

    const doorUpdates: any = {
      inspection_status: 'completed'
    };

    // If door was rejected, reset certification status for re-certification
    if (door && door.certification_status === 'rejected') {
      doorUpdates.certification_status = 'pending';
      doorUpdates.rejection_reason = null;
      console.log(`Resetting rejected door ${inspection.door_id} to pending certification`);
    }

    // Update door status
    await db.updateDoor(inspection.door_id, doorUpdates);

    // Send email notifications to engineers
    try {
      const { notifyInspectionCompleted } = await import('../services/emailService');
      const door = await db.getDoorById(inspection.door_id);
      const inspector = await db.getUserById(inspection.inspector_id);

      // Get PO number
      let po_number = null;
      if (door?.po_id) {
        const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
        if (poDoc.exists) {
          po_number = poDoc.data()?.po_number;
        }
      }

      // Get engineer and admin emails
      const engineers = await db.db.collection('users').where('role', '==', 'engineer').get();
      const engineerEmails = engineers.docs.map(doc => doc.data().email).filter(Boolean);
      const admins = await db.db.collection('users').where('role', '==', 'admin').get();
      const adminEmails = admins.docs.map(doc => doc.data().email).filter(Boolean);
      const recipientEmails = [...engineerEmails, ...adminEmails];

      if (recipientEmails.length > 0) {
        await notifyInspectionCompleted({
          doorDetails: {
            serial_number: door?.serial_number,
            drawing_number: door?.drawing_number,
            description: door?.description,
            po_number,
            pressure: door?.pressure?.toString(),
            size: door?.size?.toString(),
            job_number: door?.job_number
          },
          inspectorName: inspector?.name || 'Unknown Inspector',
          recipientEmails
        });
        console.log(`Inspection completion email sent to ${recipientEmails.length} recipients`);
      }
    } catch (emailError) {
      console.error('Error sending inspection completion email:', emailError);
      // Don't fail the completion if email fails
    }

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

// Delete inspection
router.delete('/:id', verifyToken, requireRole(['admin', 'inspector']), async (req, res) => {
  try {
    const inspectionId = req.params.id;
    console.log(`[DELETE /inspections/:id] Deleting inspection with ID: ${inspectionId}`);

    // Get the inspection to verify it exists
    const inspection = await db.getInspectionById(inspectionId);
    if (!inspection) {
      console.error(`[DELETE /inspections/:id] Inspection ${inspectionId} not found`);
      return res.status(404).json({ message: 'Inspection not found' });
    }

    // Delete the inspection and all associated checks
    await db.deleteInspection(inspectionId);
    console.log(`[DELETE /inspections/:id] Successfully deleted inspection ${inspectionId}`);

    res.json({ message: 'Inspection deleted successfully' });
  } catch (error) {
    console.error('Delete inspection error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;