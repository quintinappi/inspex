"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../database/firestore");
const auth_1 = require("../middleware/auth");
const pdfkit_1 = __importDefault(require("pdfkit"));
const storage_1 = require("firebase-admin/storage");
const router = (0, express_1.Router)();
const db = firestore_1.FirestoreDB.getInstance();
const bucket = (0, storage_1.getStorage)().bucket();
// Get doors pending certification (including under_review)
router.get('/pending', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'engineer']), async (req, res) => {
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
        const doors = allDoorDocs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Enhance with inspection and inspector details
        const enhancedDoors = await Promise.all(doors.map(async (door) => {
            var _a;
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
                        po_number = (_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.po_number;
                    }
                }
                return Object.assign(Object.assign({}, door), { po_number, inspection_date: inspection.inspection_date, inspector_name: inspector === null || inspector === void 0 ? void 0 : inspector.name });
            }
            return door;
        }));
        res.json(enhancedDoors);
    }
    catch (error) {
        console.error('Get pending certifications error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get door inspection details for certification
router.get('/door/:doorId/inspection', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'engineer']), async (req, res) => {
    var _a;
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
        const inspection = Object.assign({ id: inspectionDoc.id }, inspectionDoc.data());
        // Get inspector details
        const inspector = await db.getUserById(inspection.inspector_id);
        // Get PO data
        let po_number = null;
        if (door.po_id) {
            const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
            if (poDoc.exists) {
                po_number = (_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.po_number;
            }
        }
        // Get inspection checks
        const checks = await db.getChecksByInspectionId(inspection.id);
        const inspectionPoints = await db.getInspectionPoints();
        const enhancedChecks = checks.map(check => {
            const point = inspectionPoints.find(p => p.id === check.inspection_point_id);
            return Object.assign(Object.assign({}, check), { name: (point === null || point === void 0 ? void 0 : point.name) || '', description: (point === null || point === void 0 ? void 0 : point.description) || '', order_index: (point === null || point === void 0 ? void 0 : point.order_index) || 0 });
        }).sort((a, b) => a.order_index - b.order_index);
        res.json({
            inspection: Object.assign(Object.assign(Object.assign({}, inspection), door), { po_number, inspector_name: inspector === null || inspector === void 0 ? void 0 : inspector.name }),
            checks: enhancedChecks
        });
    }
    catch (error) {
        console.error('Get door inspection details error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Certify door
router.post('/certify/:doorId', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'engineer']), async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { doorId } = req.params;
        const { signature } = req.body;
        const engineerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
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
        const inspectionData = inspectionDoc.data();
        const inspection = Object.assign({ id: inspectionDoc.id }, inspectionData);
        // Get inspection checks
        const checks = await db.getChecksByInspectionId(inspection.id);
        const inspectionPoints = await db.getInspectionPoints();
        const enhancedChecks = checks.map(check => {
            const point = inspectionPoints.find(p => p.id === check.inspection_point_id);
            return Object.assign(Object.assign({}, check), { name: (point === null || point === void 0 ? void 0 : point.name) || '', description: (point === null || point === void 0 ? void 0 : point.description) || '', order_index: (point === null || point === void 0 ? void 0 : point.order_index) || 0 });
        }).sort((a, b) => a.order_index - b.order_index);
        // Get engineer and inspector details
        const engineer = await db.getUserById(engineerId);
        const inspector = await db.getUserById(inspection.inspector_id);
        // Get PO data
        let po_number = null;
        if (door.po_id) {
            const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
            if (poDoc.exists) {
                po_number = (_b = poDoc.data()) === null || _b === void 0 ? void 0 : _b.po_number;
            }
        }
        // Generate PDF certificate
        const { filename: pdfFilename, buffer: pdfBuffer } = await generateCertificatePDF(Object.assign(Object.assign({}, door), { po_number, inspection_date: inspection.inspection_date, inspector_name: inspector === null || inspector === void 0 ? void 0 : inspector.name }), enhancedChecks, engineer, signature);
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
            const { notifyCertificationReady } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
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
                        pressure: (_c = door.pressure) === null || _c === void 0 ? void 0 : _c.toString(),
                        size: (_d = door.size) === null || _d === void 0 ? void 0 : _d.toString()
                    },
                    engineerName: engineer.name,
                    recipientEmails,
                    pdfBuffer,
                    pdfFilename
                });
            }
        }
        catch (emailError) {
            console.error('Error sending certification email:', emailError);
            // Don't fail the certification if email fails
        }
        res.json({
            message: 'Door certified successfully',
            certificateId: certId,
            pdfPath: `/certificates/${pdfFilename}`
        });
    }
    catch (error) {
        console.error('Certify door error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Download certificate
router.get('/download/:doorId', auth_1.verifyToken, async (req, res) => {
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
    }
    catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get completed certifications (for client downloads)
router.get('/completed', auth_1.verifyToken, async (req, res) => {
    try {
        const certifications = await db.getAllCertifications();
        // Enhance with door and engineer details
        const enhancedCertifications = await Promise.all(certifications.map(async (cert) => {
            var _a;
            const door = await db.getDoorById(cert.door_id);
            const engineer = await db.getUserById(cert.engineer_id);
            // Get PO data
            let po_number = null;
            if (door === null || door === void 0 ? void 0 : door.po_id) {
                const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
                if (poDoc.exists) {
                    po_number = (_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.po_number;
                }
            }
            return Object.assign(Object.assign({}, cert), { serial_number: door === null || door === void 0 ? void 0 : door.serial_number, drawing_number: door === null || door === void 0 ? void 0 : door.drawing_number, description: door === null || door === void 0 ? void 0 : door.description, po_number, engineer_name: engineer === null || engineer === void 0 ? void 0 : engineer.name });
        }));
        res.json(enhancedCertifications);
    }
    catch (error) {
        console.error('Get completed certifications error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get user's certificates based on their role
router.get('/my-certificates', auth_1.verifyToken, async (req, res) => {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        let certifications = [];
        // Filter certifications based on user role
        if (userRole === 'admin') {
            // Admin can see all certifications
            certifications = await db.getAllCertifications();
        }
        else if (userRole === 'engineer') {
            // Engineer can see certifications they issued
            certifications = await db.getCertificationsByEngineerId(userId);
        }
        else if (userRole === 'inspector') {
            // Inspector can see certifications for doors they inspected
            certifications = await db.getCertificationsByDoorsInspectedByUser(userId);
        }
        else if (userRole === 'client') {
            // Client: For now, show all certifications (needs client-door linking in future)
            // TODO: Implement client-door linking
            certifications = await db.getAllCertifications();
        }
        // Enhance with door and engineer details
        const enhancedCertifications = await Promise.all(certifications.map(async (cert) => {
            var _a;
            const door = await db.getDoorById(cert.door_id);
            const engineer = await db.getUserById(cert.engineer_id);
            // Get PO data
            let po_number = null;
            if (door === null || door === void 0 ? void 0 : door.po_id) {
                const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
                if (poDoc.exists) {
                    po_number = (_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.po_number;
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
                    inspector_name = inspector === null || inspector === void 0 ? void 0 : inspector.name;
                }
            }
            return Object.assign(Object.assign({}, cert), { serial_number: door === null || door === void 0 ? void 0 : door.serial_number, drawing_number: door === null || door === void 0 ? void 0 : door.drawing_number, description: door === null || door === void 0 ? void 0 : door.description, po_number, engineer_name: engineer === null || engineer === void 0 ? void 0 : engineer.name, inspector_name, certification_status: (door === null || door === void 0 ? void 0 : door.certification_status) || 'certified', certified_at: cert.certified_at.toDate().toISOString() });
        }));
        res.json(enhancedCertifications);
    }
    catch (error) {
        console.error('Get user certificates error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Reject certification (engineer/admin)
router.post('/reject/:doorId', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'engineer']), async (req, res) => {
    var _a, _b;
    try {
        const { doorId } = req.params;
        const { reason } = req.body;
        const engineerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!(reason === null || reason === void 0 ? void 0 : reason.trim())) {
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
        const inspection = inspectionDoc.data();
        // Get engineer and inspector details
        const engineer = await db.getUserById(engineerId);
        const inspector = await db.getUserById(inspection.inspector_id);
        // Get PO data
        let po_number = null;
        if (door.po_id) {
            const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
            if (poDoc.exists) {
                po_number = (_b = poDoc.data()) === null || _b === void 0 ? void 0 : _b.po_number;
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
            const { notifyRejection } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
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
                inspector === null || inspector === void 0 ? void 0 : inspector.email
            ].filter(Boolean);
            if (recipientEmails.length > 0) {
                await notifyRejection({
                    doorDetails: {
                        serial_number: door.serial_number,
                        drawing_number: door.drawing_number,
                        description: door.description,
                        po_number
                    },
                    rejectorName: engineer.name,
                    rejectionReason: reason,
                    recipientEmails
                });
            }
        }
        catch (emailError) {
            console.error('Error sending rejection email:', emailError);
            // Don't fail the rejection if email fails
        }
        res.json({
            message: 'Certification rejected successfully. Team has been notified via email.'
        });
    }
    catch (error) {
        console.error('Reject certification error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Delete certification (admin only)
router.delete('/:certId', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const { certId } = req.params;
        // Get certification to find PDF path
        const cert = await db.db.collection('certifications').doc(certId).get();
        if (!cert.exists) {
            return res.status(404).json({ message: 'Certification not found' });
        }
        const certData = cert.data();
        // Delete PDF from storage
        try {
            const file = bucket.file(`certificates/${certData.certificate_pdf_path}`);
            await file.delete();
        }
        catch (storageError) {
            console.error('Error deleting PDF from storage:', storageError);
            // Continue with deletion even if file doesn't exist
        }
        // Delete certification document
        await db.db.collection('certifications').doc(certId).delete();
        // Update door status back to pending
        await db.updateDoor(certData.door_id, { certification_status: 'pending' });
        res.json({ message: 'Certification deleted successfully' });
    }
    catch (error) {
        console.error('Delete certification error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get all certifications
router.get('/', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'engineer']), async (req, res) => {
    try {
        const certifications = await db.getAllCertifications();
        // Enhance with door and engineer details
        const enhancedCertifications = await Promise.all(certifications.map(async (cert) => {
            var _a;
            const door = await db.getDoorById(cert.door_id);
            const engineer = await db.getUserById(cert.engineer_id);
            // Get PO data
            let po_number = null;
            if (door === null || door === void 0 ? void 0 : door.po_id) {
                const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
                if (poDoc.exists) {
                    po_number = (_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.po_number;
                }
            }
            return Object.assign(Object.assign({}, cert), { serial_number: door === null || door === void 0 ? void 0 : door.serial_number, drawing_number: door === null || door === void 0 ? void 0 : door.drawing_number, po_number, engineer_name: engineer === null || engineer === void 0 ? void 0 : engineer.name });
        }));
        res.json(enhancedCertifications);
    }
    catch (error) {
        console.error('Get all certifications error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Generate PDF certificate with engineer signature image
async function generateCertificatePDF(door, checks, engineer, signature) {
    return new Promise(async (resolve, reject) => {
        try {
            const filename = `certificate-${door.serial_number}-${Date.now()}.pdf`;
            // Create PDF in memory
            const doc = new pdfkit_1.default({ margin: 50 });
            const buffers = [];
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
                }
                catch (uploadError) {
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
                    protocol.get(signatureUrl, (response) => {
                        const chunks = [];
                        response.on('data', (chunk) => {
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
                            }
                            catch (imageError) {
                                console.error('Error adding signature image:', imageError);
                                // Fall back to text signature
                                doc.text(`Signature: ${signature ? '[Digital Signature Applied]' : '[No Signature]'}`);
                                doc.end();
                            }
                        });
                        response.on('error', (error) => {
                            console.error('Error downloading signature:', error);
                            // Fall back to text signature
                            doc.text(`Signature: ${signature ? '[Digital Signature Applied]' : '[No Signature]'}`);
                            doc.end();
                        });
                    });
                }
                catch (networkError) {
                    console.error('Network error loading signature:', networkError);
                    doc.text(`Signature: ${signature ? '[Digital Signature Applied]' : '[No Signature]'}`);
                    doc.end();
                }
            }
            else {
                // No signature image available, use text
                doc.text(`Signature: ${signature ? '[Digital Signature Applied]' : '[No Signature]'}`);
                doc.end();
            }
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.default = router;
//# sourceMappingURL=certifications.js.map