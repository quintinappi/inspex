"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../database/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = firestore_1.FirestoreDB.getInstance();
// Get all door types
router.get('/', auth_1.verifyToken, (0, auth_1.requireRole)(['admin', 'engineer']), async (req, res) => {
    try {
        const snapshot = await db.db.collection('door_types').orderBy('created_at', 'desc').get();
        const doorTypes = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.json(doorTypes);
    }
    catch (error) {
        console.error('Get door types error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Create door type
router.post('/', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    var _a;
    try {
        const { name, description, pressure_high, pressure_low, images = {} } = req.body;
        if (!name || !pressure_high) {
            return res.status(400).json({ message: 'Name and high pressure rating are required' });
        }
        const doorTypeData = {
            name,
            description: description || '',
            pressure_high: Number(pressure_high),
            pressure_low: Number(pressure_low) || 0,
            images: {
                iso_view: images.iso_view || null,
                high_pressure_side: images.high_pressure_side || null,
                low_pressure_side: images.low_pressure_side || null
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId
        };
        const docRef = await db.db.collection('door_types').add(doorTypeData);
        res.status(201).json({
            message: 'Door type created successfully',
            doorType: Object.assign({ id: docRef.id }, doorTypeData)
        });
    }
    catch (error) {
        console.error('Create door type error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Update door type
router.put('/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    var _a;
    try {
        const id = req.params.id;
        const updates = req.body;
        // Validate the door type exists
        const doc = await db.db.collection('door_types').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Door type not found' });
        }
        const updateData = {
            updated_at: new Date().toISOString()
        };
        // Only update allowed fields
        if (updates.name !== undefined)
            updateData.name = updates.name;
        if (updates.description !== undefined)
            updateData.description = updates.description;
        if (updates.pressure_high !== undefined)
            updateData.pressure_high = Number(updates.pressure_high);
        if (updates.pressure_low !== undefined)
            updateData.pressure_low = Number(updates.pressure_low);
        if (updates.images) {
            const currentImages = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.images) || {};
            updateData.images = {
                iso_view: updates.images.iso_view !== undefined ? updates.images.iso_view : currentImages.iso_view,
                high_pressure_side: updates.images.high_pressure_side !== undefined ? updates.images.high_pressure_side : currentImages.high_pressure_side,
                low_pressure_side: updates.images.low_pressure_side !== undefined ? updates.images.low_pressure_side : currentImages.low_pressure_side
            };
        }
        await db.db.collection('door_types').doc(id).update(updateData);
        res.json({
            message: 'Door type updated successfully',
            doorType: Object.assign(Object.assign({ id }, doc.data()), updateData)
        });
    }
    catch (error) {
        console.error('Update door type error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Delete door type
router.delete('/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    var _a, _b;
    try {
        const id = req.params.id;
        // Check if door type is in use by any doors
        const doorsUsingType = await db.db.collection('doors')
            .where('door_type_id', '==', id)
            .limit(1)
            .get();
        if (!doorsUsingType.empty) {
            return res.status(400).json({
                message: 'Cannot delete door type that is being used by doors'
            });
        }
        // Get door type to find image storage paths
        const doc = await db.db.collection('door_types').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Door type not found' });
        }
        const doorTypeData = doc.data();
        const images = (doorTypeData === null || doorTypeData === void 0 ? void 0 : doorTypeData.images) || {};
        // Delete images from Firebase Storage
        const { getStorage } = require('firebase-admin/storage');
        const bucket = getStorage().bucket();
        const imagePaths = [
            images.iso_view,
            images.high_pressure_side,
            images.low_pressure_side
        ];
        for (const path of imagePaths) {
            if (path) {
                try {
                    // Extract storage path from URL if needed
                    const storagePath = path.includes('firebasestorage.googleapis.com')
                        ? (_b = (_a = path.split('/o/')[1]) === null || _a === void 0 ? void 0 : _a.split('?')[0]) === null || _b === void 0 ? void 0 : _b.replace(/%2F/g, '/')
                        : path;
                    if (storagePath) {
                        await bucket.file(storagePath).delete();
                    }
                }
                catch (storageError) {
                    console.error('Error deleting image from storage:', storageError);
                    // Continue with deletion even if storage delete fails
                }
            }
        }
        // Delete from Firestore
        await db.db.collection('door_types').doc(id).delete();
        res.json({ message: 'Door type deleted successfully' });
    }
    catch (error) {
        console.error('Delete door type error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=doorTypes.js.map