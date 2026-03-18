import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { EnvelopeIcon, PaperAirplaneIcon, PhotoIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

function Certifications() {
  const { showSuccess, showError } = useNotification();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPending, setShowPending] = useState(false);
  const canManageMailing = !!authUser && ['admin', 'engineer'].includes(authUser.role);
  const [mailingModalOpen, setMailingModalOpen] = useState(false);
  const [mailingModalLoading, setMailingModalLoading] = useState(false);
  const [mailingModalSaving, setMailingModalSaving] = useState(false);
  const [mailingModalError, setMailingModalError] = useState('');
  const [selectedMailingCertificate, setSelectedMailingCertificate] = useState(null);
  const [mailingDetails, setMailingDetails] = useState(null);
  const [mailingEmail, setMailingEmail] = useState('');

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

  const closeMailingModal = () => {
    setMailingModalOpen(false);
    setMailingModalLoading(false);
    setMailingModalSaving(false);
    setMailingModalError('');
    setSelectedMailingCertificate(null);
    setMailingDetails(null);
    setMailingEmail('');
  };

  const handleOpenMailingModal = async (cert) => {
    if (!canManageMailing) {
      return;
    }

    if (!cert?.po_number) {
      showError('This certificate is not linked to a purchase order yet.');
      return;
    }

    setSelectedMailingCertificate(cert);
    setMailingDetails(null);
    setMailingEmail('');
    setMailingModalError('');
    setMailingModalLoading(true);
    setMailingModalOpen(true);

    try {
      const response = await api.get(`/certifications/mailing/${cert.id}`);
      const details = response.data?.data || response.data;
      setMailingDetails(details);
      setMailingEmail(details?.client_email || '');
    } catch (error) {
      setMailingModalError(error.response?.data?.message || 'Failed to load certificate mailing details');
    } finally {
      setMailingModalLoading(false);
    }
  };

  const handleSaveMailingEmail = async () => {
    const email = mailingEmail.trim();
    if (!email) {
      showError('Please enter a client email address');
      return;
    }

    if (!selectedMailingCertificate) {
      showError('No certificate selected');
      return;
    }

    setMailingModalSaving(true);
    try {
      const response = await api.put(`/certifications/mailing/${selectedMailingCertificate.id}`, {
        client_email: email
      });

      const result = response.data?.data || response.data;
      setMailingDetails((current) => ({
        ...(current || {}),
        client_email: result?.client_email || email
      }));

      showSuccess('Mailing email saved to the purchase order');
      queryClient.invalidateQueries('purchase-orders');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to save mailing email');
    } finally {
      setMailingModalSaving(false);
    }
  };

  const handleSendMailingPdf = async () => {
    const email = (mailingEmail.trim() || mailingDetails?.client_email || '').trim();

    if (!email) {
      showError('Please enter a client email address');
      return;
    }

    if (!selectedMailingCertificate) {
      showError('No certificate selected');
      return;
    }

    setMailingModalSaving(true);
    try {
      const response = await api.post(`/certifications/mailing/${selectedMailingCertificate.id}/send`, {
        client_email: mailingEmail.trim() || undefined
      });

      const result = response.data?.data || response.data;
      const savedEmail = result?.client_email || email;

      setMailingDetails((current) => ({
        ...(current || {}),
        client_email: savedEmail
      }));
      setMailingEmail(savedEmail);

      showSuccess('Certificate PDF emailed successfully');
      queryClient.invalidateQueries('purchase-orders');
      closeMailingModal();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to send certificate PDF');
    } finally {
      setMailingModalSaving(false);
    }
  };

  const mailingRecipientEmail = (mailingEmail.trim() || mailingDetails?.client_email || '').trim();
  const canSendMailingPdf = Boolean(mailingDetails?.po_id && mailingRecipientEmail);

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
                        {canManageMailing && (
                          <button
                            onClick={() => handleOpenMailingModal(cert)}
                            disabled={!cert.po_number}
                            title={cert.po_number ? 'Manage certificate mailing email' : 'No purchase order linked'}
                            className={`w-full inline-flex justify-center items-center px-3 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${cert.po_number ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100' : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'}`}
                          >
                            <EnvelopeIcon className="w-4 h-4 mr-2" />
                            Mailing Email
                          </button>
                        )}
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
                          {canManageMailing && (
                            <button
                              onClick={() => handleOpenMailingModal(cert)}
                              disabled={!cert.po_number}
                              title={cert.po_number ? 'Manage certificate mailing email' : 'No purchase order linked'}
                              className={`inline-flex items-center focus:outline-none ${cert.po_number ? 'text-amber-600 hover:text-amber-900' : 'text-gray-400 cursor-not-allowed'}`}
                            >
                              <EnvelopeIcon className="h-5 w-5" />
                            </button>
                          )}
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

      {mailingModalOpen && (
        <div className="fixed z-20 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                if (!mailingModalSaving) {
                  closeMailingModal();
                }
              }}
            />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Certificate Mailing Email</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This address is stored on the linked purchase order and used for certificate mailings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeMailingModal}
                  disabled={mailingModalSaving}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  aria-label="Close mailing dialog"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {mailingModalLoading ? (
                <LoadingSpinner size="small" text="Loading mailing details..." />
              ) : mailingModalError ? (
                <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                  {mailingModalError}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-700 space-y-1">
                    <p>
                      <span className="font-medium text-gray-900">Certificate:</span>{' '}
                      {selectedMailingCertificate?.serial_number || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">PO Number:</span>{' '}
                      {mailingDetails?.po_number || selectedMailingCertificate?.po_number || 'N/A'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Client Name:</span>{' '}
                      {mailingDetails?.client_name || 'N/A'}
                    </p>
                  </div>

                  {mailingDetails?.po_id ? (
                    <>
                      <div>
                        <label htmlFor="mailing-email" className="block text-sm font-medium text-gray-700">
                          Client Email
                        </label>
                        <input
                          id="mailing-email"
                          type="email"
                          value={mailingEmail}
                          onChange={(e) => setMailingEmail(e.target.value)}
                          placeholder="Enter client email"
                          className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Saving this will update the purchase order so future certificates use the same address.
                        </p>
                      </div>

                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-3 sm:gap-3">
                        <button
                          type="button"
                          onClick={closeMailingModal}
                          disabled={mailingModalSaving}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:text-sm disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveMailingEmail}
                          disabled={mailingModalSaving}
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm disabled:opacity-50"
                        >
                          {mailingModalSaving ? 'Saving...' : 'Save Email'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendMailingPdf}
                          disabled={mailingModalSaving || !canSendMailingPdf}
                          className="w-full inline-flex justify-center items-center rounded-md border border-emerald-300 shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:text-sm disabled:opacity-50"
                        >
                          <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                          Send PDF
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
                      This certificate is not linked to a purchase order yet, so there is nowhere to store the mailing email.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
