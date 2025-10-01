const express = require('express');
const Database = require('../database/database');
const { verifyToken } = require('./auth');
const { validatePressure, validateSize, validateDoorType, validateRequired, sanitizeString } = require('../utils/validation');

const router = express.Router();
const db = new Database();

// Get all doors
router.get('/', verifyToken, async (req, res) => {
    try {
        const doors = await db.all(`
            SELECT d.*, po.po_number,
                   CASE WHEN di.id IS NOT NULL THEN 'in_progress'
                        WHEN d.inspection_status = 'completed' THEN 'completed'
                        ELSE 'pending'
                   END as current_inspection_status
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            LEFT JOIN door_inspections di ON d.id = di.door_id AND di.status = 'in_progress'
            ORDER BY d.created_at DESC
        `);
        res.json(doors);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single door
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const door = await db.get(`
            SELECT d.*, po.po_number
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            WHERE d.id = ?
        `, [req.params.id]);

        if (!door) {
            return res.status(404).json({ message: 'Door not found' });
        }

        res.json(door);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add new door
router.post('/', verifyToken, async (req, res) => {
    try {
        const { po_number, door_number, job_number, size, pressure } = req.body;

        // Validate inputs
        const poError = validateRequired(po_number, 'PO number');
        if (poError) return res.status(400).json({ message: poError });

        const doorNumError = validateRequired(door_number, 'Door number');
        if (doorNumError) return res.status(400).json({ message: doorNumError });

        if (!validateSize(size)) {
            return res.status(400).json({ message: 'Invalid size. Must be 1.5, 1.8, or 2.0' });
        }

        if (!validatePressure(pressure)) {
            return res.status(400).json({ message: 'Invalid pressure. Must be 140 or 400' });
        }

        // Get or create PO
        let po = await db.get('SELECT id FROM purchase_orders WHERE po_number = ?', [sanitizeString(po_number)]);
        if (!po) {
            const poResult = await db.run('INSERT INTO purchase_orders (po_number) VALUES (?)', [sanitizeString(po_number)]);
            po = { id: poResult.id };
        }

        // Generate serial and drawing numbers
        const nextNum = await db.getNextSerialNumber();
        const doorType = pressure == 400 ? 'V1' : 'V2';
        const serialNumber = db.generateSerialNumber(nextNum, doorType);
        const drawingNumber = db.generateDrawingNumber(nextNum);

        // Create description
        const description = `${size} Meter ${pressure} kPa Door Refuge Bay Door`;

        // Insert door
        const result = await db.run(`
            INSERT INTO doors (po_id, door_number, serial_number, drawing_number, job_number,
                             description, pressure, door_type, size)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [po.id, door_number, serialNumber, drawingNumber, sanitizeString(job_number) || null, description, pressure, doorType, size]);

        // Get the created door
        const newDoor = await db.get(`
            SELECT d.*, po.po_number
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            WHERE d.id = ?
        `, [result.id]);

        res.status(201).json(newDoor);
    } catch (error) {
        const message = process.env.NODE_ENV === 'production' ? 'Server error' : error.message;
        res.status(500).json({ message, error: process.env.NODE_ENV === 'production' ? undefined : error.message });
    }
});

// Update door
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { job_number, inspection_status, certification_status, completion_status, paid_status } = req.body;

        await db.run(`
            UPDATE doors 
            SET job_number = ?, inspection_status = ?, certification_status = ?, 
                completion_status = ?, paid_status = ?
            WHERE id = ?
        `, [job_number, inspection_status, certification_status, completion_status, paid_status, req.params.id]);

        const updatedDoor = await db.get(`
            SELECT d.*, po.po_number
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            WHERE d.id = ?
        `, [req.params.id]);

        res.json(updatedDoor);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete door
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        await db.run('DELETE FROM doors WHERE id = ?', [req.params.id]);
        res.json({ message: 'Door deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get doors pending inspection
router.get('/status/pending-inspection', verifyToken, async (req, res) => {
    try {
        const doors = await db.all(`
            SELECT d.*, po.po_number
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            WHERE d.inspection_status = 'pending'
            ORDER BY d.created_at ASC
        `);
        res.json(doors);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get doors pending certification
router.get('/status/pending-certification', verifyToken, async (req, res) => {
    try {
        const doors = await db.all(`
            SELECT d.*, po.po_number
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            WHERE d.inspection_status = 'completed' AND d.certification_status = 'pending'
            ORDER BY d.created_at ASC
        `);
        res.json(doors);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;