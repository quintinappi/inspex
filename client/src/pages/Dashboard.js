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
  ExclamationTriangleIcon,
  UserGroupIcon,
  DocumentTextIcon
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
      enabled: user?.role === 'inspector' || user?.role === 'admin' || user?.role === 'engineer'
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

  const { data: users } = useQuery(
    'users-for-dashboard',
    async () => {
      const response = await api.get('/users');
      return response.data;
    },
    {
      enabled: user?.role === 'admin'
    }
  );

  if (isLoading && user?.role === 'admin') {
    return <LoadingSpinner />;
  }

  const stats = dashboardData?.statistics || {};
  const recentDoors = dashboardData?.recentDoors || doors?.slice(0, 5) || [];

  // Calculate role-specific stats
  const pendingInspections = doors?.filter(d => d.inspection_status === 'pending') || [];
  const inProgressInspections = inspections?.filter(i => i.status === 'in_progress') || [];
  const myInspections = inspections?.filter(i => i.inspector_id === user?.id) || [];
  const myPendingCerts = pendingCertifications?.filter(d => d.certification_status === 'pending') || [];

  return (
    <div>
      {/* Welcome Header */}
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome, {user?.name}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {user?.role === 'admin' && 'System Administrator - Full access to all features'}
            {user?.role === 'inspector' && 'Inspector - Manage inspections and door checks'}
            {user?.role === 'engineer' && 'Engineer - Review and certify door inspections'}
            {user?.role === 'client' && 'Client - View your doors and download certificates'}
          </p>
        </div>
      </div>

      {/* Role-based Stats */}
      {user?.role === 'admin' && (
        <AdminStats 
          stats={stats} 
          users={users} 
          doors={doors}
          pendingInspections={pendingInspections}
          pendingCertifications={myPendingCerts}
        />
      )}
      
      {user?.role === 'inspector' && (
        <InspectorStats 
          pendingCount={pendingInspections.length}
          inProgressCount={inProgressInspections.length}
          myInspectionsCount={myInspections.length}
        />
      )}
      
      {user?.role === 'engineer' && (
        <EngineerStats 
          pendingCertificationsCount={myPendingCerts.length}
          totalDoors={doors?.length || 0}
          certifiedCount={doors?.filter(d => d.certification_status === 'certified').length || 0}
        />
      )}
      
      {user?.role === 'client' && (
        <ClientStats 
          myDoors={doors?.filter(d => d.client_email === user?.email) || []}
        />
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {user?.role === 'admin' && (
                <>
                  <Link
                    to="/admin/users"
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    Manage Users
                  </Link>
                  <Link
                    to="/admin/purchase-orders"
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Purchase Orders
                  </Link>
                  <Link
                    to="/admin"
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Admin Panel
                  </Link>
                </>
              )}

              {user?.role === 'engineer' && (
                <>
                  <Link
                    to="/certifications"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                    Review Certifications
                  </Link>
                  <Link
                    to="/profile"
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Upload Signature
                  </Link>
                </>
              )}

              {user?.role === 'inspector' && (
                <>
                  <Link
                    to="/inspections"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <ClipboardDocumentCheckIcon className="h-4 w-4 mr-2" />
                    Start Inspection
                  </Link>
                </>
              )}

              {user?.role === 'client' && (
                <>
                  <Link
                    to="/certifications"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                    My Certificates
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900">
              {user?.role === 'client' ? 'My Doors' : 'Recent Doors'}
            </h3>
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

      {/* Engineer-specific sections */}
      {user?.role === 'engineer' && (
        <EngineerSections 
          pendingCertifications={myPendingCerts}
        />
      )}

      {/* Inspector-specific sections */}
      {user?.role === 'inspector' && (
        <InspectorSections 
          pendingInspections={pendingInspections}
          inProgressInspections={inProgressInspections}
        />
      )}
    </div>
  );
}

// Admin Stats Component
function AdminStats({ stats, users, doors, pendingInspections, pendingCertifications }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Doors"
        value={doors?.length || 0}
        icon={CubeIcon}
        color="blue"
      />
      <StatCard
        title="Pending Inspections"
        value={pendingInspections?.length || 0}
        icon={ClockIcon}
        color="yellow"
      />
      <StatCard
        title="Pending Certifications"
        value={pendingCertifications?.length || 0}
        icon={ExclamationTriangleIcon}
        color="orange"
      />
      <StatCard
        title="Active Users"
        value={users?.filter(u => u.status === 'active').length || 0}
        icon={UserGroupIcon}
        color="green"
      />
    </div>
  );
}

// Inspector Stats Component
function InspectorStats({ pendingCount, inProgressCount, myInspectionsCount }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
      <StatCard
        title="Pending Inspections"
        value={pendingCount}
        icon={ClockIcon}
        color="yellow"
      />
      <StatCard
        title="In Progress"
        value={inProgressCount}
        icon={ClipboardDocumentCheckIcon}
        color="blue"
      />
      <StatCard
        title="My Inspections"
        value={myInspectionsCount}
        icon={CheckCircleIcon}
        color="green"
      />
    </div>
  );
}

// Engineer Stats Component
function EngineerStats({ pendingCertificationsCount, totalDoors, certifiedCount }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
      <StatCard
        title="Pending Certifications"
        value={pendingCertificationsCount}
        icon={ExclamationTriangleIcon}
        color="orange"
      />
      <StatCard
        title="Total Doors"
        value={totalDoors}
        icon={CubeIcon}
        color="blue"
      />
      <StatCard
        title="Certified"
        value={certifiedCount}
        icon={ShieldCheckIcon}
        color="green"
      />
    </div>
  );
}

// Client Stats Component
function ClientStats({ myDoors }) {
  const pendingCerts = myDoors.filter(d => d.certification_status === 'pending');
  const certified = myDoors.filter(d => d.certification_status === 'certified');
  
  return (
    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
      <StatCard
        title="My Doors"
        value={myDoors.length}
        icon={CubeIcon}
        color="blue"
      />
      <StatCard
        title="Pending Certificates"
        value={pendingCerts.length}
        icon={ClockIcon}
        color="yellow"
      />
      <StatCard
        title="Available Certificates"
        value={certified.length}
        icon={ShieldCheckIcon}
        color="green"
      />
    </div>
  );
}

// Engineer-specific sections
function EngineerSections({ pendingCertifications }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Pending Certifications */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Pending Certifications</h3>
          <p className="mt-1 text-sm text-gray-500">
            Doors with completed inspections awaiting your certification
          </p>
          <div className="mt-6">
            {pendingCertifications && pendingCertifications.length > 0 ? (
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
              <div className="text-sm text-gray-500">
                <p>No doors ready for certification.</p>
                <p className="mt-2 text-xs">
                  Doors will appear here after inspectors complete their inspections.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tip for engineers */}
      <div className="bg-blue-50 overflow-hidden shadow rounded-lg border border-blue-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-blue-900">Engineer Tip</h3>
          <div className="mt-4 text-sm text-blue-800 space-y-2">
            <p>
              <strong>Before certifying doors:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Upload your digital signature in your Profile</li>
              <li>Review all inspection points thoroughly</li>
              <li>Verify photos match the inspection criteria</li>
              <li>Your signature will appear on the certificate PDF</li>
            </ul>
            <Link
              to="/profile"
              className="inline-block mt-4 text-primary-600 hover:text-primary-500 font-medium"
            >
              Go to Profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inspector-specific sections
function InspectorSections({ pendingInspections, inProgressInspections }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Pending Inspections */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Ready for Inspection</h3>
          <p className="mt-1 text-sm text-gray-500">
            Doors waiting to be inspected
          </p>
          <div className="mt-6">
            {pendingInspections && pendingInspections.length > 0 ? (
              <div className="space-y-3">
                {pendingInspections.slice(0, 5).map((door) => (
                  <div key={door.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{door.serial_number}</p>
                      <p className="text-sm text-gray-500">{door.description}</p>
                    </div>
                    <Link
                      to="/inspections"
                      className="text-sm text-primary-600 hover:text-primary-500"
                    >
                      Start →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                <p>No pending inspections.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In Progress */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">In Progress</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your active inspections
          </p>
          <div className="mt-6">
            {inProgressInspections && inProgressInspections.length > 0 ? (
              <div className="space-y-3">
                {inProgressInspections.slice(0, 5).map((inspection) => (
                  <div key={inspection.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inspection.serial_number}</p>
                      <p className="text-sm text-gray-500">
                        Progress: {inspection.completed_checks}/{inspection.total_checks} checks
                      </p>
                    </div>
                    <Link
                      to={`/inspections/${inspection.id}`}
                      className="text-sm text-primary-600 hover:text-primary-500"
                    >
                      Continue →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                <p>No active inspections.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-md ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-2xl font-bold text-gray-900">{value}</dd>
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
