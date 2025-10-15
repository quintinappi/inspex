// Email notification service - calls Firebase Functions
// Note: Firebase Functions must be deployed for this to work

const FUNCTIONS_URL = process.env.REACT_APP_FUNCTIONS_URL || 'https://us-central1-inspex001.cloudfunctions.net/api';

class EmailService {
  /**
   * Send test email
   */
  async sendTestEmail(email) {
    try {
      const response = await fetch(`${FUNCTIONS_URL}/email/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send test email');
      }

      return await response.json();
    } catch (error) {
      console.error('Test email error:', error);
      throw error;
    }
  }

  /**
   * Notify when inspection is completed
   */
  async notifyInspectionCompleted(doorDetails, inspectorName, recipientEmails) {
    try {
      const response = await fetch(`${FUNCTIONS_URL}/email/inspection-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doorDetails,
          inspectorName,
          recipientEmails
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Inspection notification error:', error);
      // Don't throw - just log. Email is nice-to-have, not critical
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify when certification is ready
   */
  async notifyCertificationReady(doorDetails, engineerName, recipientEmails) {
    try {
      const response = await fetch(`${FUNCTIONS_URL}/email/certification-ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doorDetails,
          engineerName,
          recipientEmails
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Certification notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify when inspection/certification is rejected
   */
  async notifyRejection(doorDetails, rejectorName, rejectionReason, recipientEmails) {
    try {
      const response = await fetch(`${FUNCTIONS_URL}/email/rejection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doorDetails,
          rejectorName,
          rejectionReason,
          recipientEmails
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Rejection notification error:', error);
      return { success: false, error: error.message };
    }
  }
}

const emailService = new EmailService();
export default emailService;
