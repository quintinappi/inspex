import React, { useState } from 'react';
import {
  DocumentArrowDownIcon,
  XCircleIcon,
  EyeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import WorkflowService from '../services/workflowService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import WorkflowStatusBadge from './WorkflowStatusBadge';

function ClientCertificatePanel({ inspection, onUpdate }) {
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [rejectionComments, setRejectionComments] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const handleDownload = async () => {
    setLoading(true);
    try {
      // In a real app, this would generate and download the actual certificate
      // For now, we'll simulate the download and mark as downloaded

      const result = await WorkflowService.clientDownload(inspection.id, user.id);

      if (result.success) {
        showSuccess('Certificate downloaded successfully');
        // Trigger actual download here
        downloadCertificate(inspection);
        onUpdate();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to download certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionComments.trim()) {
      showError('Please provide rejection comments');
      return;
    }
    if (!issueDescription.trim()) {
      showError('Please describe the issue');
      return;
    }

    setLoading(true);
    try {
      const result = await WorkflowService.clientReject(
        inspection.id,
        rejectionComments,
        user.id,
        issueDescription
      );

      if (result.success) {
        showSuccess('Certificate rejected with feedback');
        onUpdate();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to reject certificate');
    } finally {
      setLoading(false);
      setShowRejectionForm(false);
      setRejectionComments('');
      setIssueDescription('');
    }
  };

  // Simulate certificate download
  const downloadCertificate = (inspection) => {
    // Create a dummy PDF download
    const element = document.createElement('a');
    const file = new Blob(['This would be the actual certificate PDF content'],
      { type: 'application/pdf' });
    element.href = URL.createObjectURL(file);
    element.download = `inspection-certificate-${inspection.id}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
            Certificate Ready
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
          <p className="text-sm text-gray-500">Released</p>
          <p className="text-sm font-medium">
            {new Date(inspection.released_to_client_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Certificate Details */}
      <div className="mb-6 bg-gray-50 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Inspection Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Inspector:</span>
            <span className="ml-2 text-gray-900">{inspection.inspector_name || 'Admin'}</span>
          </div>
          <div>
            <span className="text-gray-500">Date:</span>
            <span className="ml-2 text-gray-900">
              {new Date(inspection.inspection_date || inspection.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Engineer:</span>
            <span className="ml-2 text-gray-900">{inspection.engineer_name || 'Approved'}</span>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <span className="ml-2 text-green-600 font-medium">Approved</span>
          </div>
        </div>

        {inspection.engineer_comments && (
          <div className="mt-3">
            <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Engineer Comments
            </h5>
            <p className="mt-1 text-sm text-gray-600">{inspection.engineer_comments}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!showRejectionForm && (
        <div className="space-y-3">
          <div className="flex space-x-3">
            <button
              onClick={previewCertificate}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              Preview Certificate
            </button>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {loading ? 'Downloading...' : 'Download Certificate'}
            </button>
          </div>

          <button
            onClick={() => setShowRejectionForm(true)}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <XCircleIcon className="h-4 w-4 mr-2" />
            Reject Certificate
          </button>
        </div>
      )}

      {/* Rejection Form */}
      {showRejectionForm && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Issue Description *
            </label>
            <textarea
              rows={2}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              placeholder="Briefly describe the issue with the certificate..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Detailed Comments *
            </label>
            <textarea
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              placeholder="Provide detailed feedback on what needs to be corrected..."
              value={rejectionComments}
              onChange={(e) => setRejectionComments(e.target.value)}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Rejection'}
            </button>
            <button
              onClick={() => setShowRejectionForm(false)}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientCertificatePanel;