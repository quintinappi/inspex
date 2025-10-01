import React from 'react';
import { INSPECTION_STATUS, STATUS_LABELS } from '../types/workflow';

const STATUS_COLORS = {
  [INSPECTION_STATUS.DRAFT]: 'bg-gray-100 text-gray-800',
  [INSPECTION_STATUS.PENDING_ENGINEER_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [INSPECTION_STATUS.ENGINEER_APPROVED]: 'bg-green-100 text-green-800',
  [INSPECTION_STATUS.ENGINEER_REJECTED]: 'bg-red-100 text-red-800',
  [INSPECTION_STATUS.PENDING_ADMIN_RELEASE]: 'bg-blue-100 text-blue-800',
  [INSPECTION_STATUS.RELEASED_TO_CLIENT]: 'bg-purple-100 text-purple-800',
  [INSPECTION_STATUS.CLIENT_DOWNLOADED]: 'bg-indigo-100 text-indigo-800',
  [INSPECTION_STATUS.CLIENT_REJECTED]: 'bg-orange-100 text-orange-800',
  [INSPECTION_STATUS.COMPLETED]: 'bg-emerald-100 text-emerald-800'
};

function WorkflowStatusBadge({ status, className = '' }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const label = STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {label}
    </span>
  );
}

export default WorkflowStatusBadge;