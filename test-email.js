// Test email sending directly
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function testEmail() {
  console.log('Testing email configuration...\n');
  console.log('Host:', process.env.EMAIL_HOST);
  console.log('Port:', process.env.EMAIL_PORT);
  console.log('User:', process.env.EMAIL_USER);
  console.log('Secure:', process.env.EMAIL_SECURE);
  console.log('\nSending test email...\n');

  try {
    const info = await transporter.sendMail({
      from: `"INSPEX System" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self
      subject: 'INSPEX Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Configuration Successful!</h2>
          <p>This is a test email from the INSPEX system.</p>
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email Server:</strong> ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}</p>
            <p style="margin: 5px 0 0 0;"><strong>Sent From:</strong> ${process.env.EMAIL_USER}</p>
          </div>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nCheck your inbox at:', process.env.EMAIL_USER);
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response) {
      console.error('Server response:', error.response);
    }
  }

  process.exit(0);
}

testEmail();
