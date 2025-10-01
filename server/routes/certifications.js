const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Database = require('../database/database');
const { verifyToken } = require('./auth');
const { notifyInspectorForCertificate } = require('../services/emailService');

const router = express.Router();
const db = new Database();

// Get doors pending certification
router.get('/pending', verifyToken, async (req, res) => {
    try {
        const doors = await db.all(`
            SELECT d.*, po.po_number, di.inspection_date, u.name as inspector_name
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            LEFT JOIN door_inspections di ON d.id = di.door_id AND di.status = 'completed'
            LEFT JOIN users u ON di.inspector_id = u.id
            WHERE d.inspection_status = 'completed' AND d.certification_status = 'pending'
            ORDER BY di.inspection_date ASC
        `);
        res.json(doors);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get door inspection details for certification
router.get('/door/:doorId/inspection', verifyToken, async (req, res) => {
    try {
        const inspection = await db.get(`
            SELECT di.*, d.*, po.po_number, u.name as inspector_name
            FROM door_inspections di
            JOIN doors d ON di.door_id = d.id
            JOIN users u ON di.inspector_id = u.id
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            WHERE d.id = ? AND di.status = 'completed'
            ORDER BY di.inspection_date DESC
            LIMIT 1
        `, [req.params.doorId]);

        if (!inspection) {
            return res.status(404).json({ message: 'No completed inspection found for this door' });
        }

        const checks = await db.all(`
            SELECT ic.*, ip.name, ip.description, ip.order_index
            FROM inspection_checks ic
            JOIN inspection_points ip ON ic.inspection_point_id = ip.id
            WHERE ic.inspection_id = ?
            ORDER BY ip.order_index
        `, [inspection.id]);

        res.json({ inspection, checks });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Certify door
router.post('/certify/:doorId', verifyToken, async (req, res) => {
    try {
        const { doorId } = req.params;
        const { signature } = req.body;
        const engineerId = req.user.userId;

        // Check if user is an engineer
        const engineer = await db.get('SELECT * FROM users WHERE id = ? AND role = "engineer"', [engineerId]);
        if (!engineer) {
            return res.status(403).json({ message: 'Only engineers can certify doors' });
        }

        // Get door and inspection details
        const door = await db.get(`
            SELECT d.*, po.po_number, di.id as inspection_id, di.inspection_date, 
                   u.name as inspector_name
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            LEFT JOIN door_inspections di ON d.id = di.door_id AND di.status = 'completed'
            LEFT JOIN users u ON di.inspector_id = u.id
            WHERE d.id = ?
            ORDER BY di.inspection_date DESC
            LIMIT 1
        `, [doorId]);

        if (!door) {
            return res.status(404).json({ message: 'Door not found or not ready for certification' });
        }

        // Get inspection checks
        const checks = await db.all(`
            SELECT ic.*, ip.name, ip.description, ip.order_index
            FROM inspection_checks ic
            JOIN inspection_points ip ON ic.inspection_point_id = ip.id
            WHERE ic.inspection_id = ?
            ORDER BY ip.order_index
        `, [door.inspection_id]);

        // Generate PDF certificate
        const pdfPath = await generateCertificatePDF(door, checks, engineer, signature);

        // Create certification record
        const certResult = await db.run(`
            INSERT INTO certifications (door_id, engineer_id, certificate_pdf_path, signature)
            VALUES (?, ?, ?, ?)
        `, [doorId, engineerId, path.basename(pdfPath), signature]);

        // Update door status
        await db.run('UPDATE doors SET certification_status = "certified" WHERE id = ?', [doorId]);

        // Send notification to inspector
        const inspector = await db.get('SELECT email FROM users WHERE name = ?', [door.inspector_name]);
        if (inspector) {
            const doorDetailsWithEngineer = {
                ...door,
                engineer_name: engineer.name
            };
            const emailResult = await notifyInspectorForCertificate(doorDetailsWithEngineer, [inspector.email]);
            if (!emailResult.success) {
                console.log(`Failed to send certificate notification: ${emailResult.message || emailResult.error}`);
            }
        }

        res.json({
            message: 'Door certified successfully',
            certificateId: certResult.id,
            pdfPath: `/certificates/${path.basename(pdfPath)}`
        });
    } catch (error) {
        const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
        res.status(500).json({ message, error: process.env.NODE_ENV === 'production' ? undefined : error.message });
    }
});

// Download certificate
router.get('/download/:doorId', verifyToken, async (req, res) => {
    try {
        const cert = await db.get(`
            SELECT certificate_pdf_path FROM certifications 
            WHERE door_id = ? 
            ORDER BY certified_at DESC 
            LIMIT 1
        `, [req.params.doorId]);

        if (!cert) {
            return res.status(404).json({ message: 'Certificate not found' });
        }

        const filePath = path.join(__dirname, '../certificates', cert.certificate_pdf_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Certificate file not found' });
        }

        res.download(filePath);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Generate PDF certificate
async function generateCertificatePDF(door, checks, engineer, signature) {
    return new Promise((resolve, reject) => {
        const filename = `certificate-${door.serial_number}-${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../certificates', filename);
        
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(fs.createWriteStream(filePath));

        // Header
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
        doc.text(`Inspection Date: ${new Date(door.inspection_date).toLocaleDateString()}`);
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

        doc.on('end', () => {
            resolve(filePath);
        });

        doc.on('error', (error) => {
            reject(error);
        });
    });
}


// Get completed certifications (for client downloads)
router.get('/completed', verifyToken, async (req, res) => {
    try {
        const certifications = await db.all(`
            SELECT c.*, d.serial_number, d.drawing_number, d.description, po.po_number,
                   u.name as engineer_name
            FROM certifications c
            JOIN doors d ON c.door_id = d.id
            JOIN users u ON c.engineer_id = u.id
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            ORDER BY c.certified_at DESC
        `);
        res.json(certifications);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all certifications
router.get('/', verifyToken, async (req, res) => {
    try {
        const certifications = await db.all(`
            SELECT c.*, d.serial_number, d.drawing_number, po.po_number,
                   u.name as engineer_name
            FROM certifications c
            JOIN doors d ON c.door_id = d.id
            JOIN users u ON c.engineer_id = u.id
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            ORDER BY c.certified_at DESC
        `);
        res.json(certifications);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;