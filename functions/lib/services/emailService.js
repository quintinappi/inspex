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
exports.sendTestEmail = exports.notifyRejection = exports.notifyCertificationReady = exports.notifyInspectionCompleted = void 0;
const nodemailer = __importStar(require("nodemailer"));
// Load environment variables
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || 'mail.spectiv.co.za';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '465');
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';
// Create email transporter
const createTransporter = () => {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.warn('Email not configured. EMAIL_USER or EMAIL_PASS missing.');
        return null;
    }
    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_SECURE,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false // Allow self-signed certificates
        }
    });
};
/**
 * Send email notification when inspection is completed
 */
async function notifyInspectionCompleted(data) {
    const transporter = createTransporter();
    if (!transporter) {
        console.log('Email service not configured, skipping notification');
        return { success: false, message: 'Email not configured' };
    }
    try {
        const mailOptions = {
            from: `"INSPEX System" <${EMAIL_USER}>`,
            to: data.recipientEmails.join(', '),
            subject: `Inspection Completed - Door ${data.doorDetails.serial_number}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Inspection Completed</h2>
          <p>A refuge bay door inspection has been completed by ${data.inspectorName} and is ready for engineer review.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Door Details:</h3>
            <p><strong>Serial Number:</strong> ${data.doorDetails.serial_number || 'N/A'}</p>
            <p><strong>Drawing Number:</strong> ${data.doorDetails.drawing_number || 'N/A'}</p>
            <p><strong>Description:</strong> ${data.doorDetails.description || 'N/A'}</p>
            <p><strong>PO Number:</strong> ${data.doorDetails.po_number || 'N/A'}</p>
            <p><strong>Inspector:</strong> ${data.inspectorName}</p>
          </div>

          <p>Please log in to the INSPEX system to review this inspection.</p>

          <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
            This is an automated notification from the INSPEX Refuge Bay Door Inspection System.
          </p>
        </div>
      `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Inspection completed email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error('Error sending inspection completed email:', error);
        return { success: false, error: error.message };
    }
}
exports.notifyInspectionCompleted = notifyInspectionCompleted;
/**
 * Send email notification when engineer approves/certifies door
 */
async function notifyCertificationReady(data) {
    const transporter = createTransporter();
    if (!transporter) {
        console.log('Email service not configured, skipping notification');
        return { success: false, message: 'Email not configured' };
    }
    try {
        const mailOptions = {
            from: `"INSPEX System" <${EMAIL_USER}>`,
            to: data.recipientEmails.join(', '),
            subject: `Certificate Ready - Door ${data.doorDetails.serial_number}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Certificate Ready for Download</h2>
          <p>The certification for the following door has been completed by ${data.engineerName}.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Door Details:</h3>
            <p><strong>Serial Number:</strong> ${data.doorDetails.serial_number || 'N/A'}</p>
            <p><strong>Drawing Number:</strong> ${data.doorDetails.drawing_number || 'N/A'}</p>
            <p><strong>Description:</strong> ${data.doorDetails.description || 'N/A'}</p>
            <p><strong>PO Number:</strong> ${data.doorDetails.po_number || 'N/A'}</p>
            <p><strong>Certified By:</strong> ${data.engineerName}</p>
          </div>

          <p>The certificate PDF is attached to this email. You can also download it from the INSPEX system.</p>

          <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
            This is an automated notification from the INSPEX Refuge Bay Door Inspection System.
          </p>
        </div>
      `
        };
        // Attach PDF if provided
        if (data.pdfBuffer && data.pdfFilename) {
            mailOptions.attachments = [
                {
                    filename: data.pdfFilename,
                    content: data.pdfBuffer,
                    contentType: 'application/pdf'
                }
            ];
        }
        const info = await transporter.sendMail(mailOptions);
        console.log('Certification ready email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error('Error sending certification ready email:', error);
        return { success: false, error: error.message };
    }
}
exports.notifyCertificationReady = notifyCertificationReady;
/**
 * Send email notification when inspection/certification is rejected
 */
async function notifyRejection(data) {
    const transporter = createTransporter();
    if (!transporter) {
        console.log('Email service not configured, skipping notification');
        return { success: false, message: 'Email not configured' };
    }
    try {
        const mailOptions = {
            from: `"INSPEX System" <${EMAIL_USER}>`,
            to: data.recipientEmails.join(', '),
            subject: `Inspection Rejected - Door ${data.doorDetails.serial_number}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Inspection Rejected</h2>
          <p>${data.rejectorName} has rejected the inspection for the following door.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Door Details:</h3>
            <p><strong>Serial Number:</strong> ${data.doorDetails.serial_number || 'N/A'}</p>
            <p><strong>Drawing Number:</strong> ${data.doorDetails.drawing_number || 'N/A'}</p>
            <p><strong>Description:</strong> ${data.doorDetails.description || 'N/A'}</p>
          </div>

          <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #dc2626;">Rejection Reason:</h3>
            <p>${data.rejectionReason}</p>
          </div>

          <p>Please log in to the INSPEX system to review and address the issues.</p>

          <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
            This is an automated notification from the INSPEX Refuge Bay Door Inspection System.
          </p>
        </div>
      `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Rejection email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        console.error('Error sending rejection email:', error);
        return { success: false, error: error.message };
    }
}
exports.notifyRejection = notifyRejection;
/**
 * Send test email to verify email configuration
 */
async function sendTestEmail(recipientEmail) {
    const transporter = createTransporter();
    if (!transporter) {
        return { success: false, message: 'Email not configured' };
    }
    try {
        const mailOptions = {
            from: `"INSPEX System" <${EMAIL_USER}>`,
            to: recipientEmail,
            subject: 'INSPEX Email Configuration Test',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Configuration Successful!</h2>
          <p>This is a test email to verify that your INSPEX email notification system is working correctly.</p>
          <p>If you received this email, your email configuration is set up properly.</p>
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email Server:</strong> ${EMAIL_HOST}:${EMAIL_PORT}</p>
            <p style="margin: 5px 0 0 0;"><strong>Sent From:</strong> ${EMAIL_USER}</p>
          </div>
        </div>
      `
        };
        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
}
exports.sendTestEmail = sendTestEmail;
//# sourceMappingURL=emailService.js.map