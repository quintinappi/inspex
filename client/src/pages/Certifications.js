import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

function Certifications() {
  const { showSuccess, showError } = useNotification();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPending, setShowPending] = useState(false);

  // Fetch all certifications and filter based on user role
  const { data: allCertifications = [], isLoading: isLoadingCertifications, error: certificationsError } = useQuery(
    'completed-certifications',
    async () => {
      const response = await api.get('/certifications/my-certificates');
      // The backend API returns the array directly
      return response.data?.data || response.data;
    },
    {
      enabled: !!authUser,
      retry: 1
    }
  );

  // Backend now handles filtering by user role, so we just use the data directly
  const certifications = React.useMemo(() => {
    return allCertifications;
  }, [allCertifications, authUser]);

  // Fetch pending certifications for admin/engineers (if they want to review pending ones)
  const { data: pendingCertifications = [], isLoading: isLoadingPending } = useQuery(
    'pending-certifications',
    async () => {
      const response = await api.get('/certifications/pending');
      return response.data?.data || response.data;
    },
    {
      enabled: showPending && !!authUser && ['admin', 'engineer'].includes(authUser.role),
      retry: 1
    }
  );

  if ((isLoadingCertifications && !showPending) || (isLoadingPending && showPending)) {
    return <LoadingSpinner />;
  }

  if ((!showPending && certificationsError) || (showPending && !pendingCertifications)) {
    return (
      <div>
        <div className="text-center py-12">
          <div className="text-red-600">Error loading certifications</div>
          <p className="text-xs text-gray-500 mt-1">
            {certificationsError?.response?.data?.message || certificationsError?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const data = showPending ? pendingCertifications : certifications;
  const error = showPending ? null : certificationsError; // Pending doesn't show error state

  // Handle certificate delete
  const handleDeleteCertificate = async (certId) => {
    if (!window.confirm('Are you sure you want to delete this certificate? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/certifications/${certId}`);
      showSuccess('Certificate deleted successfully');
      queryClient.invalidateQueries('completed-certifications');
      queryClient.invalidateQueries('pending-certifications');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete certificate');
    }
  };

  // Handle certificate download
  const handleDownloadCertificate = async (doorId, cert = null) => {
    // For real certifications, call the API
    try {
      const response = await api.get(`/certifications/download/${doorId}`, {
        responseType: 'blob' // Important for file downloads
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${doorId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSuccess('Certificate downloaded successfully');
    } catch (error) {
      showError('Failed to download certificate');
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Certificates</h1>
          <p className="mt-2 text-sm text-gray-700">
            {showPending
              ? 'Review and certify completed door inspections.'
              : `View and download your certified door certificates. (${certifications.length} found)`
            }
          </p>
        </div>
        {authUser && ['admin', 'engineer'].includes(authUser.role) && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <div className="flex items-center space-x-2">
              <label htmlFor="pending-toggle" className="text-sm text-gray-700">
                Show pending reviews
              </label>
              <input
                id="pending-toggle"
                type="checkbox"
                checked={showPending}
                onChange={(e) => setShowPending(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        {data?.length > 0 ? (
          <div className="shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg overflow-hidden">
            {/* Mobile View (Cards) */}
            <div className="block sm:hidden bg-white divide-y divide-gray-200">
              {data.map((cert) => (
                <div key={cert.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-gray-900 font-mono">
                      {cert.serial_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {cert.po_number ? `PO: ${cert.po_number}` : '-'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    {cert.description || 'No description'}
                  </div>
                  {!showPending && (
                    <div className="text-sm text-gray-500 mb-1">
                      Certified: {new Date(cert.certified_at).toLocaleDateString()}
                    </div>
                  )}
                  {showPending && (
                    <div className="text-sm text-gray-500 mb-1">
                      Inspected: {new Date(cert.inspection_date).toLocaleDateString()}
                    </div>
                  )}
                  <div className="mb-4">
                    <StatusBadge status={cert.certification_status || 'pending'} />
                  </div>
                  <div className="flex flex-col space-y-2">
                    {showPending ? (
                      <button
                        onClick={() => navigate(`/certifications/${cert.id}`)}
                        className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Review
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleDownloadCertificate(cert.id, cert)}
                          className="w-full inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <PhotoIcon className="w-4 h-4 mr-2" />
                          Download PDF
                        </button>
                        {authUser?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Door Serial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    {!showPending && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Certification Date
                      </th>
                    )}
                    {showPending && authUser?.role !== 'engineer' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inspector
                      </th>
                    )}
                    {showPending && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inspection Date
                      </th>
                    )}
                    {!showPending && authUser?.role !== 'engineer' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Engineer
                      </th>
                    )}
                    {((authUser?.role === 'inspector' || authUser?.role === 'client') && !showPending) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inspector
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((cert) => (
                    <tr key={cert.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {cert.serial_number}
                        </div>
                        {cert.po_number && (
                          <div className="text-xs text-gray-400">
                            PO: {cert.po_number}
                          </div>
                        )}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cert.description}
                    </td>
                    {!showPending && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(cert.certified_at).toLocaleDateString('en-ZA')}
                      </td>
                    )}
                    {showPending && authUser?.role !== 'engineer' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cert.inspector_name}
                      </td>
                    )}
                    {showPending && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cert.inspection_date ? new Date(cert.inspection_date).toLocaleDateString() : 'N/A'}
                      </td>
                    )}
                    {!showPending && authUser?.role !== 'engineer' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cert.engineer_name}
                      </td>
                    )}
                    {((authUser?.role === 'inspector' || authUser?.role === 'client') && !showPending) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cert.inspector_name || 'N/A'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={cert.certification_status || 'pending'} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {showPending ? (
                        <button
                          onClick={() => navigate(`/certifications/${cert.id}`)}
                          className="text-primary-600 hover:text-primary-900 focus:outline-none focus:underline"
                        >
                          Review
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleDownloadCertificate(cert.door_id)}
                            className="text-primary-600 hover:text-primary-900 focus:outline-none focus:underline"
                          >
                            Download PDF
                          </button>
                          {authUser?.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteCertificate(cert.id)}
                              className="text-red-600 hover:text-red-900 focus:outline-none"
                              title="Delete certificate"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          <div className="text-center py-12">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {showPending ? 'No pending certifications' : 'No certificates available'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {showPending
                ? 'All inspections have been certified or no inspections are ready for certification.'
                : authUser?.role === 'admin'
                ? 'No doors have been certified yet.'
                : authUser?.role === 'engineer'
                ? 'You haven\'t certified any doors yet.'
                : authUser?.role === 'inspector'
                ? 'No certificates available for the doors you inspected.'
                : 'No certificates available.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
    under_review: { label: 'Under Review', color: 'bg-orange-100 text-orange-800' },
    certified: { label: 'Certified', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export default Certifications;
