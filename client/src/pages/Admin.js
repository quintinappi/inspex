import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  UserGroupIcon, 
  ClipboardDocumentListIcon, 
  HashtagIcon, 
  BuildingOfficeIcon, 
  PhotoIcon 
} from '@heroicons/react/24/outline';
import { useNotification } from '../context/NotificationContext';

function Admin() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [serialConfig, setSerialConfig] = useState({
    startingSerial: '200',
    prefixes: {
      '1.5': 'MF42-15-',
      '1.8': 'MF42-18-',
      '2.0': 'MF42-20-'
    }
  });

  const { data: dashboardData, isLoading } = useQuery(
    'admin-dashboard',
    async () => {
      const response = await api.get('/admin/dashboard');
      return response.data;
    }
  );

  useQuery(
    'serial-config',
    async () => {
      const response = await api.get('/admin/serial-config');
      return response.data;
    },
    {
      onSuccess: (data) => {
        const starting = String(data?.doorSerial?.next || data?.doorSerial?.perSize?.['1.5']?.next || data?.startingSerial || 200);
        setSerialConfig({
          startingSerial: starting,
          prefixes: {
            '1.5': data?.doorSerial?.perSize?.['1.5']?.prefix || 'MF42-15-',
            '1.8': data?.doorSerial?.perSize?.['1.8']?.prefix || 'MF42-18-',
            '2.0': data?.doorSerial?.perSize?.['2.0']?.prefix || 'MF42-20-'
          }
        });
      }
    }
  );

  const saveSerialConfig = async () => {
    try {
      await api.post('/admin/serial-config', {
        startingSerial: Number(serialConfig.startingSerial),
        // keep legacy field populated (still used elsewhere for drawing numbers)
        serialPrefix: 'MUF-S199-RBD',
        doorSerial: {
          padLength: 4,
          perSize: {
            '1.5': { prefix: serialConfig.prefixes['1.5'] },
            '1.8': { prefix: serialConfig.prefixes['1.8'] },
            '2.0': { prefix: serialConfig.prefixes['2.0'] }
          }
        }
      });
      showSuccess('Serial number configuration updated successfully');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update serial configuration');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-sm text-gray-600">
          System administration and management tools.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary-600 rounded-lg p-3">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-600">Total Doors</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.statistics?.totalDoors?.count || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-600 rounded-lg p-3">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-600">Completed Inspections</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.statistics?.completedInspections?.count || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-600 rounded-lg p-3">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.statistics?.activeUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-orange-600 rounded-lg p-3">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-600">Total Inspections</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.statistics?.totalInspections?.count || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Management Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* User Management */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Users</h3>
              <UserGroupIcon className="h-8 w-8 text-primary-500" />
            </div>
            <p className="text-sm text-gray-600 mb-4">Manage system users and their permissions.</p>
            <button
              onClick={() => navigate('/admin/users')}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Manage Users
            </button>
          </div>
        </div>

        {/* Company Settings */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Company</h3>
              <BuildingOfficeIcon className="h-8 w-8 text-indigo-500" />
            </div>
            <p className="text-sm text-gray-600 mb-4">Upload company logos for certificates.</p>
            <button
              onClick={() => navigate('/admin/company-settings')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Company Settings
            </button>
          </div>
        </div>

        {/* Door Types */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Door Types</h3>
              <PhotoIcon className="h-8 w-8 text-teal-500" />
            </div>
            <p className="text-sm text-gray-600 mb-4">Manage door types with technical drawings.</p>
            <button
              onClick={() => navigate('/admin/door-types')}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Manage Door Types
            </button>
          </div>
        </div>

        {/* Purchase Orders */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Purchase Orders</h3>
              <ClipboardDocumentListIcon className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-sm text-gray-600 mb-4">Manage purchase orders and clients.</p>
            <button
              onClick={() => navigate('/admin/purchase-orders')}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              Manage POs
            </button>
          </div>
        </div>
      </div>

      {/* Serial Number Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <HashtagIcon className="h-5 w-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900">Serial Number Configuration</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Configure the starting serial number for new doors.
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Drawing numbers are set per Door Type (Reference Drawing).
            <button
              type="button"
              onClick={() => navigate('/admin/door-types')}
              className="ml-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              Manage Door Types
            </button>
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prefix (1.5m)
              </label>
              <input
                type="text"
                value={serialConfig.prefixes['1.5']}
                onChange={(e) => setSerialConfig({
                  ...serialConfig,
                  prefixes: { ...serialConfig.prefixes, '1.5': e.target.value }
                })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="MF42-15-"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prefix (1.8m)
              </label>
              <input
                type="text"
                value={serialConfig.prefixes['1.8']}
                onChange={(e) => setSerialConfig({
                  ...serialConfig,
                  prefixes: { ...serialConfig.prefixes, '1.8': e.target.value }
                })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="MF42-18-"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prefix (2.0m)
              </label>
              <input
                type="text"
                value={serialConfig.prefixes['2.0']}
                onChange={(e) => setSerialConfig({
                  ...serialConfig,
                  prefixes: { ...serialConfig.prefixes, '2.0': e.target.value }
                })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="MF42-20-"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Starting Number
              </label>
              <input
                type="number"
                min="1"
                value={serialConfig.startingSerial}
                onChange={(e) => setSerialConfig({ ...serialConfig, startingSerial: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="200"
              />
              <p className="mt-1 text-xs text-gray-500">
                Next serials will be: {serialConfig.prefixes['1.5']}{String(serialConfig.startingSerial || '200').padStart(4, '0')} / {serialConfig.prefixes['1.8']}{String(serialConfig.startingSerial || '200').padStart(4, '0')} / {serialConfig.prefixes['2.0']}{String(serialConfig.startingSerial || '200').padStart(4, '0')}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={saveSerialConfig}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="mt-1 text-sm text-gray-600">
            Latest system activities and changes.
          </p>
        </div>
        {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {dashboardData.recentActivity.map((activity, index) => {
              const getColorClass = () => {
                switch (activity.color || activity.type) {
                  case 'blue':
                  case 'inspection_completed':
                    return 'bg-primary-500';
                  case 'green':
                  case 'door_created':
                    return 'bg-green-500';
                  case 'purple':
                  case 'user_action':
                    return 'bg-purple-500';
                  case 'orange':
                  case 'system':
                    return 'bg-orange-500';
                  default:
                    return 'bg-primary-500';
                }
              };

              return (
                <li key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`h-3 w-3 rounded-full ${getColorClass()}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description || 'System activity'}
                        </p>
                        {activity.user && (
                          <span className="text-xs text-gray-500 ml-2">by {activity.user}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No recent activity to display.
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
