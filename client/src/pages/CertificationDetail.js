import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import {
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

function CertificationDetail() {
  const { id } = useParams(); // This is the door ID
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCertifyDialog, setShowCertifyDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [signature, setSignature] = useState('');

  // Fetch inspection details for certification review
  const { data: certificationData, isLoading, error } = useQuery(
    ['certification', id],
    async () => {
      // Use the backend API endpoint for full inspection details
      const response = await api.get(`/certifications/door/${id}/inspection`);
      return response.data;
    },
    {
      enabled: !!id,
      onSuccess: async (data) => {
        // Automatically set status to 'under_review' when engineer opens certification detail
        if (data?.inspection?.certification_status === 'pending') {
          try {
            await api.patch(`/doors/${id}`, {
              certification_status: 'under_review'
            });
            // Invalidate queries to refresh the data
            queryClient.invalidateQueries(['certification', id]);
            queryClient.invalidateQueries('pending-certifications');
          } catch (error) {
            console.error('Failed to update certification status to under_review:', error);
            // Don't show error to user as this is a background operation
          }
        }
      }
    }
  );

  // Certify door mutation
  const certifyMutation = useMutation(
    async (certData) => {
      const response = await api.post(`/certifications/certify/${id}`, certData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pending-certifications');
        queryClient.invalidateQueries(['certification', id]);
        showSuccess('Door certified successfully!');
        navigate('/certifications');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to certify door');
      }
    }
  );

  // Reject certification mutation
  const rejectMutation = useMutation(
    async (rejectData) => {
      // Use dedicated rejection endpoint that sends email notifications
      const response = await api.post(`/certifications/reject/${id}`, {
        reason: rejectData.reason
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pending-certifications');
        queryClient.invalidateQueries(['certification', id]);
        showSuccess('Certification rejected. Team has been notified via email.');
        navigate('/certifications');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to reject certification');
      }
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading certification details</div>;

  const { inspection, checks } = certificationData;
  const passedChecks = checks?.filter(check => check.is_checked === true)?.length || 0;
  const totalChecks = checks?.length || 0;
  const failedChecks = checks?.filter(check => check.is_checked === false)?.length || 0;
  const allChecksPassed = passedChecks === totalChecks && totalChecks > 0;

  const handleCertify = () => {
    if (!allChecksPassed) {
      showError('Cannot certify: Some inspection points failed. Please review carefully.');
      return;
    }
    setShowCertifyDialog(true);
  };

  const confirmCertification = () => {
    certifyMutation.mutate({ signature });
    setShowCertifyDialog(false);
  };

  const handleReject = () => {
    setShowRejectDialog(true);
  };

  const confirmRejection = () => {
    if (!rejectionReason.trim()) {
      showError('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({ reason: rejectionReason });
    setShowRejectDialog(false);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <button
            onClick={() => navigate('/certifications')}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="-ml-1 mr-1 h-5 w-5" />
            Back to Certifications
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Certification Review</h1>
          <p className="mt-2 text-sm text-gray-700">
            Review inspection details and certify door {inspection?.serial_number}
          </p>
        </div>
      </div>

      {/* Door Information Card */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Door Information
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Details of the door ready for certification.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {inspection?.serial_number || 'N/A'}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Drawing Number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {inspection?.drawing_number || 'N/A'}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {inspection?.description || 'N/A'}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Inspector</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {inspection?.inspector_name || 'N/A'}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Inspection Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {inspection?.inspection_date ? new Date(inspection.inspection_date).toLocaleString() : 'N/A'}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Completion Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {inspection?.completed_at ? new Date(inspection.completed_at).toLocaleString() : 'N/A'}
              </dd>
            </div>
            {inspection?.completion_notes && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Inspector Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {inspection.completion_notes}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Inspection Summary Card */}
      <div className="mt-8 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-gray-400 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Inspection Results Summary</h3>
                <p className="text-sm text-gray-500">
                  {passedChecks} passed, {failedChecks} failed out of {totalChecks} total checks
                </p>
              </div>
            </div>
            <div className="text-right">
              {allChecksPassed ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckIcon className="w-4 h-4 mr-1" />
                  All Checks Passed
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <XMarkIcon className="w-4 h-4 mr-1" />
                  {failedChecks} Check{failedChecks !== 1 ? 's' : ''} Failed
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                allChecksPassed ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Inspection Checklist - Read Only */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Inspection Checkpoint Details</h3>
        <div className="space-y-4">
          {checks?.map((check, index) => (
            <InspectionCheckItem
              key={check.id}
              check={check}
              index={index + 1}
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end space-x-3 pb-8">
        <button
          type="button"
          onClick={handleReject}
          disabled={rejectMutation.isLoading || certifyMutation.isLoading}
          className="py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          Reject Certification
        </button>
        <button
          type="button"
          onClick={handleCertify}
          disabled={rejectMutation.isLoading || certifyMutation.isLoading}
          className={`inline-flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            allChecksPassed
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              : 'bg-gray-400 cursor-not-allowed'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
        >
          <CheckIcon className="w-4 h-4 mr-2" />
          Certify Door
        </button>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Certification</h3>
              <p className="text-sm text-gray-500 mb-4">
                Please provide a reason for rejecting this certification. The door will be marked for re-inspection.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                  placeholder="Describe the issues found during review..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRejection}
                  disabled={rejectMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certify Dialog */}
      {showCertifyDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Certify Door</h3>
              <p className="text-sm text-gray-500 mb-4">
                By certifying this door, you confirm that all inspection points have been reviewed and meet the required standards.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Engineer Signature (Optional)
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter your name or initials"
                />
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                <p className="text-sm text-green-800">
                  <strong>Summary:</strong> {passedChecks}/{totalChecks} checks passed
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCertifyDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCertification}
                  disabled={certifyMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {certifyMutation.isLoading ? 'Certifying...' : 'Confirm Certification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Read-only inspection check item component
function InspectionCheckItem({ check, index }) {
  const [showNotes, setShowNotes] = useState(!!check.notes);

  return (
    <div className={`bg-white shadow rounded-lg p-6 border-l-4 ${
      check.is_checked === true ? 'border-green-400 bg-green-50' :
      check.is_checked === false ? 'border-red-400 bg-red-50' :
      'border-gray-200'
    }`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 mt-1">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
            {index}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-medium text-gray-900">{check.name}</h4>
              <p className="mt-1 text-sm text-gray-500">{check.description}</p>
            </div>

            <div className="ml-4">
              {check.is_checked === true ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border-2 border-green-400">
                  <CheckIcon className="w-3 h-3 mr-1" />
                  Pass
                </span>
              ) : check.is_checked === false ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border-2 border-red-400">
                  <XMarkIcon className="w-3 h-3 mr-1" />
                  Fail
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Not Checked
                </span>
              )}
            </div>
          </div>

          {/* Photo Display */}
          {check.photo_path && (
            <div className="mt-4">
              <span className="inline-flex items-center text-sm text-green-600 font-medium mb-2">
                <CheckIcon className="w-4 h-4 mr-1" />
                Inspection Photo
              </span>
              <div className="mt-2">
                <img
                  src={check.photo_path}
                  alt={`Inspection point ${check.name}`}
                  className="max-w-md rounded-lg shadow-md border border-gray-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    console.error('Error loading photo:', check.photo_path);
                  }}
                />
              </div>
            </div>
          )}

          {/* Notes - Read Only */}
          {check.notes && (
            <div className="mt-4">
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
              >
                <DocumentTextIcon className="w-4 h-4 mr-1" />
                {showNotes ? 'Hide Notes' : 'Show Notes'}
              </button>

              {showNotes && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700">{check.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          {check.checked_at && (
            <div className="mt-2 text-xs text-gray-400">
              Checked on {new Date(check.checked_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CertificationDetail;
