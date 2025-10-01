import React, { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, CalendarIcon } from '@heroicons/react/24/outline';
import WorkflowService from '../services/workflowService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import WorkflowStatusBadge from './WorkflowStatusBadge';

function EngineerApprovalPanel({ inspection, onUpdate }) {
  const [action, setAction] = useState(''); // 'approve' or 'reject'
  const [comments, setComments] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const handleApprove = async () => {
    if (!comments.trim()) {
      showError('Please provide approval comments');
      return;
    }

    setLoading(true);
    try {
      const result = await WorkflowService.engineerApprove(
        inspection.id,
        comments,
        user.uid
      );

      if (result.success) {
        showSuccess('Inspection approved successfully');
        onUpdate();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to approve inspection');
    } finally {
      setLoading(false);
      setAction('');
      setComments('');
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      showError('Please provide rejection reason');
      return;
    }
    if (!expectedDate) {
      showError('Please set expected return date');
      return;
    }

    setLoading(true);
    try {
      const result = await WorkflowService.engineerReject(
        inspection.id,
        comments,
        user.uid,
        expectedDate
      );

      if (result.success) {
        showSuccess('Inspection rejected with feedback');
        onUpdate();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to reject inspection');
    } finally {
      setLoading(false);
      setAction('');
      setComments('');
      setExpectedDate('');
    }
  };

  const resetAction = () => {
    setAction('');
    setComments('');
    setExpectedDate('');
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Door: {inspection.door_name || inspection.door_id}
          </h3>
          <p className="text-sm text-gray-500">
            Inspection ID: {inspection.id}
          </p>
          <div className="mt-2">
            <WorkflowStatusBadge status={inspection.status} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Submitted</p>
          <p className="text-sm font-medium">
            {new Date(inspection.submitted_at || inspection.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Inspection Details */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Admin Comments</h4>
        <div className="bg-gray-50 rounded-md p-3">
          <p className="text-sm text-gray-700">
            {inspection.admin_comments || 'No comments provided'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {!action && (
        <div className="flex space-x-3">
          <button
            onClick={() => setAction('approve')}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Approve
          </button>
          <button
            onClick={() => setAction('reject')}
            className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <XCircleIcon className="h-4 w-4 mr-2" />
            Reject
          </button>
        </div>
      )}

      {/* Approval Form */}
      {action === 'approve' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Approval Comments *
            </label>
            <textarea
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
              placeholder="Provide approval comments and any additional notes..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Approving...' : 'Confirm Approval'}
            </button>
            <button
              onClick={resetAction}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rejection Form */}
      {action === 'reject' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              placeholder="Explain what needs to be corrected..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Expected Return Date *
            </label>
            <div className="mt-1 relative">
              <input
                type="date"
                min={getMinDate()}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
              <CalendarIcon className="absolute right-3 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
            <button
              onClick={resetAction}
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

export default EngineerApprovalPanel;