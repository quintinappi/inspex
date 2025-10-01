const express = require('express');
const Database = require('../database/database');
const { verifyToken } = require('./auth');

const router = express.Router();
const db = new Database();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Get all users
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.all('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create user
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        const bcrypt = require('bcryptjs');

        // Check if user exists
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await db.run(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, name, role]
        );

        res.status(201).json({ message: 'User created successfully', userId: result.id });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update user
router.put('/users/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { email, name, role } = req.body;
        
        await db.run(
            'UPDATE users SET email = ?, name = ?, role = ? WHERE id = ?',
            [email, name, role, req.params.id]
        );

        const updatedUser = await db.get(
            'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
            [req.params.id]
        );

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete user
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.user.userId == req.params.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all inspection points
router.get('/inspection-points', verifyToken, requireAdmin, async (req, res) => {
    try {
        const points = await db.all('SELECT * FROM inspection_points ORDER BY order_index');
        res.json(points);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create inspection point
router.post('/inspection-points', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { name, description, order_index } = req.body;
        
        const result = await db.run(
            'INSERT INTO inspection_points (name, description, order_index) VALUES (?, ?, ?)',
            [name, description, order_index]
        );

        const newPoint = await db.get('SELECT * FROM inspection_points WHERE id = ?', [result.id]);
        res.status(201).json(newPoint);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update inspection point
router.put('/inspection-points/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { name, description, order_index, is_active } = req.body;
        
        await db.run(
            'UPDATE inspection_points SET name = ?, description = ?, order_index = ?, is_active = ? WHERE id = ?',
            [name, description, order_index, is_active, req.params.id]
        );

        const updatedPoint = await db.get('SELECT * FROM inspection_points WHERE id = ?', [req.params.id]);
        res.json(updatedPoint);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete inspection point
router.delete('/inspection-points/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM inspection_points WHERE id = ?', [req.params.id]);
        res.json({ message: 'Inspection point deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Reorder inspection points
router.put('/inspection-points/reorder', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { points } = req.body; // Array of { id, order_index }
        
        for (const point of points) {
            await db.run(
                'UPDATE inspection_points SET order_index = ? WHERE id = ?',
                [point.order_index, point.id]
            );
        }

        const updatedPoints = await db.all('SELECT * FROM inspection_points ORDER BY order_index');
        res.json(updatedPoints);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get dashboard statistics
router.get('/dashboard', verifyToken, requireAdmin, async (req, res) => {
    try {
        const stats = {
            totalDoors: await db.get('SELECT COUNT(*) as count FROM doors'),
            pendingInspections: await db.get('SELECT COUNT(*) as count FROM doors WHERE inspection_status = "pending"'),
            inProgressInspections: await db.get('SELECT COUNT(*) as count FROM doors WHERE inspection_status = "in_progress"'),
            completedInspections: await db.get('SELECT COUNT(*) as count FROM doors WHERE inspection_status = "completed"'),
            pendingCertifications: await db.get('SELECT COUNT(*) as count FROM doors WHERE inspection_status = "completed" AND certification_status = "pending"'),
            certifiedDoors: await db.get('SELECT COUNT(*) as count FROM doors WHERE certification_status = "certified"'),
            totalUsers: await db.get('SELECT COUNT(*) as count FROM users'),
            totalInspectors: await db.get('SELECT COUNT(*) as count FROM users WHERE role = "inspector"'),
            totalEngineers: await db.get('SELECT COUNT(*) as count FROM users WHERE role = "engineer"')
        };

        // Recent activity
        const recentDoors = await db.all(`
            SELECT d.*, po.po_number, u.name as inspector_name
            FROM doors d
            LEFT JOIN purchase_orders po ON d.po_id = po.id
            LEFT JOIN door_inspections di ON d.id = di.door_id AND di.status = 'in_progress'
            LEFT JOIN users u ON di.inspector_id = u.id
            ORDER BY d.created_at DESC
            LIMIT 10
        `);

        const recentInspections = await db.all(`
            SELECT di.*, d.serial_number, d.drawing_number, u.name as inspector_name
            FROM door_inspections di
            JOIN doors d ON di.door_id = d.id
            JOIN users u ON di.inspector_id = u.id
            ORDER BY di.inspection_date DESC
            LIMIT 5
        `);

        res.json({
            statistics: stats,
            recentDoors,
            recentInspections
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get system logs (basic implementation)
router.get('/logs', verifyToken, requireAdmin, async (req, res) => {
    try {
        // In a real system, you'd have proper logging
        // For now, return recent database activity
        const logs = await db.all(`
            SELECT 'Door Created' as action, d.serial_number as details, d.created_at as timestamp
            FROM doors d
            UNION ALL
            SELECT 'Inspection Started' as action, d.serial_number as details, di.inspection_date as timestamp
            FROM door_inspections di
            JOIN doors d ON di.door_id = d.id
            WHERE di.status = 'in_progress'
            UNION ALL
            SELECT 'Door Certified' as action, d.serial_number as details, c.certified_at as timestamp
            FROM certifications c
            JOIN doors d ON c.door_id = d.id
            ORDER BY timestamp DESC
            LIMIT 50
        `);

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Bulk operations
router.post('/bulk-import-doors', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { doors } = req.body;
        const results = [];

        for (const doorData of doors) {
            const { po_number, door_number, job_number, size, pressure } = doorData;

            // Get or create PO
            let po = await db.get('SELECT id FROM purchase_orders WHERE po_number = ?', [po_number]);
            if (!po) {
                const poResult = await db.run('INSERT INTO purchase_orders (po_number) VALUES (?)', [po_number]);
                po = { id: poResult.id };
            }

            // Generate serial and drawing numbers
            const nextNum = await db.getNextSerialNumber();
            const doorType = pressure == 400 ? 'V1' : 'V2';
            const serialNumber = db.generateSerialNumber(nextNum, doorType);
            const drawingNumber = db.generateDrawingNumber(nextNum);
            const description = `${size} Meter ${pressure} kPa Door Refuge Bay Door`;

            // Insert door
            const result = await db.run(`
                INSERT INTO doors (po_id, door_number, serial_number, drawing_number, job_number, 
                                 description, pressure, door_type, size)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [po.id, door_number, serialNumber, drawingNumber, job_number, description, pressure, doorType, size]);

            results.push({ id: result.id, serial_number: serialNumber });
        }

        res.json({ message: `${results.length} doors imported successfully`, doors: results });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;