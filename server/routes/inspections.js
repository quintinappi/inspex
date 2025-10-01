const express = require('express');
const multer = require('multer');
const path = require('path');
const Database = require('../database/database');
const { verifyToken } = require('./auth');
const { notifyEngineerForCertification } = require('../services/emailService');

const router = express.Router();
const db = new Database();

// Configure multer for photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/inspections'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `inspection-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Start inspection
router.post('/start/:doorId', verifyToken, async (req, res) => {
    try {
        const { doorId } = req.params;
        const inspectorId = req.user.userId;

        // Check if there's already an active inspection
        const existingInspection = await db.get(
            'SELECT id FROM door_inspections WHERE door_id = ? AND status = "in_progress"',
            [doorId]
        );

        if (existingInspection) {
            return res.status(400).json({ message: 'Inspection already in progress for this door' });
        }

        // Create new inspection
        const result = await db.run(
            'INSERT INTO door_inspections (door_id, inspector_id) VALUES (?, ?)',
            [doorId, inspectorId]
        );

        // Get all inspection points
        const inspectionPoints = await db.all(
            'SELECT * FROM inspection_points WHERE is_active = 1 ORDER BY order_index'
        );

        // Create inspection checks for each point
        for (const point of inspectionPoints) {
            await db.run(
                'INSERT INTO inspection_checks (inspection_id, inspection_point_id) VALUES (?, ?)',
                [result.id, point.id]
            );
        }

        // Update door status
        await db.run('UPDATE doors SET inspection_status = "in_progress" WHERE id = ?', [doorId]);

        // Get the inspection with checks
        const inspection = await db.get(`
            SELECT di.*, d.serial_number, d.drawing_number, u.name as inspector_name
            FROM door_inspections di
            JOIN doors d ON di.door_id = d.id
            JOIN users u ON di.inspector_id = u.id
            WHERE di.id = ?
        `, [result.id]);

        const checks = await db.all(`
            SELECT ic.*, ip.name, ip.description, ip.order_index
            FROM inspection_checks ic
            JOIN inspection_points ip ON ic.inspection_point_id = ip.id
            WHERE ic.inspection_id = ?
            ORDER BY ip.order_index
        `, [result.id]);

        res.json({ inspection, checks });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get inspection details
router.get('/:inspectionId', verifyToken, async (req, res) => {
    try {
        const inspection = await db.get(`
            SELECT di.*, d.serial_number, d.drawing_number, d.description, 
                   u.name as inspector_name, po.po_number
            FROM door_inspections di
            JOIN doors d ON di.door_id = d.id
            JOIN users u ON di.inspector_id = u.id
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            WHERE di.id = ?
        `, [req.params.inspectionId]);

        if (!inspection) {
            return res.status(404).json({ message: 'Inspection not found' });
        }

        const checks = await db.all(`
            SELECT ic.*, ip.name, ip.description, ip.order_index
            FROM inspection_checks ic
            JOIN inspection_points ip ON ic.inspection_point_id = ip.id
            WHERE ic.inspection_id = ?
            ORDER BY ip.order_index
        `, [req.params.inspectionId]);

        res.json({ inspection, checks });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update inspection check
router.put('/check/:checkId', verifyToken, upload.single('photo'), async (req, res) => {
    try {
        const { checkId } = req.params;
        const { is_checked, notes } = req.body;
        const photo_path = req.file ? req.file.filename : null;

        const updateData = {
            is_checked: is_checked === 'true' || is_checked === true ? 1 : 0,
            notes: notes || null,
            checked_at: new Date().toISOString()
        };

        if (photo_path) {
            updateData.photo_path = photo_path;
        }

        // Build dynamic update query
        const fields = Object.keys(updateData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = Object.values(updateData);
        values.push(checkId);

        await db.run(`UPDATE inspection_checks SET ${setClause} WHERE id = ?`, values);

        // Get updated check
        const updatedCheck = await db.get(`
            SELECT ic.*, ip.name, ip.description
            FROM inspection_checks ic
            JOIN inspection_points ip ON ic.inspection_point_id = ip.id
            WHERE ic.id = ?
        `, [checkId]);

        res.json(updatedCheck);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Complete inspection
router.post('/complete/:inspectionId', verifyToken, async (req, res) => {
    try {
        const { inspectionId } = req.params;
        const { notes } = req.body;

        // Update inspection status
        await db.run(
            'UPDATE door_inspections SET status = "completed", notes = ? WHERE id = ?',
            [notes || null, inspectionId]
        );

        // Get door ID
        const inspection = await db.get('SELECT door_id FROM door_inspections WHERE id = ?', [inspectionId]);

        // Update door status
        await db.run('UPDATE doors SET inspection_status = "completed" WHERE id = ?', [inspection.door_id]);

        // Get door details for notification
        const doorDetails = await db.get(`
            SELECT d.*, po.po_number
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            WHERE d.id = ?
        `, [inspection.door_id]);

        // Get all engineers for notification
        const engineers = await db.all('SELECT email FROM users WHERE role = "engineer"');
        const engineerEmails = engineers.map(e => e.email);

        // Send notification to engineers
        if (engineerEmails.length > 0) {
            const emailResult = await notifyEngineerForCertification(doorDetails, engineerEmails);
            if (emailResult.success) {
                console.log(`Inspection ${inspectionId} completed - notification sent to engineers`);
            } else {
                console.log(`Inspection ${inspectionId} completed - email notification failed: ${emailResult.message || emailResult.error}`);
            }
        }

        res.json({ message: 'Inspection completed successfully' });
    } catch (error) {
        const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
        res.status(500).json({ message, error: process.env.NODE_ENV === 'production' ? undefined : error.message });
    }
});

// Get active inspection for a door
router.get('/door/:doorId/active', verifyToken, async (req, res) => {
    try {
        const inspection = await db.get(`
            SELECT di.*, u.name as inspector_name
            FROM door_inspections di
            JOIN users u ON di.inspector_id = u.id
            WHERE di.door_id = ? AND di.status = "in_progress"
        `, [req.params.doorId]);

        if (!inspection) {
            return res.status(404).json({ message: 'No active inspection found' });
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

// Get all inspections (for admin/overview)
router.get('/', verifyToken, async (req, res) => {
    try {
        const inspections = await db.all(`
            SELECT di.*, d.serial_number, d.drawing_number, u.name as inspector_name,
                   po.po_number,
                   (SELECT COUNT(*) FROM inspection_checks WHERE inspection_id = di.id AND is_checked = 1) as completed_checks,
                   (SELECT COUNT(*) FROM inspection_checks WHERE inspection_id = di.id) as total_checks
            FROM door_inspections di
            JOIN doors d ON di.door_id = d.id
            JOIN users u ON di.inspector_id = u.id
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            ORDER BY di.inspection_date DESC
        `);

        res.json(inspections);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;