"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../database/firestore");
const auth_1 = require("../middleware/auth");
const firestore_2 = require("firebase-admin/firestore");
const router = (0, express_1.Router)();
const db = firestore_1.FirestoreDB.getInstance();
// Get all purchase orders
router.get('/', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'inspector']), async (req, res) => {
    try {
        const snapshot = await db.db.collection('purchase_orders').orderBy('created_at', 'desc').get();
        const purchaseOrders = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            // Count doors for this PO
            const doorsSnapshot = await db.db.collection('doors')
                .where('po_id', '==', doc.id)
                .get();
            return Object.assign(Object.assign({ id: doc.id }, data), { door_count: doorsSnapshot.size });
        }));
        res.json(purchaseOrders);
    }
    catch (error) {
        console.error('Get purchase orders error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get single purchase order
router.get('/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'inspector']), async (req, res) => {
    try {
        const doc = await db.db.collection('purchase_orders').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }
        // Get doors for this PO
        const doorsSnapshot = await db.db.collection('doors')
            .where('po_id', '==', doc.id)
            .get();
        const doors = doorsSnapshot.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        res.json(Object.assign(Object.assign({ id: doc.id }, doc.data()), { doors }));
    }
    catch (error) {
        console.error('Get purchase order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Create purchase order
router.post('/', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    var _a, _b;
    try {
        const { po_number, client_name, client_email, description, status = 'active', line_items = [] } = req.body;
        if (!po_number) {
            return res.status(400).json({ message: 'PO Number is required' });
        }
        // Check if PO number already exists
        const existingPO = await db.db.collection('purchase_orders')
            .where('po_number', '==', po_number)
            .limit(1)
            .get();
        if (!existingPO.empty) {
            return res.status(400).json({ message: 'Purchase order with this number already exists' });
        }
        const sanitizedLineItems = Array.isArray(line_items)
            ? line_items
                .map((item) => ({
                door_type_id: item === null || item === void 0 ? void 0 : item.door_type_id,
                quantity: Number((item === null || item === void 0 ? void 0 : item.quantity) || 0)
            }))
                .filter((item) => typeof item.door_type_id === 'string' && item.door_type_id && Number.isFinite(item.quantity) && item.quantity > 0)
            : [];
        if (sanitizedLineItems.length === 0) {
            return res.status(400).json({ message: 'At least one door type and quantity is required' });
        }
        // Load door type details
        const uniqueDoorTypeIds = Array.from(new Set(sanitizedLineItems.map((i) => i.door_type_id)));
        const doorTypeDocs = await Promise.all(uniqueDoorTypeIds.map((id) => db.db.collection('door_types').doc(id).get()));
        const doorTypeById = new Map();
        doorTypeDocs.forEach((docSnap) => {
            if (docSnap.exists)
                doorTypeById.set(docSnap.id, docSnap.data());
        });
        const missingDoorTypes = uniqueDoorTypeIds.filter((id) => !doorTypeById.has(id));
        if (missingDoorTypes.length > 0) {
            return res.status(400).json({ message: 'One or more selected door types were not found' });
        }
        const enrichedLineItems = sanitizedLineItems.map((item) => {
            const dt = doorTypeById.get(item.door_type_id);
            return {
                door_type_id: item.door_type_id,
                door_type_name: (dt === null || dt === void 0 ? void 0 : dt.name) || '',
                quantity: item.quantity
            };
        });
        const poData = {
            po_number,
            client_name: client_name || '',
            client_email: client_email || '',
            description: description || '',
            status,
            line_items: enrichedLineItems,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId
        };
        const docRef = await db.db.collection('purchase_orders').add(poData);
        // Auto-create doors for this PO based on line items
        const doorsCollection = db.db.collection('doors');
        const inferSizeFromDoorType = (doorType) => {
            const candidates = [doorType === null || doorType === void 0 ? void 0 : doorType.size, doorType === null || doorType === void 0 ? void 0 : doorType.name, doorType === null || doorType === void 0 ? void 0 : doorType.description]
                .filter(Boolean)
                .map((v) => String(v).toLowerCase());
            const text = candidates.join(' ');
            if (/(\b2\.0\b|\b2000\b|\b2m\b|\b2\.0m\b)/i.test(text))
                return '2.0';
            if (/(\b1\.8\b|\b1800\b|\b1\.8m\b|\b1\.8\s*m\b)/i.test(text))
                return '1.8';
            if (/(\b1\.5\b|\b1500\b|\b1\.5m\b|\b1\.5\s*m\b)/i.test(text))
                return '1.5';
            // fallback (legacy)
            return '1.5';
        };
        const sanitizeDoorTypeNameForDescription = (name, size, pressureHigh) => {
            let cleaned = String(name || '').trim();
            if (!cleaned)
                return '';
            const sizePatterns = [];
            if (size === '1.5')
                sizePatterns.push(/\b1\.5\s*m\b/gi, /\b1500\b/gi, /\b1\.5m\b/gi);
            if (size === '1.8')
                sizePatterns.push(/\b1\.8\s*m\b/gi, /\b1800\b/gi, /\b1\.8m\b/gi);
            if (size === '2.0')
                sizePatterns.push(/\b2\.0\s*m\b/gi, /\b2000\b/gi, /\b2\.0m\b/gi, /\b2m\b/gi);
            for (const re of sizePatterns)
                cleaned = cleaned.replace(re, '');
            if (Number.isFinite(pressureHigh) && pressureHigh > 0) {
                cleaned = cleaned.replace(new RegExp(`\\b${pressureHigh}\\s*kpa\\b`, 'gi'), '');
                cleaned = cleaned.replace(new RegExp(`\\b${pressureHigh}\\s*k\\s*pa\\b`, 'gi'), '');
            }
            cleaned = cleaned.replace(/\bkpa\b/gi, '');
            cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
            return cleaned;
        };
        // Determine next door_number (global) from existing doors
        const lastDoorSnapshot = await doorsCollection.orderBy('door_number', 'desc').limit(1).get();
        let nextDoorNumber = 1;
        if (!lastDoorSnapshot.empty) {
            const lastDoorNumber = Number(((_b = lastDoorSnapshot.docs[0].data()) === null || _b === void 0 ? void 0 : _b.door_number) || 0);
            nextDoorNumber = Number.isFinite(lastDoorNumber) ? lastDoorNumber + 1 : 1;
        }
        // Determine next drawing number base
        const nextDrawingBase = await db.getNextSerialNumber();
        let createdDoorCount = 0;
        let drawingOffset = 0;
        // Reserve door serial numbers up-front per size
        const sizeCounts = new Map();
        for (const item of sanitizedLineItems) {
            const doorType = doorTypeById.get(item.door_type_id);
            const size = inferSizeFromDoorType(doorType);
            sizeCounts.set(size, (sizeCounts.get(size) || 0) + Number(item.quantity || 0));
        }
        const reservedSerialsBySize = new Map();
        const reservedIndexBySize = new Map();
        for (const [size, qty] of sizeCounts.entries()) {
            if (qty > 0) {
                reservedSerialsBySize.set(size, await db.reserveDoorSerialNumbers(size, qty));
                reservedIndexBySize.set(size, 0);
            }
        }
        let batch = db.db.batch();
        let batchOps = 0;
        const commitBatchIfNeeded = async () => {
            if (batchOps === 0)
                return;
            await batch.commit();
            batch = db.db.batch();
            batchOps = 0;
        };
        for (const item of sanitizedLineItems) {
            const doorType = doorTypeById.get(item.door_type_id);
            const pressureHigh = Number((doorType === null || doorType === void 0 ? void 0 : doorType.pressure_high) || 0);
            const inferredVersion = typeof (doorType === null || doorType === void 0 ? void 0 : doorType.name) === 'string' && doorType.name.toUpperCase().includes('V2') ? 'V2' : 'V1';
            const inferredSize = inferSizeFromDoorType(doorType);
            const suffix = sanitizeDoorTypeNameForDescription(String((doorType === null || doorType === void 0 ? void 0 : doorType.name) || ''), inferredSize, pressureHigh);
            for (let i = 0; i < item.quantity; i++) {
                const currentDoorNumber = nextDoorNumber++;
                const list = reservedSerialsBySize.get(inferredSize) || [];
                const idx = reservedIndexBySize.get(inferredSize) || 0;
                const serialNumber = list[idx] || await db.generateSerialNumber(currentDoorNumber, inferredSize);
                reservedIndexBySize.set(inferredSize, idx + 1);
                const drawingNumber = (typeof (doorType === null || doorType === void 0 ? void 0 : doorType.reference_drawing) === 'string' && doorType.reference_drawing.trim())
                    ? doorType.reference_drawing.trim()
                    : db.generateDrawingNumber(nextDrawingBase + drawingOffset);
                drawingOffset++;
                const descriptionText = `${inferredSize} Meter ${pressureHigh} kPa ${suffix || inferredVersion}`;
                const doorRef = doorsCollection.doc();
                batch.set(doorRef, {
                    po_id: docRef.id,
                    door_type_id: item.door_type_id,
                    door_number: currentDoorNumber,
                    serial_number: serialNumber,
                    drawing_number: drawingNumber,
                    job_number: '',
                    description: descriptionText,
                    pressure: pressureHigh,
                    door_type: inferredVersion,
                    size: inferredSize,
                    inspection_status: 'pending',
                    certification_status: 'pending',
                    completion_status: 'pending',
                    paid_status: 'pending',
                    created_at: firestore_2.FieldValue.serverTimestamp()
                });
                createdDoorCount++;
                batchOps++;
                // Keep well under Firestore 500 writes/batch
                if (batchOps >= 450) {
                    await commitBatchIfNeeded();
                }
            }
        }
        await commitBatchIfNeeded();
        res.status(201).json({
            message: 'Purchase order created successfully',
            purchaseOrder: Object.assign(Object.assign({ id: docRef.id }, poData), { door_count: createdDoorCount })
        });
    }
    catch (error) {
        console.error('Create purchase order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Update purchase order
router.put('/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    var _a;
    try {
        const id = req.params.id;
        const { po_number, client_name, client_email, description, status } = req.body;
        const doc = await db.db.collection('purchase_orders').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }
        // Check for duplicate PO number if changing
        if (po_number && po_number !== ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.po_number)) {
            const existingPO = await db.db.collection('purchase_orders')
                .where('po_number', '==', po_number)
                .limit(1)
                .get();
            if (!existingPO.empty && existingPO.docs[0].id !== id) {
                return res.status(400).json({ message: 'Purchase order with this number already exists' });
            }
        }
        const updateData = {
            updated_at: new Date().toISOString()
        };
        if (po_number !== undefined)
            updateData.po_number = po_number;
        if (client_name !== undefined)
            updateData.client_name = client_name;
        if (client_email !== undefined)
            updateData.client_email = client_email;
        if (description !== undefined)
            updateData.description = description;
        if (status !== undefined)
            updateData.status = status;
        await db.db.collection('purchase_orders').doc(id).update(updateData);
        res.json({
            message: 'Purchase order updated successfully',
            purchaseOrder: Object.assign(Object.assign({ id }, doc.data()), updateData)
        });
    }
    catch (error) {
        console.error('Update purchase order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Delete purchase order
router.delete('/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const id = req.params.id;
        const poRef = db.db.collection('purchase_orders').doc(id);
        const poDoc = await poRef.get();
        if (!poDoc.exists) {
            return res.status(404).json({ message: 'Purchase order not found' });
        }
        // Get doors for this PO
        const doorsSnapshot = await db.db.collection('doors')
            .where('po_id', '==', id)
            .get();
        // If no doors, allow deletion
        if (doorsSnapshot.empty) {
            await poRef.delete();
            return res.json({ message: 'Purchase order deleted successfully' });
        }
        const doors = doorsSnapshot.docs.map((d) => (Object.assign({ id: d.id }, d.data())));
        // Only allow deletion when ALL doors are still pending inspection
        const nonPendingDoors = doors.filter((d) => ((d === null || d === void 0 ? void 0 : d.inspection_status) || 'pending') !== 'pending');
        if (nonPendingDoors.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete purchase order: one or more doors are not in pending inspection state'
            });
        }
        const doorIds = doors.map((d) => d.id).filter(Boolean);
        const chunk = (arr, size) => {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size)
                chunks.push(arr.slice(i, i + size));
            return chunks;
        };
        // Block deletion if any inspections already exist for these doors
        for (const ids of chunk(doorIds, 10)) {
            const inspectionsSnap = await db.db.collection('door_inspections')
                .where('door_id', 'in', ids)
                .limit(1)
                .get();
            if (!inspectionsSnap.empty) {
                return res.status(400).json({
                    message: 'Cannot delete purchase order: one or more doors already have inspections'
                });
            }
        }
        // Block deletion if any certifications already exist for these doors
        for (const ids of chunk(doorIds, 10)) {
            const certsSnap = await db.db.collection('certifications')
                .where('door_id', 'in', ids)
                .limit(1)
                .get();
            if (!certsSnap.empty) {
                return res.status(400).json({
                    message: 'Cannot delete purchase order: one or more doors already have certifications'
                });
            }
        }
        // Cascade delete doors (pending only) then the PO
        let batch = db.db.batch();
        let batchOps = 0;
        let deletedDoorCount = 0;
        const commitBatchIfNeeded = async () => {
            if (batchOps === 0)
                return;
            await batch.commit();
            batch = db.db.batch();
            batchOps = 0;
        };
        for (const doorDoc of doorsSnapshot.docs) {
            batch.delete(doorDoc.ref);
            deletedDoorCount++;
            batchOps++;
            if (batchOps >= 450) {
                await commitBatchIfNeeded();
            }
        }
        // Delete the PO in the same final batch (or a fresh one)
        batch.delete(poRef);
        batchOps++;
        await commitBatchIfNeeded();
        res.json({
            message: 'Purchase order deleted successfully',
            deleted_doors: deletedDoorCount
        });
    }
    catch (error) {
        console.error('Delete purchase order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=purchaseOrders.js.map