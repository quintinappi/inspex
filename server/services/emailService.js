const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  // Only create transporter if email is configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email not configured. Email notifications will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send email notification when door inspection is completed and ready for certification
 */
async function notifyEngineerForCertification(doorDetails, engineerEmails) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('Email service not configured, skipping notification');
    return { success: false, message: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: `"INSPEX System" <${process.env.EMAIL_USER}>`,
      to: engineerEmails.join(', '),
      subject: `New Door Ready for Certification - ${doorDetails.serial_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Door Ready for Certification</h2>
          <p>A refuge bay door has completed inspection and is ready for your certification.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Door Details:</h3>
            <p><strong>Serial Number:</strong> ${doorDetails.serial_number}</p>
            <p><strong>Drawing Number:</strong> ${doorDetails.drawing_number}</p>
            <p><strong>PO Number:</strong> ${doorDetails.po_number || 'N/A'}</p>
            <p><strong>Size:</strong> ${doorDetails.size}M</p>
            <p><strong>Pressure:</strong> ${doorDetails.pressure} kPa</p>
            <p><strong>Job Number:</strong> ${doorDetails.job_number || 'N/A'}</p>
          </div>

          <p>Please log in to the INSPEX system to review and certify this door.</p>

          <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
            This is an automated notification from the INSPEX Refuge Bay Door Inspection System.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Certification notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending certification notification email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email notification when door is certified and ready for download
 */
async function notifyInspectorForCertificate(doorDetails, inspectorEmails) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('Email service not configured, skipping notification');
    return { success: false, message: 'Email not configured' };
  }

  try {
    const mailOptions = {
      from: `"INSPEX System" <${process.env.EMAIL_USER}>`,
      to: inspectorEmails.join(', '),
      subject: `Certificate Available - ${doorDetails.serial_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Certificate Ready for Download</h2>
          <p>The certification for the following door has been completed and is ready for download.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Door Details:</h3>
            <p><strong>Serial Number:</strong> ${doorDetails.serial_number}</p>
            <p><strong>Drawing Number:</strong> ${doorDetails.drawing_number}</p>
            <p><strong>PO Number:</strong> ${doorDetails.po_number || 'N/A'}</p>
            <p><strong>Size:</strong> ${doorDetails.size}M</p>
            <p><strong>Pressure:</strong> ${doorDetails.pressure} kPa</p>
            <p><strong>Certified By:</strong> ${doorDetails.engineer_name}</p>
          </div>

          <p>Please log in to the INSPEX system to download the certificate PDF.</p>

          <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
            This is an automated notification from the INSPEX Refuge Bay Door Inspection System.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Certificate notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending certificate notification email:', error);
    return { success: false, error: error.message };
  }
}

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
      from: `"INSPEX System" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'INSPEX Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Configuration Successful!</h2>
          <p>This is a test email to verify that your INSPEX email notification system is working correctly.</p>
          <p>If you received this email, your email configuration is set up properly.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  notifyEngineerForCertification,
  notifyInspectorForCertificate,
  sendTestEmail
};
