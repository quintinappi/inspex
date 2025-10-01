// Workflow Status Types
export const INSPECTION_STATUS = {
  DRAFT: 'draft',
  PENDING_ENGINEER_REVIEW: 'pending_engineer_review',
  ENGINEER_APPROVED: 'engineer_approved',
  ENGINEER_REJECTED: 'engineer_rejected',
  PENDING_ADMIN_RELEASE: 'pending_admin_release',
  RELEASED_TO_CLIENT: 'released_to_client',
  CLIENT_DOWNLOADED: 'client_downloaded',
  CLIENT_REJECTED: 'client_rejected',
  COMPLETED: 'completed'
};

export const USER_ROLES = {
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  CLIENT: 'client'
};

// Workflow State Machine
export const WORKFLOW_TRANSITIONS = {
  [INSPECTION_STATUS.DRAFT]: [INSPECTION_STATUS.PENDING_ENGINEER_REVIEW],
  [INSPECTION_STATUS.PENDING_ENGINEER_REVIEW]: [
    INSPECTION_STATUS.ENGINEER_APPROVED,
    INSPECTION_STATUS.ENGINEER_REJECTED
  ],
  [INSPECTION_STATUS.ENGINEER_APPROVED]: [INSPECTION_STATUS.PENDING_ADMIN_RELEASE],
  [INSPECTION_STATUS.ENGINEER_REJECTED]: [INSPECTION_STATUS.DRAFT],
  [INSPECTION_STATUS.PENDING_ADMIN_RELEASE]: [INSPECTION_STATUS.RELEASED_TO_CLIENT],
  [INSPECTION_STATUS.RELEASED_TO_CLIENT]: [
    INSPECTION_STATUS.CLIENT_DOWNLOADED,
    INSPECTION_STATUS.CLIENT_REJECTED
  ],
  [INSPECTION_STATUS.CLIENT_DOWNLOADED]: [INSPECTION_STATUS.COMPLETED],
  [INSPECTION_STATUS.CLIENT_REJECTED]: [INSPECTION_STATUS.ENGINEER_REJECTED]
};

// Status Display Names
export const STATUS_LABELS = {
  [INSPECTION_STATUS.DRAFT]: 'Draft - In Progress',
  [INSPECTION_STATUS.PENDING_ENGINEER_REVIEW]: 'Pending Engineer Review',
  [INSPECTION_STATUS.ENGINEER_APPROVED]: 'Engineer Approved',
  [INSPECTION_STATUS.ENGINEER_REJECTED]: 'Engineer Rejected',
  [INSPECTION_STATUS.PENDING_ADMIN_RELEASE]: 'Pending Admin Release',
  [INSPECTION_STATUS.RELEASED_TO_CLIENT]: 'Released to Client',
  [INSPECTION_STATUS.CLIENT_DOWNLOADED]: 'Downloaded by Client',
  [INSPECTION_STATUS.CLIENT_REJECTED]: 'Rejected by Client',
  [INSPECTION_STATUS.COMPLETED]: 'Completed'
};

// Email Templates
export const EMAIL_TEMPLATES = {
  ENGINEER_REVIEW_NEEDED: {
    subject: 'INSPEX: Door Inspection Pending Review',
    template: 'engineer_review_needed'
  },
  ADMIN_RELEASE_READY: {
    subject: 'INSPEX: Inspection Approved - Ready for Release',
    template: 'admin_release_ready'
  },
  CLIENT_CERTIFICATE_READY: {
    subject: 'INSPEX: Certificate Ready for Download',
    template: 'client_certificate_ready'
  },
  ENGINEER_CLIENT_REJECTION: {
    subject: 'INSPEX: Client Rejection - Review Required',
    template: 'engineer_client_rejection'
  }
};