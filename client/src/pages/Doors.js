import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
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
    // Show error but still allow adding doors
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Doors</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage refuge bay doors and their inspection status.
            </p>
          </div>
          {user?.role === 'admin' && (
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <Link
                to="/doors/add"
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Door
              </Link>
            </div>
          )}
        </div>
        <div className="mt-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">
              <h3 className="text-sm font-medium">Backend Connection Issue</h3>
              <p className="text-sm mt-1">
                Cannot load doors from database. The backend functions need to be fixed.
                You can still access the Add Door form to see the interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Doors</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage refuge bay doors and their inspection status.
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link
              to="/doors/add"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Door
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 flow-root">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
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
                      Inspection Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Certification Status
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doors?.map((door) => (
                    <tr key={door.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {door.serial_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {door.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={door.inspection_status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={door.certification_status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <Link
                            to={`/doors/${door.id}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDeleteDoor(door)}
                            disabled={deleteDoorMutation.isLoading}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Delete Door"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
    under_review: { label: 'Under Review', color: 'bg-orange-100 text-orange-800' },
    certified: { label: 'Certified', color: 'bg-green-100 text-green-800' },
    rejected: { label: '⚠️ REJECTED', color: 'bg-red-100 text-red-800 font-bold' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export default Doors;
