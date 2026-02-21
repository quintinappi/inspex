"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../database/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = firestore_1.FirestoreDB.getInstance();
// Get doors by inspection status
router.get('/status/:status', auth_1.verifyToken, async (req, res) => {
    try {
        const status = String(req.params.status || '').toLowerCase();
        const allowed = new Set(['pending', 'in_progress', 'completed']);
        if (!allowed.has(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be pending, in_progress, or completed.' });
        }
        const snapshot = await db.db.collection('doors')
            .where('inspection_status', '==', status)
            .get();
        const doors = await Promise.all(snapshot.docs.map(async (doc) => {
            var _a;
            const door = Object.assign({ id: doc.id }, doc.data());
            // Get PO data
            let po_number = null;
            if (door.po_id) {
                const poDoc = await db.db.collection('purchase_orders').doc(door.po_id).get();
                if (poDoc.exists) {
                    po_number = (_a = poDoc.data()) === null || _a === void 0 ? void 0 : _a.po_number;
                }
            }
            // Get door type reference drawing (for tag plate DWG number)
            let door_type_data = null;
            if (door.door_type_id) {
                const dtDoc = await db.db.collection('door_types').doc(door.door_type_id).get();
                if (dtDoc.exists) {
                    const dt = dtDoc.data() || {};
                    door_type_data = {
                        id: dtDoc.id,
                        name: dt === null || dt === void 0 ? void 0 : dt.name,
                        reference_drawing: dt === null || dt === void 0 ? void 0 : dt.reference_drawing
                    };
                }
            }
            return Object.assign(Object.assign({}, door), { po_number,
                door_type_data });
        }));
        const toMillis = (value) => {
            if (!value)
                return 0;
            if (typeof (value === null || value === void 0 ? void 0 : value.toMillis) === 'function')
                return value.toMillis();
            const asDate = new Date(value);
            const ms = asDate.getTime();
            return Number.isFinite(ms) ? ms : 0;
        };
        doors.sort((a, b) => toMillis(a === null || a === void 0 ? void 0 : a.created_at) - toMillis(b === null || b === void 0 ? void 0 : b.created_at));
        res.json(doors);
    }
    catch (error) {
        console.error('Get doors by status error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
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
            return Object.assign(Object.assign({}, door), { 
                // Keep stored serial_number; only fall back for legacy/missing values
                serial_number: door.serial_number || await db.generateSerialNumber(door.door_number, door.size), po_number,
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
        // Get door type data with images
        let door_type_data = null;
        if (door.door_type_id) {
            const doorTypeDoc = await db.db.collection('door_types').doc(door.door_type_id).get();
            if (doorTypeDoc.exists) {
                const dt = doorTypeDoc.data();
                door_type_data = {
                    id: doorTypeDoc.id,
                    name: dt === null || dt === void 0 ? void 0 : dt.name,
                    description: dt === null || dt === void 0 ? void 0 : dt.description,
                    reference_drawing: dt === null || dt === void 0 ? void 0 : dt.reference_drawing,
                    pressure_high: dt === null || dt === void 0 ? void 0 : dt.pressure_high,
                    pressure_low: dt === null || dt === void 0 ? void 0 : dt.pressure_low,
                    images: (dt === null || dt === void 0 ? void 0 : dt.images) || {}
                };
            }
        }
        res.json(Object.assign(Object.assign({}, door), { po_number, 
            // Keep stored serial_number; only fall back for legacy/missing values
            serial_number: door.serial_number || await db.generateSerialNumber(door.door_number, door.size), door_type_data }));
    }
    catch (error) {
        console.error('Get door error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Create new door
router.post('/', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'inspector']), async (req, res) => {
    try {
        const { po_id, door_type_id, door_number, job_number, pressure, size, version, description: customDescription } = req.body;
        // Validate required fields
        if (!po_id || !door_type_id || !door_number || !pressure || !size) {
            return res.status(400).json({
                message: 'Required fields: po_id, door_type_id, door_number, pressure, size'
            });
        }
        if (!['1.5', '1.8', '2.0'].includes(size)) {
            return res.status(400).json({ message: 'Invalid size. Must be 1.5, 1.8, or 2.0' });
        }
        // Verify purchase order exists
        const poDoc = await db.db.collection('purchase_orders').doc(po_id).get();
        if (!poDoc.exists) {
            return res.status(400).json({ message: 'Purchase order not found' });
        }
        const poData = poDoc.data();
        // Verify door type exists
        const doorTypeDoc = await db.db.collection('door_types').doc(door_type_id).get();
        if (!doorTypeDoc.exists) {
            return res.status(400).json({ message: 'Door type not found' });
        }
        const doorType = doorTypeDoc.data();
        const sanitizeDoorTypeNameForDescription = (name, sizeVal, pressureVal) => {
            let cleaned = String(name || '').trim();
            if (!cleaned)
                return '';
            const patterns = [];
            if (String(sizeVal) === '1.5')
                patterns.push(/\b1\.5\s*m\b/gi, /\b1500\b/gi, /\b1\.5m\b/gi);
            if (String(sizeVal) === '1.8')
                patterns.push(/\b1\.8\s*m\b/gi, /\b1800\b/gi, /\b1\.8m\b/gi);
            if (String(sizeVal) === '2.0')
                patterns.push(/\b2\.0\s*m\b/gi, /\b2000\b/gi, /\b2\.0m\b/gi, /\b2m\b/gi);
            for (const re of patterns)
                cleaned = cleaned.replace(re, '');
            if (Number.isFinite(pressureVal) && pressureVal > 0) {
                cleaned = cleaned.replace(new RegExp(`\\b${pressureVal}\\s*kpa\\b`, 'gi'), '');
                cleaned = cleaned.replace(new RegExp(`\\b${pressureVal}\\s*k\\s*pa\\b`, 'gi'), '');
            }
            cleaned = cleaned.replace(/\bkpa\b/gi, '');
            cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
            return cleaned;
        };
        // Generate serial and drawing numbers
        const [serialNumber] = await db.reserveDoorSerialNumbers(size, 1);
        const nextNum = await db.getNextSerialNumber();
        const drawingNumber = (typeof (doorType === null || doorType === void 0 ? void 0 : doorType.reference_drawing) === 'string' && doorType.reference_drawing.trim())
            ? doorType.reference_drawing.trim()
            : db.generateDrawingNumber(nextNum);
        // Create description
        const suffix = sanitizeDoorTypeNameForDescription(String((doorType === null || doorType === void 0 ? void 0 : doorType.name) || ''), String(size), Number(pressure));
        const description = customDescription || `${size} Meter ${pressure} kPa ${suffix || version || (doorType === null || doorType === void 0 ? void 0 : doorType.name) || 'Door'}`;
        // Create door
        const doorId = await db.createDoor({
            po_id: poDoc.id,
            door_type_id: door_type_id,
            door_number: parseInt(door_number),
            serial_number: serialNumber,
            drawing_number: drawingNumber,
            job_number: job_number || '',
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
        res.status(201).json(Object.assign(Object.assign({}, newDoor), { po_number: poData === null || poData === void 0 ? void 0 : poData.po_number }));
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
        if (typeof (updates === null || updates === void 0 ? void 0 : updates.serial_number) === 'string' && updates.serial_number.trim()) {
            const newSerial = updates.serial_number.trim();
            const existing = await db.db.collection('doors')
                .where('serial_number', '==', newSerial)
                .limit(1)
                .get();
            if (!existing.empty && existing.docs[0].id !== req.params.id) {
                return res.status(400).json({ message: 'Serial number already exists. Please choose a unique serial number.' });
            }
            updates.serial_number = newSerial;
        }
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