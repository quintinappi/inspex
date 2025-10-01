import { doc, updateDoc, addDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { INSPECTION_STATUS, WORKFLOW_TRANSITIONS, EMAIL_TEMPLATES } from '../types/workflow';

export class WorkflowService {

  // Transition inspection to next status
  static async transitionInspection(inspectionId, newStatus, actionData = {}) {
    try {
      const inspectionRef = doc(db, 'door_inspections', inspectionId);

      const updateData = {
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        [`${newStatus}_at`]: new Date().toISOString(),
        ...actionData
      };

      await updateDoc(inspectionRef, updateData);

      // Create workflow log entry
      await this.logWorkflowAction(inspectionId, newStatus, actionData);

      // Send appropriate notifications
      await this.sendNotifications(inspectionId, newStatus, actionData);

      return { success: true };
    } catch (error) {
      console.error('Error transitioning inspection:', error);
      return { success: false, error: error.message };
    }
  }

  // Submit inspection for engineer review
  static async submitForEngineerReview(inspectionId, adminComments = '') {
    return await this.transitionInspection(
      inspectionId,
      INSPECTION_STATUS.PENDING_ENGINEER_REVIEW,
      {
        admin_comments: adminComments,
        submitted_by: 'admin',
        engineer_expected_date: this.calculateExpectedDate(3) // 3 days for engineer review
      }
    );
  }

  // Engineer approval
  static async engineerApprove(inspectionId, engineerComments = '', engineerId) {
    return await this.transitionInspection(
      inspectionId,
      INSPECTION_STATUS.ENGINEER_APPROVED,
      {
        engineer_comments: engineerComments,
        engineer_id: engineerId,
        approved_by: engineerId,
        admin_expected_date: this.calculateExpectedDate(1) // 1 day for admin release
      }
    );
  }

  // Engineer rejection
  static async engineerReject(inspectionId, rejectionComments, engineerId, expectedReturnDate) {
    return await this.transitionInspection(
      inspectionId,
      INSPECTION_STATUS.ENGINEER_REJECTED,
      {
        engineer_rejection_comments: rejectionComments,
        engineer_id: engineerId,
        rejected_by: engineerId,
        expected_return_date: expectedReturnDate,
        admin_expected_date: expectedReturnDate
      }
    );
  }

  // Admin release to client
  static async releaseToClient(inspectionId, adminId) {
    return await this.transitionInspection(
      inspectionId,
      INSPECTION_STATUS.RELEASED_TO_CLIENT,
      {
        released_by: adminId,
        client_expected_date: this.calculateExpectedDate(7) // 7 days for client review
      }
    );
  }

  // Client downloads certificate
  static async clientDownload(inspectionId, clientId) {
    return await this.transitionInspection(
      inspectionId,
      INSPECTION_STATUS.CLIENT_DOWNLOADED,
      {
        downloaded_by: clientId,
        download_date: new Date().toISOString()
      }
    );
  }

  // Client rejects certificate
  static async clientReject(inspectionId, rejectionComments, clientId, issueDescription) {
    return await this.transitionInspection(
      inspectionId,
      INSPECTION_STATUS.CLIENT_REJECTED,
      {
        client_rejection_comments: rejectionComments,
        client_issue_description: issueDescription,
        rejected_by: clientId,
        engineer_expected_date: this.calculateExpectedDate(2) // 2 days for engineer to review client rejection
      }
    );
  }

  // Mark as completed
  static async markCompleted(inspectionId) {
    return await this.transitionInspection(
      inspectionId,
      INSPECTION_STATUS.COMPLETED,
      {
        completed_date: new Date().toISOString()
      }
    );
  }

  // Get inspections by status for role
  static async getInspectionsByStatus(status, userRole) {
    try {
      const q = query(
        collection(db, 'door_inspections'),
        where('status', '==', status),
        orderBy('lastUpdated', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const inspections = [];

      querySnapshot.forEach((doc) => {
        inspections.push({ id: doc.id, ...doc.data() });
      });

      return inspections;
    } catch (error) {
      console.error('Error fetching inspections by status:', error);
      return [];
    }
  }

  // Get pending tasks for user role
  static async getPendingTasks(userRole, userId) {
    try {
      let statuses = [];

      switch (userRole) {
        case 'admin':
          statuses = [INSPECTION_STATUS.ENGINEER_APPROVED, INSPECTION_STATUS.ENGINEER_REJECTED];
          break;
        case 'engineer':
          statuses = [INSPECTION_STATUS.PENDING_ENGINEER_REVIEW, INSPECTION_STATUS.CLIENT_REJECTED];
          break;
        case 'client':
          statuses = [INSPECTION_STATUS.RELEASED_TO_CLIENT];
          break;
        default:
          return [];
      }

      const tasks = [];
      for (const status of statuses) {
        const inspections = await this.getInspectionsByStatus(status, userRole);
        tasks.push(...inspections);
      }

      return tasks;
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      return [];
    }
  }

  // Log workflow action
  static async logWorkflowAction(inspectionId, action, data) {
    try {
      await addDoc(collection(db, 'workflow_logs'), {
        inspection_id: inspectionId,
        action,
        data,
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging workflow action:', error);
    }
  }

  // Send notifications (placeholder for email service)
  static async sendNotifications(inspectionId, status, data) {
    // This would integrate with your email service (Firebase Functions, SendGrid, etc.)
    console.log(`Notification needed for inspection ${inspectionId}, status: ${status}`, data);

    // For now, we'll just log the notification
    // In production, this would trigger actual emails
    switch (status) {
      case INSPECTION_STATUS.PENDING_ENGINEER_REVIEW:
        console.log('📧 Email engineer about pending review');
        break;
      case INSPECTION_STATUS.ENGINEER_APPROVED:
        console.log('📧 Email admin about approved inspection');
        break;
      case INSPECTION_STATUS.RELEASED_TO_CLIENT:
        console.log('📧 Email client about certificate availability');
        break;
      case INSPECTION_STATUS.CLIENT_REJECTED:
        console.log('📧 Email engineer about client rejection');
        break;
      default:
        break;
    }
  }

  // Calculate expected date
  static calculateExpectedDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  }

  // Validate status transition
  static canTransition(currentStatus, newStatus) {
    return WORKFLOW_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
  }

  // Get workflow history for inspection
  static async getWorkflowHistory(inspectionId) {
    try {
      const q = query(
        collection(db, 'workflow_logs'),
        where('inspection_id', '==', inspectionId),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const history = [];

      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });

      return history;
    } catch (error) {
      console.error('Error fetching workflow history:', error);
      return [];
    }
  }
}

export default WorkflowService;