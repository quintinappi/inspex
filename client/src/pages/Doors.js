import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, TrashIcon, CubeIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

function Doors() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  const { data: doors, isLoading, error } = useQuery('doors', async () => {
    const response = await api.get('/doors');
    return response.data;
  });

  const deleteDoorMutation = useMutation(
    async (doorId) => {
      const response = await api.delete(`/doors/${doorId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('doors');
        showSuccess('Door deleted successfully');
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to delete door');
      }
    }
  );

  const handleDeleteDoor = (door) => {
    if (window.confirm(`Are you sure you want to delete door ${door.serial_number}? This action cannot be undone.`)) {
      deleteDoorMutation.mutate(door.id);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div className="min-h-screen">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Doors</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage refuge bay doors and their inspection status.
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="mb-6">
            <Link
              to="/doors/add"
              className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Door
            </Link>
          </div>
        )}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-red-800">
            <h3 className="text-sm font-medium">Backend Connection Issue</h3>
            <p className="text-sm mt-2 text-red-700">
              Cannot load doors from database. The backend functions need to be fixed.
              You can still access the Add Door form to see the interface.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Doors</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage refuge bay doors and their inspection status.
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="mt-4 sm:mt-0">
            <Link
              to="/doors/add"
              className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Door
            </Link>
          </div>
        )}
      </div>

      {/* Doors List */}
      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg overflow-hidden">
        {/* Mobile View (Cards) */}
        <div className="block sm:hidden">
          {doors?.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No doors</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first door.
              </p>
              <div className="mt-6">
                <Link
                  to="/doors/add"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add Door
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {doors?.map((door) => (
                <li key={door.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center mr-3">
                        <CubeIcon className="h-4 w-4 text-primary-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {door.serial_number}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        to={`/doors/${door.id}`}
                        className="p-2 text-gray-400 hover:text-gray-500"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteDoor(door)}
                        disabled={deleteDoorMutation.isLoading}
                        className="p-2 text-red-400 hover:text-red-500 disabled:opacity-50"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mb-3 ml-11">
                    {door.description || '-'}
                  </div>
                  <div className="flex flex-wrap gap-2 ml-11">
                    <StatusBadge status={door.inspection_status} />
                    <StatusBadge status={door.certification_status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Serial Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inspection Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certification Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {doors?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-4 text-sm font-medium text-gray-900">No doors</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by adding your first door.
                    </p>
                    <div className="mt-6">
                      <Link
                        to="/doors/add"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700"
                      >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Add Door
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                doors?.map((door) => (
                  <tr key={door.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center mr-3">
                          <CubeIcon className="h-4 w-4 text-primary-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {door.serial_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {door.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={door.inspection_status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={door.certification_status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <Link
                          to={`/doors/${door.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteDoor(door)}
                          disabled={deleteDoorMutation.isLoading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete Door"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {doors?.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <p>Showing {doors.length} door{doors.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    pending: { 
      label: 'Pending', 
      className: 'bg-amber-100 text-amber-800 border border-amber-200' 
    },
    in_progress: { 
      label: 'In Progress', 
      className: 'bg-blue-100 text-blue-800 border border-blue-200' 
    },
    completed: { 
      label: 'Completed', 
      className: 'bg-green-100 text-green-800 border border-green-200' 
    },
    under_review: { 
      label: 'Under Review', 
      className: 'bg-orange-100 text-orange-800 border border-orange-200' 
    },
    certified: { 
      label: 'Certified', 
      className: 'bg-green-100 text-green-800 border border-green-200' 
    },
    rejected: { 
      label: 'REJECTED', 
      className: 'bg-red-100 text-red-800 border border-red-200 font-bold' 
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default Doors;
