import { Router } from 'express';
import { FirestoreDB, DoorInspection, Certification } from '../database/firestore';
import { verifyToken, requireRole } from '../middleware/auth';
import PDFDocument from 'pdfkit';
import { getStorage } from 'firebase-admin/storage';

const router = Router();
const db = FirestoreDB.getInstance();
const bucket = getStorage().bucket();

// Get doors pending certification (including under_review)
router.get('/pending', verifyToken, requireRole(['admin', 'engineer']), async (req, res) => {
  try {
    // Get doors with completed inspections that are pending OR under_review
    const pendingDoorsSnapshot = await db.db.collection('doors')
      .where('inspection_status', '==', 'completed')
      .where('certification_status', '==', 'pending')
      .get();

    const underReviewDoorsSnapshot = await db.db.collection('doors')
      .where('inspection_status', '==', 'completed')
      .where('certification_status', '==', 'under_review')
      .get();

    // Combine both queries
    const allDoorDocs = [...pendingDoorsSnapshot.docs, ...underReviewDoorsSnapshot.docs];
    const doors: any[] = allDoorDocs.map(doc => ({ id: doc.id, ...doc.data() }));
    
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
    const inspection: any = { id: inspectionDoc.id, ...inspectionDoc.data() };

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
    const inspectionData = inspectionDoc.data() as Omit<DoorInspection, 'id'>;
    const inspection = { id: inspectionDoc.id, ...inspectionData };
    
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
    const {filename: pdfFilename, buffer: pdfBuffer} = await generateCertificatePDF({
      ...door,
      po_number,
      inspection_date: inspection.inspection_date,
      inspector_name: inspector?.name
    }, enhancedChecks, engineer!, signature);

    // Create certification record
    const certId = await db.createCertification({
      door_id: doorId,
      engineer_id: engineerId,
      certificate_pdf_path: pdfFilename,
      signature
    });

    // Update door status
    await db.updateDoor(doorId, { certification_status: 'certified' });

    // Send email notifications to admin and client with PDF attached
    try {
      const { notifyCertificationReady } = await import('../services/emailService');

      // Get admin emails
      const admins = await db.db.collection('users').where('role', '==', 'admin').get();
      const adminEmails = admins.docs.map(doc => doc.data().email).filter(Boolean);

      // TODO: Get client email from door/PO data
      const recipientEmails = [...adminEmails];

      if (recipientEmails.length > 0) {
        await notifyCertificationReady({
          doorDetails: {
            serial_number: door.serial_number,
            drawing_number: door.drawing_number,
            description: door.description,
            po_number,
            pressure: door.pressure?.toString(),
            size: door.size?.toString()
          },
          engineerName: engineer!.name,
          recipientEmails,
          pdfBuffer,
          pdfFilename
        });
      }
    } catch (emailError) {
      console.error('Error sending certification email:', emailError);
      // Don't fail the certification if email fails
    }

    res.json({
      message: 'Door certified successfully',
      certificateId: certId,
      pdfPath: `/certificates/${pdfFilename}`
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

// Get user's certificates based on their role
router.get('/my-certificates', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId!;
    const userRole = req.user?.role;

    let certifications: Certification[] = [];

    // Filter certifications based on user role
    if (userRole === 'admin') {
      // Admin can see all certifications
      certifications = await db.getAllCertifications();
    } else if (userRole === 'engineer') {
      // Engineer can see certifications they issued
      certifications = await db.getCertificationsByEngineerId(userId);
    } else if (userRole === 'inspector') {
      // Inspector can see certifications for doors they inspected
      certifications = await db.getCertificationsByDoorsInspectedByUser(userId);
    } else if (userRole === 'client') {
      // Client: For now, show all certifications (needs client-door linking in future)
      // TODO: Implement client-door linking
      certifications = await db.getAllCertifications();
    }

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

      // For inspectors and clients, also get inspector name
      let inspector_name = null;
      if (userRole === 'inspector' || userRole === 'client') {
        const inspectionsSnapshot = await db.db.collection('door_inspections')
          .where('door_id', '==', cert.door_id)
          .where('status', '==', 'completed')
          .orderBy('inspection_date', 'desc')
          .limit(1)
          .get();

        if (!inspectionsSnapshot.empty) {
          const inspection = inspectionsSnapshot.docs[0].data();
          const inspector = await db.getUserById(inspection.inspector_id);
          inspector_name = inspector?.name;
        }
      }

      return {
        ...cert,
        serial_number: door?.serial_number,
        drawing_number: door?.drawing_number,
        description: door?.description,
        po_number,
        engineer_name: engineer?.name,
        inspector_name,
        certification_status: door?.certification_status || 'certified',
        certified_at: cert.certified_at.toDate().toISOString()
      };
    }));

    res.json(enhancedCertifications);
  } catch (error) {
    console.error('Get user certificates error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject certification (engineer/admin)
router.post('/reject/:doorId', verifyToken, requireRole(['admin', 'engineer']), async (req, res) => {
  try {
    const { doorId } = req.params;
    const { reason } = req.body;
    const engineerId = req.user?.userId!;

    if (!reason?.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

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
    const inspection = inspectionDoc.data() as Omit<DoorInspection, 'id'>;

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

    // Update door status and store rejection reason
    await db.updateDoor(doorId, {
      certification_status: 'rejected',
      inspection_status: 'pending',
      rejection_reason: reason
    });

    // Send email notifications to admin, inspector, and all engineers
    try {
      const { notifyRejection } = await import('../services/emailService');

      // Get admin emails
      const admins = await db.db.collection('users').where('role', '==', 'admin').get();
      const adminEmails = admins.docs.map(doc => doc.data().email).filter(Boolean);

      // Get all engineer emails (to notify the team)
      const engineers = await db.db.collection('users').where('role', '==', 'engineer').get();
      const engineerEmails = engineers.docs.map(doc => doc.data().email).filter(Boolean);

      // Include inspector email
      const recipientEmails = [
        ...adminEmails,
        ...engineerEmails,
        inspector?.email
      ].filter(Boolean);

      if (recipientEmails.length > 0) {
        await notifyRejection({
          doorDetails: {
            serial_number: door.serial_number,
            drawing_number: door.drawing_number,
            description: door.description,
            po_number
          },
          rejectorName: engineer!.name,
          rejectionReason: reason,
          recipientEmails
        });
      }
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
      // Don't fail the rejection if email fails
    }

    res.json({
      message: 'Certification rejected successfully. Team has been notified via email.'
    });
  } catch (error) {
    console.error('Reject certification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete certification (admin only)
router.delete('/:certId', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const { certId } = req.params;

    // Get certification to find PDF path
    const cert = await db.db.collection('certifications').doc(certId).get();

    if (!cert.exists) {
      return res.status(404).json({ message: 'Certification not found' });
    }

    const certData = cert.data() as Certification;

    // Delete PDF from storage
    try {
      const file = bucket.file(`certificates/${certData.certificate_pdf_path}`);
      await file.delete();
    } catch (storageError) {
      console.error('Error deleting PDF from storage:', storageError);
      // Continue with deletion even if file doesn't exist
    }

    // Delete certification document
    await db.db.collection('certifications').doc(certId).delete();

    // Update door status back to pending
    await db.updateDoor(certData.door_id, { certification_status: 'pending' });

    res.json({ message: 'Certification deleted successfully' });
  } catch (error) {
    console.error('Delete certification error:', error);
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

// Generate PDF certificate with engineer signature image
async function generateCertificatePDF(door: any, checks: any[], engineer: any, signature?: string): Promise<{filename: string, buffer: Buffer}> {
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

          resolve({ filename, buffer: pdfBuffer });
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
      doc.text(`Inspection Date: ${door.inspection_date ? new Date(door.inspection_date).toLocaleDateString() : 'N/A'}`);
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

      // Add engineer signature image if available
      if (engineer.signature_url) {
        try {
          // Import required modules for HTTP request
          const https = require('https');
          const http = require('http');

          // Download signature image
          const signatureUrl = engineer.signature_url;
          const protocol = signatureUrl.startsWith('https') ? https : http;

          protocol.get(signatureUrl, (response: any) => {
            const chunks: Buffer[] = [];

            response.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });

            response.on('end', async () => {
              try {
                const imageBuffer = Buffer.concat(chunks);

                // Add signature image to PDF (scaled to 100x50 pixels)
                const imageY = doc.y - 10; // Position above current line
                doc.image(imageBuffer, 50, imageY, { width: 100, height: 50 });
                doc.moveDown(); // Move past the image

                doc.text('Signature:', 50, imageY + 60); // Label below image
                doc.end();
              } catch (imageError) {
                console.error('Error adding signature image:', imageError);
                // Fall back to text signature
                doc.text(`Signature: ${signature ? '[Digital Signature Applied]' : '[No Signature]'}`);
                doc.end();
              }
            });

            response.on('error', (error: any) => {
              console.error('Error downloading signature:', error);
              // Fall back to text signature
              doc.text(`Signature: ${signature ? '[Digital Signature Applied]' : '[No Signature]'}`);
              doc.end();
            });
          });
        } catch (networkError) {
          console.error('Network error loading signature:', networkError);
          doc.text(`Signature: ${signature ? '[Digital Signature Applied]' : '[No Signature]'}`);
          doc.end();
        }
      } else {
        // No signature image available, use text
        doc.text(`Signature: ${signature ? '[Digital Signature Applied]' : '[No Signature]'}`);
        doc.end();
      }
    } catch (error) {
      reject(error);
    }
  });
}

export default router;
