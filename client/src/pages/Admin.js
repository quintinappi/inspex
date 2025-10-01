import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { CogIcon, UserGroupIcon, ClipboardDocumentListIcon, HashtagIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../context/NotificationContext';

function Admin() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [serialConfig, setSerialConfig] = useState({
    startingSerial: '',
    serialPrefix: 'MUF-S199-RBD'
  });

  const { data: dashboardData, isLoading, error } = useQuery(
    'admin-dashboard',
    async () => {
      const response = await api.get('/admin/dashboard');
      return response.data;
    }
  );

  const { data: configData } = useQuery(
    'serial-config',
    async () => {
      const response = await api.get('/admin/serial-config');
      return response.data;
    },
    {
      onSuccess: (data) => {
        if (data) {
          setSerialConfig({
            startingSerial: data.startingSerial || '',
            serialPrefix: data.serialPrefix || 'MUF-S199-RBD'
          });
        }
      }
    }
  );

  const updateSerialConfigMutation = useMutation(
    async (config) => {
      const response = await api.post('/admin/serial-config', config);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('serial-config');
        showSuccess('Serial number configuration updated successfully');
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to update configuration');
      }
    }
  );

  const handleSerialConfigSubmit = (e) => {
    e.preventDefault();
    updateSerialConfigMutation.mutate(serialConfig);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading admin dashboard</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
          <p className="mt-2 text-sm text-gray-700">
            System administration and management tools.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* System Overview */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CogIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">System Overview</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Doors</span>
                    <span className="text-sm font-medium">{dashboardData?.statistics?.totalDoors?.count || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Active Users</span>
                    <span className="text-sm font-medium">{dashboardData?.statistics?.activeUsers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Completed Inspections</span>
                    <span className="text-sm font-medium">{dashboardData?.statistics?.completedInspections?.count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                <div className="mt-4">
                  <button className="w-full bg-primary-600 text-white py-2 px-4 rounded-md text-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    Manage Users
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inspection Points */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Inspection Points</h3>
                <div className="mt-4">
                  <button className="w-full bg-primary-600 text-white py-2 px-4 rounded-md text-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    Manage Checklist
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Serial Number Configuration */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HashtagIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Serial Numbers</h3>
                <form onSubmit={handleSerialConfigSubmit} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Starting Serial Number</label>
                    <input
                      type="number"
                      min="1"
                      value={serialConfig.startingSerial}
                      onChange={(e) => setSerialConfig({...serialConfig, startingSerial: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., 200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Serial Prefix</label>
                    <input
                      type="text"
                      value={serialConfig.serialPrefix}
                      onChange={(e) => setSerialConfig({...serialConfig, serialPrefix: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updateSerialConfigMutation.isLoading}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-md text-xs hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {updateSerialConfigMutation.isLoading ? 'Updating...' : 'Update Config'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Latest system activities and changes.
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {dashboardData?.recentActivity?.map((activity, index) => (
            <li key={index} className="px-4 py-4">
              <div className="flex space-x-3">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description || 'System activity'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Recently'}
                  </p>
                </div>
              </div>
            </li>
          )) || (
            <li className="px-4 py-4">
              <p className="text-sm text-gray-500">No recent activity</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default Admin;