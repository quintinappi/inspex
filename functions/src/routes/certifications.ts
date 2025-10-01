import { Router } from 'express';
import { FirestoreDB } from '../database/firestore';
import { verifyToken, requireRole } from '../middleware/auth';
import * as PDFDocument from 'pdfkit';
import { getStorage } from 'firebase-admin/storage';

const router = Router();
const db = FirestoreDB.getInstance();
const bucket = getStorage().bucket();

// Get doors pending certification
router.get('/pending', verifyToken, requireRole(['admin', 'engineer']), async (req, res) => {
  try {
    const doors = await db.getDoorsWithCompletedInspections();
    
    // Enhance with inspection and inspector details
    const enhancedDoors = await Promise.all(doors.map(async (door) => {
      // Get latest completed inspection
      const inspectionsSnapshot = await db.db.collection('door_inspections')
        .where('door_id', '==', door.id)
        .where('status', '==', 'completed')
        .orderBy('inspection_date', 'desc')
        .limit(1)
        .get();
      
      if (!inspectionsSnapshot.empty) {
        const inspection = inspectionsSnapshot.docs[0].data();
        const inspector = await db.getUserById(inspection.inspector_id);
        
        // Get PO data
        let po_number = null;
        if (door.po_id) {
          const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
          if (poDoc.exists) {
            po_number = poDoc.data()?.po_number;
          }
        }
        
        return {
          ...door,
          po_number,
          inspection_date: inspection.inspection_date,
          inspector_name: inspector?.name
        };
      }
      
      return door;
    }));

    res.json(enhancedDoors);
  } catch (error) {
    console.error('Get pending certifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get door inspection details for certification
router.get('/door/:doorId/inspection', verifyToken, requireRole(['admin', 'engineer']), async (req, res) => {
  try {
    const doorId = req.params.doorId;
    
    // Get door
    const door = await db.getDoorById(doorId);
    if (!door) {
      return res.status(404).json({ message: 'Door not found' });
    }

    // Get latest completed inspection
    const inspectionsSnapshot = await db.db.collection('door_inspections')
      .where('door_id', '==', doorId)
      .where('status', '==', 'completed')
      .orderBy('inspection_date', 'desc')
      .limit(1)
      .get();
    
    if (inspectionsSnapshot.empty) {
      return res.status(404).json({ message: 'No completed inspection found for this door' });
    }

    const inspectionDoc = inspectionsSnapshot.docs[0];
    const inspection = { id: inspectionDoc.id, ...inspectionDoc.data() };
    
    // Get inspector details
    const inspector = await db.getUserById(inspection.inspector_id);
    
    // Get PO data
    let po_number = null;
    if (door.po_id) {
      const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
      if (poDoc.exists) {
        po_number = poDoc.data()?.po_number;
      }
    }

    // Get inspection checks
    const checks = await db.getChecksByInspectionId(inspection.id);
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
        ...door,
        po_number,
        inspector_name: inspector?.name
      },
      checks: enhancedChecks
    });
  } catch (error) {
    console.error('Get door inspection details error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Certify door
router.post('/certify/:doorId', verifyToken, requireRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { doorId } = req.params;
    const { signature } = req.body;
    const engineerId = req.user?.userId!;

    // Get door and inspection details
    const door = await db.getDoorById(doorId);
    if (!door) {
      return res.status(404).json({ message: 'Door not found' });
    }

    // Get latest completed inspection
    const inspectionsSnapshot = await db.db.collection('door_inspections')
      .where('door_id', '==', doorId)
      .where('status', '==', 'completed')
      .orderBy('inspection_date', 'desc')
      .limit(1)
      .get();
    
    if (inspectionsSnapshot.empty) {
      return res.status(404).json({ message: 'No completed inspection found for this door' });
    }

    const inspectionDoc = inspectionsSnapshot.docs[0];
    const inspection = { id: inspectionDoc.id, ...inspectionDoc.data() };
    
    // Get inspection checks
    const checks = await db.getChecksByInspectionId(inspection.id);
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

    // Get engineer and inspector details
    const engineer = await db.getUserById(engineerId);
    const inspector = await db.getUserById(inspection.inspector_id);

    // Get PO data
    let po_number = null;
    if (door.po_id) {
      const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
      if (poDoc.exists) {
        po_number = poDoc.data()?.po_number;
      }
    }

    // Generate PDF certificate
    const pdfPath = await generateCertificatePDF({
      ...door,
      po_number,
      inspection_date: inspection.inspection_date,
      inspector_name: inspector?.name
    }, enhancedChecks, engineer!, signature);

    // Create certification record
    const certId = await db.createCertification({
      door_id: doorId,
      engineer_id: engineerId,
      certificate_pdf_path: pdfPath,
      signature
    });

    // Update door status
    await db.updateDoor(doorId, { certification_status: 'certified' });

    res.json({ 
      message: 'Door certified successfully',
      certificateId: certId,
      pdfPath: `/certificates/${pdfPath}`
    });
  } catch (error) {
    console.error('Certify door error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download certificate
router.get('/download/:doorId', verifyToken, async (req, res) => {
  try {
    const certs = await db.getCertificationsByDoorId(req.params.doorId);
    
    if (certs.length === 0) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const cert = certs[0]; // Get latest certification
    const fileName = cert.certificate_pdf_path;
    
    // Get file from Firebase Storage
    const file = bucket.file(`certificates/${fileName}`);
    const [exists] = await file.exists();
    
    if (!exists) {
      return res.status(404).json({ message: 'Certificate file not found' });
    }

    // Stream the file
    const stream = file.createReadStream();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    stream.pipe(res);
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get completed certifications (for client downloads)
router.get('/completed', verifyToken, async (req, res) => {
  try {
    const certifications = await db.getAllCertifications();
    
    // Enhance with door and engineer details
    const enhancedCertifications = await Promise.all(certifications.map(async (cert) => {
      const door = await db.getDoorById(cert.door_id);
      const engineer = await db.getUserById(cert.engineer_id);
      
      // Get PO data
      let po_number = null;
      if (door?.po_id) {
        const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
        if (poDoc.exists) {
          po_number = poDoc.data()?.po_number;
        }
      }
      
      return {
        ...cert,
        serial_number: door?.serial_number,
        drawing_number: door?.drawing_number,
        description: door?.description,
        po_number,
        engineer_name: engineer?.name
      };
    }));

    res.json(enhancedCertifications);
  } catch (error) {
    console.error('Get completed certifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all certifications
router.get('/', verifyToken, requireRole(['admin', 'engineer']), async (req, res) => {
  try {
    const certifications = await db.getAllCertifications();
    
    // Enhance with door and engineer details
    const enhancedCertifications = await Promise.all(certifications.map(async (cert) => {
      const door = await db.getDoorById(cert.door_id);
      const engineer = await db.getUserById(cert.engineer_id);
      
      // Get PO data
      let po_number = null;
      if (door?.po_id) {
        const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
        if (poDoc.exists) {
          po_number = poDoc.data()?.po_number;
        }
      }
      
      return {
        ...cert,
        serial_number: door?.serial_number,
        drawing_number: door?.drawing_number,
        po_number,
        engineer_name: engineer?.name
      };
    }));

    res.json(enhancedCertifications);
  } catch (error) {
    console.error('Get all certifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate PDF certificate
async function generateCertificatePDF(door: any, checks: any[], engineer: any, signature?: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const filename = `certificate-${door.serial_number}-${Date.now()}.pdf`;
      
      // Create PDF in memory
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          
          // Upload to Firebase Storage
          const file = bucket.file(`certificates/${filename}`);
          await file.save(pdfBuffer, {
            metadata: {
              contentType: 'application/pdf'
            }
          });
          
          resolve(filename);
        } catch (uploadError) {
          reject(uploadError);
        }
      });

      // Generate PDF content
      doc.fontSize(20).text('REFUGE BAY DOOR INSPECTION CERTIFICATE', { align: 'center' });
      doc.moveDown();

      // Door information
      doc.fontSize(14).text('DOOR INFORMATION', { underline: true });
      doc.fontSize(12);
      doc.text(`PO Number: ${door.po_number || 'N/A'}`);
      doc.text(`Serial Number: ${door.serial_number}`);
      doc.text(`Drawing Number: ${door.drawing_number}`);
      doc.text(`Description: ${door.description}`);
      doc.text(`Pressure Rating: ${door.pressure} kPa`);
      doc.text(`Inspection Date: ${new Date(door.inspection_date.toDate()).toLocaleDateString()}`);
      doc.text(`Inspector: ${door.inspector_name}`);
      doc.moveDown();

      // Inspection results
      doc.fontSize(14).text('INSPECTION RESULTS', { underline: true });
      doc.fontSize(12);
      
      checks.forEach((check, index) => {
        const status = check.is_checked ? '✓ PASS' : '✗ FAIL';
        doc.text(`${index + 1}. ${check.name}: ${status}`);
        if (check.notes) {
          doc.text(`   Notes: ${check.notes}`, { indent: 20 });
        }
      });

      doc.moveDown(2);

      // Certification
      doc.fontSize(14).text('CERTIFICATION', { underline: true });
      doc.fontSize(12);
      doc.text('I hereby certify that the above refuge bay door has been inspected and meets the required standards.');
      doc.moveDown();
      
      doc.text(`Engineer: ${engineer.name}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Signature: ${signature ? '[Digital Signature Applied]' : '[No Signature]'}`);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default router;