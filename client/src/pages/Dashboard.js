import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  CubeIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

function Dashboard() {
  const { user } = useAuth();

  const { data: dashboardData, isLoading } = useQuery(
    'dashboard',
    async () => {
      const response = await api.get('/admin/dashboard');
      return response.data;
    },
    {
      enabled: user?.role === 'admin'
    }
  );

  const { data: doors } = useQuery('doors', async () => {
    const response = await api.get('/doors');
    return response.data;
  });

  const { data: inspections } = useQuery(
    'inspections',
    async () => {
      const response = await api.get('/inspections');
      return response.data;
    },
    {
      enabled: user?.role === 'inspector' || user?.role === 'admin'
    }
  );

  const { data: pendingCertifications } = useQuery(
    'pending-certifications',
    async () => {
      const response = await api.get('/certifications/pending');
      return response.data;
    },
    {
      enabled: user?.role === 'engineer' || user?.role === 'admin'
    }
  );

  if (isLoading && user?.role === 'admin') {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <LoadingSpinner />
      </div>
    );
  }

  const stats = dashboardData?.statistics || {};
  const recentDoors = dashboardData?.recentDoors || doors?.slice(0, 5) || [];
  const recentInspections = dashboardData?.recentInspections || inspections?.slice(0, 5) || [];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Welcome back, {user?.name}. Here's an overview of your refuge bay door inspections.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      {user?.role === 'admin' && (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Doors"
            value={stats.totalDoors?.count || 0}
            icon={CubeIcon}
            color="blue"
          />
          <StatCard
            title="Pending Inspections"
            value={stats.pendingInspections?.count || 0}
            icon={ClockIcon}
            color="yellow"
          />
          <StatCard
            title="Completed Inspections"
            value={stats.completedInspections?.count || 0}
            icon={CheckCircleIcon}
            color="green"
          />
          <StatCard
            title="Pending Certifications"
            value={stats.pendingCertifications?.count || 0}
            icon={ExclamationTriangleIcon}
            color="orange"
          />
          <StatCard
            title="Certified Doors"
            value={stats.certifiedDoors?.count || 0}
            icon={ShieldCheckIcon}
            color="green"
          />
          <StatCard
            title="In Progress"
            value={stats.inProgressInspections?.count || 0}
            icon={ClipboardDocumentCheckIcon}
            color="blue"
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link
                to="/doors/add"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Add New Door
              </Link>
              
              {user?.role === 'inspector' && (
                <Link
                  to="/inspections"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Start Inspection
                </Link>
              )}
              
              {user?.role === 'engineer' && (
                <Link
                  to="/certifications"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Review Certifications
                </Link>
              )}
              
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Admin Panel
                </Link>
              )}

              {user?.role === 'client' && (
                <Link
                  to="/downloads"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Download Certificates
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900">Recent Doors</h3>
            <div className="mt-6">
              {recentDoors.length > 0 ? (
                <div className="space-y-3">
                  {recentDoors.slice(0, 5).map((door) => (
                    <div key={door.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{door.serial_number}</p>
                        <p className="text-sm text-gray-500">{door.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={door.inspection_status} />
                      </div>
                    </div>
                  ))}
                  <Link
                    to="/doors"
                    className="block text-sm text-primary-600 hover:text-primary-500"
                  >
                    View all doors →
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No doors found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific sections */}
      {user?.role === 'engineer' && pendingCertifications && (
        <div className="mt-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">Pending Certifications</h3>
              <div className="mt-6">
                {pendingCertifications.length > 0 ? (
                  <div className="space-y-3">
                    {pendingCertifications.slice(0, 5).map((door) => (
                      <div key={door.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{door.serial_number}</p>
                          <p className="text-sm text-gray-500">
                            Inspected by: {door.inspector_name}
                          </p>
                        </div>
                        <Link
                          to={`/certifications/${door.id}`}
                          className="text-sm text-primary-600 hover:text-primary-500"
                        >
                          Review →
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No pending certifications</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    orange: 'text-orange-600 bg-orange-100',
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
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
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export default Dashboard;