"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../database/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = firestore_1.FirestoreDB.getInstance();
// Get all doors
router.get('/', auth_1.verifyToken, async (req, res) => {
    try {
        const doors = await db.getAllDoors();
        // Enhance with PO data and inspection status
        const enhancedDoors = await Promise.all(doors.map(async (door) => {
            var _a;
            // Get PO data
            let po_number = null;
            if (door.po_id) {
                const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
                if (poDoc.exists) {
                    po_number = (_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.po_number;
                }
            }
            // Check for active inspection
            const activeInspections = await db.db.collection('door_inspections')
                .where('door_id', '==', door.id)
                .where('status', '==', 'in_progress')
                .get();
            const current_inspection_status = !activeInspections.empty ? 'in_progress' :
                door.inspection_status === 'completed' ? 'completed' : 'pending';
            // Regenerate serial number to ensure new format (MF42-{size}-{door_number})
            // This fixes doors created with the old format
            const correctSerialNumber = await db.generateSerialNumber(door.door_number, door.size);
            return Object.assign(Object.assign({}, door), { serial_number: correctSerialNumber, po_number,
                current_inspection_status });
        }));
        res.json(enhancedDoors);
    }
    catch (error) {
        console.error('Get doors error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get single door
router.get('/:id', auth_1.verifyToken, async (req, res) => {
    var _a;
    try {
        const door = await db.getDoorById(req.params.id);
        if (!door) {
            return res.status(404).json({ message: 'Door not found' });
        }
        // Get PO data
        let po_number = null;
        if (door.po_id) {
            const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
            if (poDoc.exists) {
                po_number = (_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.po_number;
            }
        }
        // Regenerate serial number to ensure new format (MF42-{size}-{door_number})
        // This fixes doors created with the old format
        const correctSerialNumber = await db.generateSerialNumber(door.door_number, door.size);
        res.json(Object.assign(Object.assign({}, door), { po_number, serial_number: correctSerialNumber }));
    }
    catch (error) {
        console.error('Get door error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Create new door
router.post('/', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'inspector']), async (req, res) => {
    try {
        const { po_number, door_number, job_number, pressure, size, version } = req.body;
        if (!po_number || !door_number || !job_number || !pressure || !size) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (!['1.5', '1.8', '2.0'].includes(size)) {
            return res.status(400).json({ message: 'Invalid size. Must be 1.5, 1.8, or 2.0' });
        }
        // Create or find purchase order
        let po = await db.getPurchaseOrderByNumber(po_number);
        if (!po) {
            const poId = await db.createPurchaseOrder(po_number);
            po = { id: poId, po_number, created_at: new Date() };
        }
        // Generate serial and drawing numbers
        const serialNumber = await db.generateSerialNumber(parseInt(door_number), size);
        const nextNum = await db.getNextSerialNumber();
        const drawingNumber = db.generateDrawingNumber(nextNum);
        // Create description
        const description = `${size} Meter ${pressure} kPa Door Refuge Bay Door`;
        // Create door
        const doorId = await db.createDoor({
            po_id: po.id,
            door_number: parseInt(door_number),
            serial_number: serialNumber,
            drawing_number: drawingNumber,
            job_number,
            description,
            pressure: parseInt(pressure),
            door_type: version || 'V1',
            size,
            inspection_status: 'pending',
            certification_status: 'pending',
            completion_status: 'pending',
            paid_status: 'pending'
        });
        // Get the created door with PO data
        const newDoor = await db.getDoorById(doorId);
        res.status(201).json(Object.assign(Object.assign({}, newDoor), { po_number: po.po_number }));
    }
    catch (error) {
        console.error('Create door error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Update door
router.put('/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'inspector']), async (req, res) => {
    try {
        const updates = req.body;
        await db.updateDoor(req.params.id, updates);
        const updatedDoor = await db.getDoorById(req.params.id);
        res.json(updatedDoor);
    }
    catch (error) {
        console.error('Update door error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Partial update for certification status (accessible by engineers)
router.patch('/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'engineer', 'inspector']), async (req, res) => {
    var _a;
    try {
        const updates = req.body;
        // Engineers can only update certification_status
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'engineer' && Object.keys(updates).some(key => key !== 'certification_status')) {
            return res.status(403).json({ message: 'Engineers can only update certification_status' });
        }
        await db.updateDoor(req.params.id, updates);
        const updatedDoor = await db.getDoorById(req.params.id);
        res.json(updatedDoor);
    }
    catch (error) {
        console.error('Patch door error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get doors ready for inspection
router.get('/ready/inspection', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'inspector']), async (req, res) => {
    try {
        const doors = await db.getDoorsWithPendingInspections();
        res.json(doors);
    }
    catch (error) {
        console.error('Get doors ready for inspection error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Delete door
router.delete('/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const doorId = req.params.id;
        // Check if door exists
        const door = await db.getDoorById(doorId);
        if (!door) {
            return res.status(404).json({ error: 'Door not found' });
        }
        // Check if door has any inspections
        const inspections = await db.db.collection('door_inspections')
            .where('door_id', '==', doorId)
            .get();
        if (!inspections.empty) {
            return res.status(400).json({
                error: 'Cannot delete door with existing inspections. Please delete inspections first.'
            });
        }
        // Delete the door
        await db.db.collection('doors').doc(doorId).delete();
        res.json({ message: 'Door deleted successfully' });
    }
    catch (error) {
        console.error('Delete door error:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=doors.js.map