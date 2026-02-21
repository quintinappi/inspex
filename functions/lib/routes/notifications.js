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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../database/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = firestore_1.FirestoreDB.getInstance();
router.post('/login', auth_1.verifyToken, async (req, res) => {
    var _a, _b, _c;
    try {
        const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId;
        const email = (_c = req.user) === null || _c === void 0 ? void 0 : _c.email;
        if (!role || !userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (role !== 'engineer' && role !== 'client') {
            return res.json({ message: 'No notification required for this role' });
        }
        const userDoc = await db.db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const admins = await db.db.collection('users').where('role', '==', 'admin').get();
        const adminEmails = admins.docs.map(doc => doc.data().email).filter(Boolean);
        if (adminEmails.length === 0) {
            return res.json({ message: 'No admin recipients configured' });
        }
        try {
            const { notifyAdminUserLogin } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
            await notifyAdminUserLogin({
                recipientEmails: adminEmails,
                user: {
                    id: userId,
                    email: email || (userData === null || userData === void 0 ? void 0 : userData.email),
                    name: (userData === null || userData === void 0 ? void 0 : userData.name) || '',
                    role
                }
            });
        }
        catch (emailError) {
            console.error('Error sending login notification email:', emailError);
            // Do not fail the request if email fails
        }
        res.json({ message: 'Login notification processed' });
    }
    catch (error) {
        console.error('Login notification error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map