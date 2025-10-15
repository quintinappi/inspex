"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../database/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = firestore_1.FirestoreDB.getInstance();
// Get dashboard statistics
router.get('/dashboard', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const statistics = await db.getDashboardStats();
        // Get recent doors
        const doors = await db.getAllDoors();
        const recentDoors = doors.slice(0, 10);
        // Get recent inspections
        const inspections = await db.getInspectionsByStatus('completed');
        const recentInspections = inspections.slice(0, 10);
        // Get recent activity feed
        const recentActivity = await getRecentActivity(db);
        res.json({
            statistics,
            recentDoors,
            recentInspections,
            recentActivity
        });
    }
    catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Helper function to get recent activity
async function getRecentActivity(db) {
    const activities = [];
    try {
        // Get recent completed inspections (last 20)
        const inspectionsSnapshot = await db.db.collection('door_inspections')
            .where('status', '==', 'completed')
            .orderBy('updated_at', 'desc')
            .limit(20)
            .get();
        for (const doc of inspectionsSnapshot.docs) {
            const inspection = doc.data();
            const doorDoc = await db.db.collection('doors').doc(inspection.door_id).get();
            const door = doorDoc.data();
            const userDoc = await db.db.collection('users').doc(inspection.inspector_id).get();
            const user = userDoc.data();
            activities.push({
                type: 'inspection_completed',
                description: `Inspection completed for door ${(door === null || door === void 0 ? void 0 : door.serial_number) || inspection.door_id}`,
                timestamp: inspection.updated_at,
                user: (user === null || user === void 0 ? void 0 : user.name) || 'Unknown',
                icon: 'inspection',
                color: 'blue'
            });
        }
        // Get recent doors (last 15)
        const doorsSnapshot = await db.db.collection('doors')
            .orderBy('created_at', 'desc')
            .limit(15)
            .get();
        doorsSnapshot.docs.forEach((doc) => {
            const door = doc.data();
            activities.push({
                type: 'door_created',
                description: `New door added: ${door.serial_number}`,
                timestamp: door.created_at,
                user: 'System',
                icon: 'door',
                color: 'green'
            });
        });
        // Sort all activities by timestamp
        activities.sort((a, b) => {
            var _a, _b, _c, _d;
            const dateA = ((_b = (_a = a.timestamp) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(a.timestamp);
            const dateB = ((_d = (_c = b.timestamp) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date(b.timestamp);
            return dateB.getTime() - dateA.getTime();
        });
        // Return top 50
        return activities.slice(0, 50).map(activity => {
            var _a, _b;
            return (Object.assign(Object.assign({}, activity), { timestamp: ((_b = (_a = activity.timestamp) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || activity.timestamp }));
        });
    }
    catch (error) {
        console.error('Error fetching activity:', error);
        return [];
    }
}
// Get all users
router.get('/users', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const usersSnapshot = await db.db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => {
            const userData = doc.data();
            // Don't return password
            delete userData.password;
            return Object.assign({ id: doc.id }, userData);
        });
        res.json(users);
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Create user
router.post('/users', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (!['admin', 'inspector', 'engineer', 'client'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        // Check if user already exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create user
        const userId = await db.createUser({
            name,
            email,
            password: hashedPassword,
            role: role
        });
        res.status(201).json({
            message: 'User created successfully',
            userId
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Update user
router.put('/users/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Don't allow password updates through this endpoint
        delete updates.password;
        delete updates.id;
        await db.db.collection('users').doc(id).update(updates);
        res.json({ message: 'User updated successfully' });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Delete user
router.delete('/users/:id', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        // Don't allow deleting self
        if (id === ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId)) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        await db.db.collection('users').doc(id).delete();
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get serial number configuration
router.get('/serial-config', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const configDoc = await db.db.collection('system_config').doc('serial_numbers').get();
        if (!configDoc.exists) {
            // Return default configuration
            res.json({
                startingSerial: 200,
                serialPrefix: 'MUF-S199-RBD'
            });
        }
        else {
            res.json(configDoc.data());
        }
    }
    catch (error) {
        console.error('Get serial config error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Update serial number configuration
router.post('/serial-config', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    var _a;
    try {
        const { startingSerial, serialPrefix } = req.body;
        if (!startingSerial || !serialPrefix) {
            return res.status(400).json({ message: 'Starting serial and prefix are required' });
        }
        const configData = {
            startingSerial: parseInt(startingSerial),
            serialPrefix,
            updatedAt: new Date().toISOString(),
            updatedBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId
        };
        await db.db.collection('system_config').doc('serial_numbers').set(configData);
        res.json({
            message: 'Serial number configuration updated successfully',
            config: configData
        });
    }
    catch (error) {
        console.error('Update serial config error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get company settings
router.get('/company-settings', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const configDoc = await db.db.collection('config').doc('company_settings').get();
        if (!configDoc.exists) {
            // Return default settings
            res.json({
                logo_url: null,
                logo_storage_path: null,
                updated_at: null
            });
        }
        else {
            res.json(configDoc.data());
        }
    }
    catch (error) {
        console.error('Get company settings error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Update company settings (save logo URL)
router.put('/company-settings', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    var _a;
    try {
        const { logo_url, logo_storage_path } = req.body;
        const configData = {
            logo_url: logo_url || null,
            logo_storage_path: logo_storage_path || null,
            updated_at: new Date().toISOString(),
            updated_by: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId
        };
        await db.db.collection('config').doc('company_settings').set(configData, { merge: true });
        res.json({
            message: 'Company settings updated successfully',
            settings: configData
        });
    }
    catch (error) {
        console.error('Update company settings error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// System health check
router.get('/health', auth_1.verifyToken, (0, auth_1.requireRole)(['admin']), async (req, res) => {
    try {
        const statistics = await db.getDashboardStats();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            statistics
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map