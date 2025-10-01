import React, { useState } from 'react';
import {
  PaperAirplaneIcon,
  EyeIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import WorkflowService from '../services/workflowService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import WorkflowStatusBadge from './WorkflowStatusBadge';

function AdminReleasePanel({ inspection, onUpdate }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const handleRelease = async () => {
    setLoading(true);
    try {
      const result = await WorkflowService.releaseToClient(inspection.id, user.uid);

      if (result.success) {
        showSuccess('Certificate released to client successfully');
        onUpdate();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to release certificate');
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const previewCertificate = () => {
    // In a real app, this would open a preview modal
    showSuccess('Certificate preview would open here');
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Ready for Release
          </h3>
          <p className="text-sm text-gray-500">
            Door: {inspection.door_name || inspection.door_id}
          </p>
          <p className="text-sm text-gray-500">
            Inspection ID: {inspection.id}
          </p>
          <div className="mt-2">
            <WorkflowStatusBadge status={inspection.status} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Engineer Approved</p>
          <p className="text-sm font-medium">
            {new Date(inspection.engineer_approved_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Approval Summary */}
      <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-green-800 mb-1">
              Engineer Approved
            </h4>
            <p className="text-sm text-green-700">
              This inspection has been reviewed and approved by the engineer.
            </p>
            {inspection.engineer_comments && (
              <div className="mt-2">
                <p className="text-xs font-medium text-green-800 uppercase tracking-wide">
                  Engineer Comments:
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {inspection.engineer_comments}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Certificate Details */}
      <div className="mb-6 bg-gray-50 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Certificate Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Inspector:</span>
            <span className="ml-2 text-gray-900">{inspection.inspector_name || 'Admin'}</span>
          </div>
          <div>
            <span className="text-gray-500">Inspection Date:</span>
            <span className="ml-2 text-gray-900">
              {new Date(inspection.inspection_date || inspection.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Engineer:</span>
            <span className="ml-2 text-gray-900">{inspection.engineer_name || 'Approved'}</span>
          </div>
          <div>
            <span className="text-gray-500">Client:</span>
            <span className="ml-2 text-gray-900">{inspection.client_name || inspection.client_email}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!showConfirmation && (
        <div className="space-y-3">
          <button
            onClick={previewCertificate}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            Preview Final Certificate
          </button>

          <button
            onClick={() => setShowConfirmation(true)}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
            Release Certificate to Client
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start">
            <DocumentTextIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                Confirm Certificate Release
              </h4>
              <p className="text-sm text-yellow-700 mb-4">
                This will send the certificate to the client for download and review.
                The client will be able to download or reject the certificate.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleRelease}
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? 'Releasing...' : 'Confirm Release'}
                </button>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminReleasePanel;