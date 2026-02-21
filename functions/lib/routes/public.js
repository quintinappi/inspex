"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../database/firestore");
const router = (0, express_1.Router)();
const db = firestore_1.FirestoreDB.getInstance();
// Public endpoints (no auth)
// NOTE: Keep responses minimal to avoid exposing sensitive config.
router.get('/company-settings', async (req, res) => {
    try {
        const spectiv_logo = await db.getCompanyLogoUrl();
        res.json({ spectiv_logo: spectiv_logo || null });
    }
    catch (error) {
        console.error('Get public company settings error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=public.js.map