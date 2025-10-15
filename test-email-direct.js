// Test email sending directly with hardcoded credentials
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.spectiv.co.za',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: 'doors@spectiv.co.za',
    pass: 'Hzm]cWY!*eO&(z8J'
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function testEmail() {
  console.log('Testing email configuration...\n');
  console.log('Host: mail.spectiv.co.za');
  console.log('Port: 465');
  console.log('User: doors@spectiv.co.za');
  console.log('\nSending test email...\n');

  try {
    const info = await transporter.sendMail({
      from: '"INSPEX System" <doors@spectiv.co.za>',
      to: 'doors@spectiv.co.za', // Send to self
      subject: 'INSPEX Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Configuration Successful!</h2>
          <p>This is a test email from the INSPEX system.</p>
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email Server:</strong> mail.spectiv.co.za:465</p>
            <p style="margin: 5px 0 0 0;"><strong>Sent From:</strong> doors@spectiv.co.za</p>
          </div>
          <p>Email notifications are working correctly!</p>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nCheck your inbox at: doors@spectiv.co.za');
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
