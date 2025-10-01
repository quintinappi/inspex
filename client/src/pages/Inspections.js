import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import { ClipboardDocumentCheckIcon, PlayIcon } from '@heroicons/react/24/outline';

function Inspections() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('pending');

  // Get doors pending inspection
  const { data: pendingDoors, isLoading: pendingLoading } = useQuery(
    'doors-pending-inspection', 
    async () => {
      const response = await api.get('/doors/status/pending-inspection');
      return response.data;
    }
  );

  // Get active inspections
  const { data: activeInspections, isLoading: activeLoading } = useQuery(
    'active-inspections', 
    async () => {
      const response = await api.get('/inspections');
      return response.data.filter(inspection => inspection.status === 'in_progress');
    }
  );

  // Get completed inspections
  const { data: completedInspections, isLoading: completedLoading } = useQuery(
    'completed-inspections', 
    async () => {
      const response = await api.get('/inspections');
      return response.data.filter(inspection => inspection.status === 'completed');
    }
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
        queryClient.invalidateQueries('active-inspections');
        queryClient.invalidateQueries('doors');
        showSuccess('Inspection started successfully');
        navigate(`/inspections/${data.inspection.id}`);
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to start inspection');
      }
    }
  );

  const isLoading = pendingLoading || activeLoading || completedLoading;
  
  if (isLoading) return <LoadingSpinner />;


  return (
    <div className="px-4 sm:px-6 lg:px-8">
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
          <nav className="-mb-px flex space-x-8">
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
        {activeTab === 'pending' && (
          <PendingInspections 
            doors={pendingDoors} 
            onStartInspection={(doorId) => startInspectionMutation.mutate(doorId)}
            isLoading={startInspectionMutation.isLoading}
          />
        )}
        
        {activeTab === 'active' && (
          <ActiveInspections inspections={activeInspections} />
        )}
        
        {activeTab === 'completed' && (
          <CompletedInspections inspections={completedInspections} />
        )}
      </div>
    </div>
  );
}

// Component for doors pending inspection
function PendingInspections({ doors, onStartInspection, isLoading }) {
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
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
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
            <tr key={door.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {door.serial_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {door.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {door.po_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onStartInspection(door.id)}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
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
  );
}

// Component for active inspections
function ActiveInspections({ inspections }) {
  if (!inspections || inspections.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No active inspections</h3>
        <p className="mt-1 text-sm text-gray-500">Start an inspection from the pending tab.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
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
            <tr key={inspection.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  to={`/inspections/${inspection.id}`}
                  className="text-primary-600 hover:text-primary-900"
                >
                  Continue
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Component for completed inspections
function CompletedInspections({ inspections }) {
  if (!inspections || inspections.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No completed inspections</h3>
        <p className="mt-1 text-sm text-gray-500">Completed inspections will appear here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
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
            <tr key={inspection.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {inspection.serial_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {inspection.inspector_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(inspection.inspection_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status="completed" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  to={`/inspections/${inspection.id}`}
                  className="text-primary-600 hover:text-primary-900"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
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

export default Inspections;