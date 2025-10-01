import React from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  DocumentIcon,
  EngineeringIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { STATUS_LABELS } from '../types/workflow';

const STEP_ICONS = {
  draft: DocumentIcon,
  pending_engineer_review: ClockIcon,
  engineer_approved: CheckCircleIcon,
  engineer_rejected: XCircleIcon,
  pending_admin_release: ClockIcon,
  released_to_client: UserIcon,
  client_downloaded: CheckCircleIcon,
  client_rejected: XCircleIcon,
  completed: CheckCircleIcon
};

const STEP_COLORS = {
  current: 'border-primary-500 text-primary-600',
  completed: 'border-green-500 text-green-600',
  rejected: 'border-red-500 text-red-600',
  pending: 'border-gray-300 text-gray-400'
};

function WorkflowTimeline({ currentStatus, history = [], expectedDates = {} }) {
  const steps = [
    { key: 'draft', label: 'Inspection Created' },
    { key: 'pending_engineer_review', label: 'Engineer Review' },
    { key: 'engineer_approved', label: 'Engineer Approved' },
    { key: 'pending_admin_release', label: 'Admin Release' },
    { key: 'released_to_client', label: 'Client Review' },
    { key: 'completed', label: 'Completed' }
  ];

  const getStepStatus = (stepKey) => {
    if (stepKey === currentStatus) return 'current';

    const stepIndex = steps.findIndex(s => s.key === stepKey);
    const currentIndex = steps.findIndex(s => s.key === currentStatus);

    if (currentStatus.includes('rejected')) {
      if (stepIndex <= currentIndex) return 'rejected';
      return 'pending';
    }

    if (stepIndex < currentIndex || currentStatus === 'completed') return 'completed';
    return 'pending';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const getExpectedDate = (stepKey) => {
    return expectedDates[`${stepKey}_expected_date`] || expectedDates[`${stepKey.split('_')[0]}_expected_date`];
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {steps.map((step, stepIdx) => {
          const stepStatus = getStepStatus(step.key);
          const Icon = STEP_ICONS[step.key] || DocumentIcon;
          const colorClass = STEP_COLORS[stepStatus];
          const expectedDate = getExpectedDate(step.key);

          return (
            <li key={step.key}>
              <div className="relative pb-8">
                {stepIdx !== steps.length - 1 ? (
                  <span
                    className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${
                      stepStatus === 'completed' ? 'bg-green-500' :
                      stepStatus === 'rejected' ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ring-8 ring-white ${colorClass}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5">
                    <div className="text-sm">
                      <span className={`font-medium ${
                        stepStatus === 'current' ? 'text-primary-600' :
                        stepStatus === 'completed' ? 'text-green-600' :
                        stepStatus === 'rejected' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {expectedDate && (
                      <div className="mt-1 text-xs text-gray-500">
                        Expected: {formatDate(expectedDate)}
                      </div>
                    )}
                    {stepStatus === 'current' && (
                      <div className="mt-1 text-xs text-primary-600 font-medium">
                        Current Step
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default WorkflowTimeline;