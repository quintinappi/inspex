import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import { ClipboardDocumentCheckIcon, PlayIcon, TrashIcon } from '@heroicons/react/24/outline';
import EngravingPlateGenerator from '../components/EngravingPlateGenerator';

function Inspections() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('pending');

  // Get doors pending inspection
  const { data: pendingDoors, isLoading: pendingLoading } = useQuery(
    'doors-pending-inspection',
    async () => {
      const response = await api.get('/doors/status/pending');
      return response.data;
    }
  );

  // Get doors needing admin/engineer review
  const { data: rejectedDoors, isLoading: rejectedLoading } = useQuery(
    'doors-rejected',
    async () => {
      const response = await api.get('/doors');
      return response.data.filter(door =>
        door.certification_status === 'rejected' || door.certification_status === 'under_review'
      );
    }
  );

  // Get all inspections (active and completed)
  const { data: inspections, isLoading: inspectionsLoading } = useQuery(
    'inspections',
    async () => {
      const response = await api.get('/inspections');
      return response.data;
    }
  );

  // Filter inspections into active and completed lists
  const activeInspections = React.useMemo(
    () => inspections?.filter(inspection => inspection.status === 'in_progress') || [],
    [inspections]
  );

  const completedInspections = React.useMemo(
    () => inspections?.filter(inspection => inspection.status === 'completed') || [],
    [inspections]
  );



  // Start inspection mutation
  const startInspectionMutation = useMutation(
    async (doorId) => {
      const response = await api.post(`/inspections/start/${doorId}`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('doors-pending-inspection');
        queryClient.invalidateQueries('inspections');
        queryClient.invalidateQueries('doors');
        showSuccess('Inspection started successfully');
        navigate(`/inspections/${data.inspection.id}`);
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to start inspection');
      }
    }
  );

  // Delete inspection mutation
  const [deletingInspectionId, setDeletingInspectionId] = React.useState(null);

  const deleteInspectionMutation = useMutation(
    async (inspectionId) => {
      setDeletingInspectionId(inspectionId);
      const response = await api.delete(`/inspections/${inspectionId}`);
      return response.data;
    },
    {
      onSuccess: (data, inspectionId) => {
        queryClient.invalidateQueries('inspections');
        queryClient.invalidateQueries('doors');
        queryClient.invalidateQueries('doors-pending-inspection');
        showSuccess('Inspection deleted successfully');
        setDeletingInspectionId(null);
      },
      onError: (error, inspectionId) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete inspection';
        showError(errorMessage);
        setDeletingInspectionId(null);
      },
      retry: false
    }
  );

  const isLoading = pendingLoading || rejectedLoading || inspectionsLoading;
  
  if (isLoading) return <LoadingSpinner />;


  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Inspections</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage door inspections and track progress.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('rejected')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rejected'
                  ? 'border-red-500 text-red-600'
                  : rejectedDoors?.length > 0
                  ? 'border-transparent text-red-600 hover:text-red-700 hover:border-red-300 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚠️ Review Queue ({rejectedDoors?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Inspection ({pendingDoors?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              In Progress ({activeInspections?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'completed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed ({completedInspections?.length || 0})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {activeTab === 'rejected' && (
          <RejectedDoors
            doors={rejectedDoors}
            onStartInspection={(doorId) => startInspectionMutation.mutate(doorId)}
            isLoading={startInspectionMutation.isLoading}
          />
        )}

        {activeTab === 'pending' && (
          <PendingInspections
            doors={pendingDoors}
            onStartInspection={(doorId) => startInspectionMutation.mutate(doorId)}
            isLoading={startInspectionMutation.isLoading}
          />
        )}

        {activeTab === 'active' && (
          <ActiveInspections
            inspections={activeInspections}
            onDelete={(inspectionId) => deleteInspectionMutation.mutate(inspectionId)}
            deletingInspectionId={deletingInspectionId}
          />
        )}

        {activeTab === 'completed' && (
          <CompletedInspections
            inspections={completedInspections}
            onDelete={(inspectionId) => deleteInspectionMutation.mutate(inspectionId)}
            deletingInspectionId={deletingInspectionId}
          />
        )}
      </div>
    </div>
  );
}

// Component for doors pending inspection
function PendingInspections({ doors, onStartInspection, isLoading }) {
  const [plateDoor, setPlateDoor] = React.useState(null);

  if (!doors || doors.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No doors pending inspection</h3>
        <p className="mt-1 text-sm text-gray-500">All doors have been inspected or no doors have been added yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg overflow-hidden">
        {/* Mobile View (Cards) */}
        <div className="block sm:hidden bg-white divide-y divide-gray-200">
          {doors.map((door) => (
            <div key={door.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm font-medium text-gray-900 font-mono">
                  {door.serial_number}
                </div>
                <div className="text-xs text-gray-500">
                  PO: {door.po_number || '-'}
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-4">
                {door.description || 'No description'}
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => setPlateDoor(door)}
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Generate Tag Plate
                </button>
                <button
                  onClick={() => onStartInspection(door.id)}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Start Inspection
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  PO Number
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {doors.map((door) => (
                <tr key={door.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                    {door.serial_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {door.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {door.po_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => setPlateDoor(door)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Generate Tag Plate
                    </button>
                    <button
                      onClick={() => onStartInspection(door.id)}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      <PlayIcon className="w-3 h-3 mr-1" />
                      Start Inspection
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {plateDoor && (
        <EngravingPlateGenerator
          door={plateDoor}
          onClose={() => setPlateDoor(null)}
        />
      )}
    </>
  );
}

// Component for active inspections
function ActiveInspections({ inspections, onDelete, deletingInspectionId }) {
  if (!inspections || inspections.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No active inspections</h3>
        <p className="mt-1 text-sm text-gray-500">Start an inspection from the pending tab.</p>
      </div>
    );
  }

  const handleDelete = (inspectionId, serialNumber) => {
    // Prevent multiple clicks while deletion is in progress
    if (deletingInspectionId === inspectionId) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the inspection for door ${serialNumber}?\n\nThis action cannot be undone and will:\n- Delete all inspection checks\n- Reset the door status to pending\n- Remove all inspection data`
    );

    if (confirmed) {
      onDelete(inspectionId);
    }
  };

  return (
    <div className="shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg overflow-hidden">
      {/* Mobile View (Cards) */}
      <div className="block sm:hidden bg-white divide-y divide-gray-200">
        {inspections.map((inspection) => (
          <div key={inspection.id} className="p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-medium text-gray-900 font-mono">
                {inspection.serial_number}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(inspection.inspection_date).toLocaleDateString()}
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">
              Inspector: {inspection.inspector_name}
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Progress: {inspection.completed_checks}/{inspection.total_checks} checks
            </div>
            <div className="flex space-x-2">
              <Link
                to={`/inspections/${inspection.id}`}
                className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Continue
              </Link>
              <button
                onClick={() => handleDelete(inspection.id, inspection.serial_number)}
                disabled={deletingInspectionId === inspection.id}
                className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deletingInspectionId === inspection.id ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <TrashIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Door Serial
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Inspector
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Started
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inspections.map((inspection) => (
              <tr key={inspection.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                  {inspection.serial_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inspection.inspector_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inspection.completed_checks}/{inspection.total_checks} checks
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(inspection.inspection_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <Link
                    to={`/inspections/${inspection.id}`}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Continue
                  </Link>
                  <button
                    onClick={() => handleDelete(inspection.id, inspection.serial_number)}
                    disabled={deletingInspectionId === inspection.id}
                    className="inline-flex items-center text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      deletingInspectionId === inspection.id
                        ? 'Deleting...'
                        : 'Delete inspection'
                    }
                  >
                    {deletingInspectionId === inspection.id ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <TrashIcon className="w-4 h-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Component for completed inspections
function CompletedInspections({ inspections, onDelete, deletingInspectionId }) {
  if (!inspections || inspections.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No completed inspections</h3>
        <p className="mt-1 text-sm text-gray-500">Completed inspections will appear here.</p>
      </div>
    );
  }

  const handleDelete = (inspectionId, serialNumber) => {
    // Prevent multiple clicks while deletion is in progress
    if (deletingInspectionId === inspectionId) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the completed inspection for door ${serialNumber}?\n\nThis action cannot be undone and will:\n- Delete all inspection checks\n- Reset the door status to pending\n- Remove all inspection data`
    );

    if (confirmed) {
      onDelete(inspectionId);
    }
  };

  return (
    <div className="shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg overflow-hidden">
      {/* Mobile View (Cards) */}
      <div className="block sm:hidden bg-white divide-y divide-gray-200">
        {inspections.map((inspection) => (
          <div key={inspection.id} className="p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-medium text-gray-900 font-mono">
                {inspection.serial_number}
              </div>
              <div className="text-xs text-gray-500">
                {inspection.completed_date
                  ? new Date(inspection.completed_date).toLocaleDateString()
                  : new Date(inspection.inspection_date).toLocaleDateString()}
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">
              Inspector: {inspection.inspector_name}
            </div>
            <div className="mb-4">
              <StatusBadge status={inspection.certification_status || 'pending'} />
            </div>
            <div className="flex space-x-2">
              <Link
                to={`/inspections/${inspection.id}`}
                className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                View
              </Link>
              <button
                onClick={() => handleDelete(inspection.id, inspection.serial_number)}
                disabled={deletingInspectionId === inspection.id}
                className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deletingInspectionId === inspection.id ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <TrashIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View (Table) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Door Serial
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Inspector
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Completed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inspections.map((inspection) => (
              <tr key={inspection.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                  {inspection.serial_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inspection.inspector_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inspection.completed_date
                    ? new Date(inspection.completed_date).toLocaleDateString()
                    : new Date(inspection.inspection_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={inspection.certification_status || 'pending'} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <Link
                    to={`/inspections/${inspection.id}`}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(inspection.id, inspection.serial_number)}
                    disabled={deletingInspectionId === inspection.id}
                    className="inline-flex items-center text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      deletingInspectionId === inspection.id
                        ? 'Deleting...'
                        : 'Delete inspection'
                    }
                  >
                    {deletingInspectionId === inspection.id ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <TrashIcon className="w-4 h-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
    under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-800' },
    certified: { label: 'Certified', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

// Component for rejected doors (need re-inspection)
function RejectedDoors({ doors, onStartInspection, isLoading }) {
  if (!doors || doors.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-green-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No doors in review</h3>
        <p className="mt-1 text-sm text-gray-500">All certifications are approved or waiting for review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {doors.length} {doors.length === 1 ? 'door needs' : 'doors need'} review
            </h3>
            <p className="mt-2 text-sm text-red-700">
              Open the door details to edit the rejected point, then resubmit it back to engineer review.
            </p>
          </div>
        </div>
      </div>

      {/* Rejected doors list */}
      <div className="shadow ring-1 ring-red-500 ring-opacity-50 sm:rounded-lg overflow-hidden">
        {/* Mobile View (Cards) */}
        <div className="block sm:hidden bg-white divide-y divide-gray-200">
          {doors.map((door) => (
            <div key={door.id} className="p-4 bg-red-50 hover:bg-red-100">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm font-medium text-gray-900 font-mono">
                  {door.serial_number}
                </div>
                <div className="text-xs text-gray-500">
                  PO: {door.po_number || '-'}
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-3">
                {door.description || 'No description'}
              </div>
              <div className="mb-4">
                <StatusBadge status={door.certification_status || 'pending'} />
              </div>
              <div className="flex flex-col space-y-2">
                <Link
                  to={`/doors/${door.id}`}
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Edit & Resubmit
                </Link>
                <button
                  onClick={() => onStartInspection(door.id)}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Re-Inspect
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-red-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {doors.map((door) => (
                <tr key={door.id} className="bg-red-50 hover:bg-red-100">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                    {door.serial_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {door.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {door.po_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={door.certification_status || 'pending'} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link
                      to={`/doors/${door.id}`}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                        Edit & Resubmit
                    </Link>
                    <button
                      onClick={() => onStartInspection(door.id)}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      <PlayIcon className="w-3 h-3 mr-1" />
                      Re-Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Inspections;