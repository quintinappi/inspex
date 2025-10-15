import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  CheckIcon,
  XMarkIcon,
  CameraIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  const { data: inspectionData, isLoading, error } = useQuery(
    ['inspection', id],
    async () => {
      const response = await api.get(`/inspections/${id}`);
      return response.data;
    },
    {
      enabled: !!id,
      retry: 3,
      retryDelay: 1000,
      staleTime: 0
    }
  );

  const updateCheckMutation = useMutation(
    async ({ checkId, is_checked, notes, photo, showToast = false }) => {
      let photoPath = null;

      // Upload photo if provided
      if (photo) {
        try {
          const timestamp = Date.now();
          const fileName = `${id}_${checkId}_${timestamp}.jpg`;
          const storageRef = ref(storage, `inspection-photos/${fileName}`);

          await uploadBytes(storageRef, photo);
          photoPath = await getDownloadURL(storageRef);
        } catch (uploadError) {
          console.error('Photo upload error:', uploadError);
          throw new Error('Failed to upload photo');
        }
      }

      const updateData = {
        is_checked,
        notes: notes || ''
      };

      // Include photo_path if we uploaded a new photo
      if (photoPath) {
        updateData.photo_path = photoPath;
      }

      const response = await api.put(`/inspections/${id}/checks/${checkId}`, updateData);
      return { ...response.data, showToast };
    },
    {
      onSuccess: (data) => {
        queryClient.refetchQueries(['inspection', id]);
        // Only show toast for Pass/Fail actions, not for notes updates
        if (data.showToast) {
          showSuccess('Inspection point updated');
        }
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to update inspection point');
      }
    }
  );

  const completeInspectionMutation = useMutation(
    async (notes) => {
      const response = await api.post(`/inspections/complete/${id}`, { notes });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inspection', id]);
        queryClient.invalidateQueries('doors');
        queryClient.invalidateQueries('active-inspections');
        queryClient.invalidateQueries('completed-inspections');
        queryClient.invalidateQueries('pending-certifications');
        showSuccess('Inspection completed successfully!');
        navigate('/inspections');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to complete inspection');
      }
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading inspection details</div>;

  const { inspection, checks } = inspectionData;
  const completedChecks = checks?.filter(check => check.is_checked)?.length || 0;
  const totalChecks = checks?.length || 0;
  const allChecksCompleted = completedChecks === totalChecks && totalChecks > 0;

  const handleCompleteInspection = () => {
    if (!allChecksCompleted) {
      showError('Please complete all inspection points before finishing');
      return;
    }
    setShowCompletionDialog(true);
  };

  const confirmCompletion = () => {
    completeInspectionMutation.mutate(completionNotes);
    setShowCompletionDialog(false);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Inspection Details</h1>
          <p className="mt-2 text-sm text-gray-700">
            Door: {inspection?.serial_number} | Inspector: {inspection?.inspector_name}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-8 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-gray-400 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Inspection Progress</h3>
                <p className="text-sm text-gray-500">{completedChecks} of {totalChecks} checks completed</p>
              </div>
            </div>
            <div className="text-right">
              {inspection?.status === 'completed' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Completed
                </span>
              ) : (
                <button
                  onClick={handleCompleteInspection}
                  disabled={!allChecksCompleted || completeInspectionMutation.isLoading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                    allChecksCompleted 
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                      : 'bg-gray-400 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
                >
                  Complete Inspection
                </button>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                allChecksCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Inspection Checklist */}
      <div className="mt-8 space-y-4">
        {checks?.map((check, index) => (
          <InspectionCheckItem
            key={check.id}
            check={check}
            index={index + 1}
            onUpdate={(data) => updateCheckMutation.mutate({ checkId: check.id, ...data })}
            isUpdating={updateCheckMutation.isLoading}
            readOnly={inspection?.status === 'completed'}
          />
        ))}
      </div>

      {/* Completion Dialog */}
      {showCompletionDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Complete Inspection</h3>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Notes (Optional)
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Add any final observations or notes..."
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCompletionDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCompletion}
                  disabled={completeInspectionMutation.isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {completeInspectionMutation.isLoading ? 'Completing...' : 'Complete Inspection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InspectionCheckItem({ check, index, onUpdate, isUpdating, readOnly }) {
  const [notes, setNotes] = useState(check.notes || '');
  const [photo, setPhoto] = useState(null);
  const [showNotes, setShowNotes] = useState(!!check.notes);
  const [optimisticCheck, setOptimisticCheck] = useState(null);

  // Debounce timer for notes updates
  const notesTimerRef = React.useRef(null);

  // Reset optimistic state when actual data updates
  React.useEffect(() => {
    if (optimisticCheck !== null && check.is_checked === optimisticCheck) {
      setOptimisticCheck(null);
    }
  }, [check.is_checked, optimisticCheck]);

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (notesTimerRef.current) {
        clearTimeout(notesTimerRef.current);
      }
    };
  }, []);

  const handleCheckToggle = (checked) => {
    // Optimistic update - show visual feedback immediately
    setOptimisticCheck(checked);
    // Show toast for Pass/Fail actions
    onUpdate({ is_checked: checked, notes, photo, showToast: true });
  };

  const handleNotesChange = (newNotes) => {
    setNotes(newNotes);

    // Clear existing timer
    if (notesTimerRef.current) {
      clearTimeout(notesTimerRef.current);
    }

    // Debounce notes updates - save after 500ms of no typing
    notesTimerRef.current = setTimeout(() => {
      // Don't show toast for notes updates
      onUpdate({ is_checked: check.is_checked, notes: newNotes, photo, showToast: false });
    }, 500);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      // Show toast for photo uploads
      onUpdate({ is_checked: check.is_checked, notes, photo: file, showToast: true });
    }
  };

  // Use optimistic state if available, otherwise use actual state
  const displayCheckState = optimisticCheck !== null ? optimisticCheck : check.is_checked;

  return (
    <div className={`bg-white shadow rounded-lg p-6 border-l-4 transition-all duration-200 ${
      displayCheckState === true ? 'border-green-400 bg-green-50' :
      displayCheckState === false ? 'border-red-400 bg-red-50' :
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
            
            {!readOnly && (
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleCheckToggle(true)}
                  disabled={isUpdating}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    displayCheckState === true
                      ? 'bg-green-100 text-green-800 border-2 border-green-400'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  <CheckIcon className="w-3 h-3 mr-1" />
                  Pass
                </button>
                <button
                  onClick={() => handleCheckToggle(false)}
                  disabled={isUpdating}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    displayCheckState === false
                      ? 'bg-red-100 text-red-800 border-2 border-red-400'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-red-50 hover:text-red-700'
                  }`}
                >
                  <XMarkIcon className="w-3 h-3 mr-1" />
                  Fail
                </button>
              </div>
            )}
          </div>

          {/* Photo Upload and Display */}
          <div className="mt-4">
            <div className="flex items-center space-x-4">
              {!readOnly && (
                <label className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  <CameraIcon className="w-4 h-4 mr-2" />
                  {check.photo_path || photo ? 'Change Photo' : 'Add Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}

              {(check.photo_path || photo) && (
                <span className="text-sm text-green-600 font-medium">
                  ✓ Photo uploaded
                </span>
              )}
            </div>

            {/* Display uploaded photo */}
            {check.photo_path && (
              <div className="mt-3">
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
            )}
          </div>

          {/* Notes */}
          <div className="mt-4">
            {!readOnly && (
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
              >
                <DocumentTextIcon className="w-4 h-4 mr-1" />
                {showNotes ? 'Hide Notes' : 'Add Notes'}
              </button>
            )}
            
            {(showNotes || check.notes) && (
              <div className="mt-2">
                {readOnly ? (
                  check.notes && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-600">{check.notes}</p>
                    </div>
                  )
                ) : (
                  <textarea
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    rows={2}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Add notes about this inspection point..."
                  />
                )}
              </div>
            )}
          </div>

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

export default InspectionDetail;