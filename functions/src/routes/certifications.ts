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
    console.log('Download certificate request for door:', req.params.doorId);
    const doorId = req.params.doorId;
    
    const certs = await db.getCertificationsByDoorId(doorId);
    
    if (certs.length === 0) {
      console.log('No certifications found for door:', doorId);
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const cert = certs[0]; // Get latest certification
    
    // Get door and inspection details to regenerate the PDF
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
    const engineer = await db.getUserById(cert.engineer_id);
    const inspector = await db.getUserById(inspection.inspector_id);

    // Get PO data
    let po_number = null;
    if (door.po_id) {
      const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
      if (poDoc.exists) {
        po_number = poDoc.data()?.po_number;
      }
    }

    // Generate PDF certificate on the fly
    const {filename: pdfFilename, buffer: fileBuffer} = await generateCertificatePDF({
      ...door,
      po_number,
      inspection_date: inspection.inspection_date,
      inspector_name: inspector?.name
    }, enhancedChecks, engineer!, cert.signature);

    // Update the certification record with the new filename
    await db.db.collection('certifications').doc(cert.id).update({
      certificate_pdf_path: pdfFilename
    });

    // Notify admins if a client downloaded the certificate
    if (req.user?.role === 'client') {
      try {
        const admins = await db.db.collection('users').where('role', '==', 'admin').get();
        const adminEmails = admins.docs.map(doc => doc.data().email).filter(Boolean);
        if (adminEmails.length > 0) {
          const downloader = await db.getUserById(req.user.userId);
          const { notifyAdminCertificateDownloaded } = await import('../services/emailService');
          await notifyAdminCertificateDownloaded({
            recipientEmails: adminEmails,
            downloader: {
              id: req.user.userId,
              name: downloader?.name,
              email: downloader?.email || req.user.email,
              role: req.user.role
            },
            doorDetails: {
              serial_number: door.serial_number,
              drawing_number: door.drawing_number,
              description: door.description,
              po_number: po_number || undefined,
              pressure: door.pressure?.toString(),
              size: door.size?.toString(),
              job_number: door.job_number
            }
          });
        }
      } catch (emailError) {
        console.error('Error sending client download notification:', emailError);
      }
    }

    console.log('Certificate PDF regenerated:', pdfFilename);
    console.log('Certificate file downloaded, size:', fileBuffer.length);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
    res.setHeader('Content-Length', fileBuffer.length.toString());
    res.send(fileBuffer);
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

// Helper: download an image from URL and return as Buffer
async function downloadImage(url: string): Promise<Buffer> {
  const https = require('https');
  const http = require('http');
  const protocol = url.startsWith('https') ? https : http;

  return new Promise<Buffer>((resolve, reject) => {
    protocol.get(url, (response: any) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadImage(response.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Generate PDF Design Certificate matching SPECTIV reference layout
async function generateCertificatePDF(door: any, checks: any[], engineer: any, signature?: string): Promise<{filename: string, buffer: Buffer}> {
  return new Promise(async (resolve, reject) => {
    try {
      const filename = `certificate-${door.serial_number}-${Date.now()}.pdf`;

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          const file = bucket.file(`certificates/${filename}`);
          await file.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
          resolve({ filename, buffer: pdfBuffer });
        } catch (uploadError) {
          reject(uploadError);
        }
      });

      // ── Pre-fetch all images in parallel ──
      const companyLogoUrl = await db.getCompanyLogoUrl();

      // Get door type images and reference drawing from Firestore
      let doorTypeImages: { high_pressure_side?: string; low_pressure_side?: string } = {};
      let doorTypeName = '';
      let referenceDrawing = '';
      if (door.door_type_id) {
        const doorTypeDoc = await db.db.collection('door_types').doc(door.door_type_id).get();
        if (doorTypeDoc.exists) {
          const data = doorTypeDoc.data();
          doorTypeImages = data?.images || {};
          doorTypeName = data?.name || '';
          referenceDrawing = data?.reference_drawing || '';
        }
      }

      // Download all images in parallel
      const [logoBuffer, highPressureBuffer, lowPressureBuffer, signatureBuffer] = await Promise.all([
        companyLogoUrl ? downloadImage(companyLogoUrl).catch(() => null) : Promise.resolve(null),
        doorTypeImages.high_pressure_side ? downloadImage(doorTypeImages.high_pressure_side).catch(() => null) : Promise.resolve(null),
        doorTypeImages.low_pressure_side ? downloadImage(doorTypeImages.low_pressure_side).catch(() => null) : Promise.resolve(null),
        engineer.signature_url ? downloadImage(engineer.signature_url).catch(() => null) : Promise.resolve(null),
      ]);

      const pageWidth = 515; // A4 width minus margins (595 - 40*2)
      const leftMargin = 40;
      const certDate = new Date();
      const dateStr = certDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

      // Determine pressure values
      const pressureHigh = door.pressure || 400;
      const pressureLow = door.pressure_low || 140;

      // ═══════════════════════════════════════════
      // HEADER: Logo (left) + Info Table (right)
      // ═══════════════════════════════════════════
      const headerTop = 40;
      const infoTableX = 300;
      const infoTableWidth = pageWidth - (infoTableX - leftMargin);
      const infoRowHeight = 18;

      // Company logo
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, leftMargin, headerTop, { fit: [200, 80] });
        } catch (e) {
          console.error('Error adding logo to PDF:', e);
        }
      }

      // Info table (right side)
      const infoRows = [
        { label: 'Job Description', value: 'Refuge Bay Door' },
        { label: 'Client', value: door.client_name || door.description || 'Manufab/ HCC' },
        { label: 'Date', value: dateStr },
        { label: 'Certificate', value: door.serial_number || '' },
      ];

      const labelColWidth = infoTableWidth * 0.45;
      const valueColWidth = infoTableWidth * 0.55;

      let currentY = headerTop;
      infoRows.forEach((row) => {
        // Calculate required height for the text
        doc.font('Helvetica-Bold').fontSize(8);
        const valueHeight = doc.heightOfString(row.value, { width: valueColWidth - 8 });
        const rowHeight = Math.max(infoRowHeight, valueHeight + 10); // 10 for padding (5 top, 5 bottom)

        // Cell borders
        doc.rect(infoTableX, currentY, labelColWidth, rowHeight).stroke('#000');
        doc.rect(infoTableX + labelColWidth, currentY, valueColWidth, rowHeight).stroke('#000');
        // Label text
        doc.font('Helvetica-Bold').fontSize(8)
          .text(row.label, infoTableX + 4, currentY + 5, { width: labelColWidth - 8 });
        // Value text
        doc.font('Helvetica-Bold').fontSize(8)
          .text(row.value, infoTableX + labelColWidth + 4, currentY + 5, { width: valueColWidth - 8 });
          
        currentY += rowHeight;
      });

      // ═══════════════════════════════════════════
      // TITLE: DESIGN CERTIFICATE
      // ═══════════════════════════════════════════
      const titleY = currentY + 30;
      doc.font('Helvetica-BoldOblique').fontSize(22)
        .text('DESIGN CERTIFICATE', leftMargin, titleY);

      // ═══════════════════════════════════════════
      // BODY TEXT
      // ═══════════════════════════════════════════
      const bodyStartY = titleY + 40;
      const leftColWidth = 280;

      doc.font('Helvetica').fontSize(10)
        .text(
          'This is to certify that the Blast Door depicted in the drawings listed below, has been designed by Rational Design.',
          leftMargin, bodyStartY, { width: leftColWidth, lineGap: 2 }
        );

      // ═══════════════════════════════════════════
      // SPECIFICATIONS (left column)
      // ═══════════════════════════════════════════
      let specY = bodyStartY + 50;
      const labelX = leftMargin;
      const valueX = leftMargin + 140;

      // Design Code
      doc.font('Helvetica').fontSize(10)
        .text('Design Code:', labelX, specY);
      doc.font('Helvetica-Bold').fontSize(10)
        .text('SANS10162 part 1', valueX, specY);
      specY += 18;

      // Rating - High Pressure
      doc.font('Helvetica').fontSize(10)
        .text('Rating:', labelX, specY);
      doc.font('Helvetica').fontSize(10)
        .text('High Pressure side:', valueX, specY);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('red')
        .text(`${pressureHigh} kPa`, valueX + 110, specY);
      doc.fillColor('black');
      specY += 18;

      // Rating - Low Pressure
      doc.font('Helvetica').fontSize(10)
        .text('Low Pressure side:', valueX, specY);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('red')
        .text(`${pressureLow} kPa`, valueX + 110, specY);
      doc.fillColor('black');
      specY += 30;

      // Door Type
      doc.font('Helvetica').fontSize(10)
        .text('Door type:', labelX, specY);
      doc.font('Helvetica-Bold').fontSize(10)
        .text(doorTypeName || door.door_type || 'N/A', valueX, specY);
      specY += 18;

      // Reference Drawing
      doc.font('Helvetica').fontSize(10)
        .text('Reference Drawing:', labelX, specY);
      doc.font('Helvetica-Bold').fontSize(10)
        .text(referenceDrawing || door.drawing_number || 'N/A', valueX, specY);
      specY += 18;

      // Serial Number
      doc.font('Helvetica').fontSize(10)
        .text('Serial Number:', labelX, specY);
      doc.font('Helvetica-Bold').fontSize(10)
        .text(door.serial_number || 'N/A', valueX, specY);
      specY += 18;

      // ═══════════════════════════════════════════
      // DOOR TYPE IMAGES (right column)
      // ═══════════════════════════════════════════
      const imageX = 310;
      const imageWidth = 220;
      const imageHeight = 180;

      // Image 1: High Pressure Side (top right)
      let imgY = bodyStartY - 10;
      if (highPressureBuffer) {
        try {
          // Label above image
          doc.font('Helvetica').fontSize(7).fillColor('#555');
          const hpLabelWidth = doc.widthOfString('LOW PRESSURE SIDE');
          doc.text('LOW PRESSURE SIDE', imageX + imageWidth - hpLabelWidth - 5, imgY - 2);
          doc.fillColor('black');

          doc.image(highPressureBuffer, imageX, imgY + 8, {
            fit: [imageWidth, imageHeight],
            align: 'center',
          });

          // Label: HIGH PRESSURE SIDE at bottom right
          doc.font('Helvetica').fontSize(7).fillColor('#555');
          doc.text('HIGH PRESSURE SIDE', imageX + imageWidth - 100, imgY + imageHeight - 5);
          doc.fillColor('black');

          // ISO VIEW label
          doc.font('Helvetica-Oblique').fontSize(7).fillColor('#888')
            .text('ISO VIEW', imageX + imageWidth / 2 - 15, imgY + imageHeight + 10);
          doc.fillColor('black');
        } catch (e) {
          console.error('Error adding high pressure image:', e);
        }
      }

      // Image 2: Low Pressure Side (bottom right)
      imgY = imgY + imageHeight + 30;
      if (lowPressureBuffer) {
        try {
          // Label: HIGH PRESSURE SIDE above
          doc.font('Helvetica').fontSize(7).fillColor('#555');
          doc.text('HIGH PRESSURE SIDE', imageX + imageWidth / 2 - 40, imgY - 2);
          doc.fillColor('black');

          doc.image(lowPressureBuffer, imageX, imgY + 8, {
            fit: [imageWidth, imageHeight],
            align: 'center',
          });

          // Label: LOW PRESSURE SIDE at bottom right
          doc.font('Helvetica').fontSize(7).fillColor('#555');
          doc.text('LOW PRESSURE SIDE', imageX + imageWidth - 100, imgY + imageHeight - 5);
          doc.fillColor('black');

          // ISO VIEW label
          doc.font('Helvetica-Oblique').fontSize(7).fillColor('#888')
            .text('ISO VIEW', imageX + imageWidth / 2 - 15, imgY + imageHeight + 10);
          doc.fillColor('black');
        } catch (e) {
          console.error('Error adding low pressure image:', e);
        }
      }

      // ═══════════════════════════════════════════
      // SIGNATURE SECTION (bottom left)
      // ═══════════════════════════════════════════
      const sigSectionY = 680;

      doc.font('Helvetica').fontSize(11)
        .text('Signed:', leftMargin, sigSectionY);

      if (signatureBuffer) {
        try {
          doc.image(signatureBuffer, leftMargin, sigSectionY + 18, { width: 150, height: 60 });
        } catch (e) {
          console.error('Error adding signature image:', e);
        }
      }

      // Dotted line under signature
      const lineY = sigSectionY + 85;
      doc.moveTo(leftMargin, lineY)
        .lineTo(leftMargin + 250, lineY)
        .dash(2, { space: 2 })
        .stroke('#000');
      doc.undash();

      // Engineer name and title
      doc.font('Helvetica-Bold').fontSize(10)
        .text(engineer.name?.toUpperCase() || 'ENGINEER', leftMargin, lineY + 8);

      if (engineer.title || engineer.qualifications) {
        doc.font('Helvetica-Oblique').fontSize(9)
          .text(engineer.title || engineer.qualifications || 'Structural Engineering Designer', leftMargin, lineY + 22);
      } else {
        doc.font('Helvetica-Oblique').fontSize(9)
          .text('Structural Engineering Designer', leftMargin, lineY + 22);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export default router;
