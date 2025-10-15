"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const emailService_1 = require("../services/emailService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * Send test email
 * POST /email/test
 */
router.post('/test', auth_1.verifyToken, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email address is required' });
        }
        const result = await (0, emailService_1.sendTestEmail)(email);
        if (result.success) {
            return res.json({
                message: 'Test email sent successfully',
                messageId: result.messageId
            });
        }
        else {
            return res.status(500).json({
                message: 'Failed to send test email',
                error: result.error || result.message
            });
        }
    }
    catch (error) {
        console.error('Test email error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});
/**
 * Notify inspection completed
 * POST /email/inspection-completed
 */
router.post('/inspection-completed', auth_1.verifyToken, async (req, res) => {
    try {
        const { doorDetails, inspectorName, recipientEmails } = req.body;
        if (!doorDetails || !inspectorName || !recipientEmails || !recipientEmails.length) {
            return res.status(400).json({
                message: 'Missing required fields: doorDetails, inspectorName, recipientEmails'
            });
        }
        const result = await (0, emailService_1.notifyInspectionCompleted)({
            doorDetails,
            inspectorName,
            recipientEmails
        });
        if (result.success) {
            return res.json({
                message: 'Inspection completed notification sent',
                messageId: result.messageId
            });
        }
        else {
            return res.status(500).json({
                message: 'Failed to send notification',
                error: result.error || result.message
            });
        }
    }
    catch (error) {
        console.error('Inspection notification error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});
/**
 * Notify certification ready
 * POST /email/certification-ready
 */
router.post('/certification-ready', auth_1.verifyToken, async (req, res) => {
    try {
        const { doorDetails, engineerName, recipientEmails } = req.body;
        if (!doorDetails || !engineerName || !recipientEmails || !recipientEmails.length) {
            return res.status(400).json({
                message: 'Missing required fields: doorDetails, engineerName, recipientEmails'
            });
        }
        const result = await (0, emailService_1.notifyCertificationReady)({
            doorDetails,
            engineerName,
            recipientEmails
        });
        if (result.success) {
            return res.json({
                message: 'Certification ready notification sent',
                messageId: result.messageId
            });
        }
        else {
            return res.status(500).json({
                message: 'Failed to send notification',
                error: result.error || result.message
            });
        }
    }
    catch (error) {
        console.error('Certification notification error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});
/**
 * Notify rejection
 * POST /email/rejection
 */
router.post('/rejection', auth_1.verifyToken, async (req, res) => {
    try {
        const { doorDetails, rejectorName, rejectionReason, recipientEmails } = req.body;
        if (!doorDetails || !rejectorName || !rejectionReason || !recipientEmails || !recipientEmails.length) {
            return res.status(400).json({
                message: 'Missing required fields: doorDetails, rejectorName, rejectionReason, recipientEmails'
            });
        }
        const result = await (0, emailService_1.notifyRejection)({
            doorDetails,
            rejectorName,
            rejectionReason,
            recipientEmails
        });
        if (result.success) {
            return res.json({
                message: 'Rejection notification sent',
                messageId: result.messageId
            });
        }
        else {
            return res.status(500).json({
                message: 'Failed to send notification',
                error: result.error || result.message
            });
        }
    }
    catch (error) {
        console.error('Rejection notification error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=email.js.map