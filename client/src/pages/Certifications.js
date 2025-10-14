import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { ShieldCheckIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';

function Certifications() {
  const { user, showSuccess, showError } = useNotification();
  const { user: authUser } = useAuth();
  const [showPending, setShowPending] = useState(false);

  // Fetch all certifications and filter based on user role
  const { data: allCertifications = [], isLoading: isLoadingCertifications, error: certificationsError } = useQuery(
    'completed-certifications',
    async () => {
      console.log('Fetching certifications from API...');
      const response = await api.get('/certifications/my-certificates');
      console.log('Raw API Response:', response);
      console.log('API Response Data:', response.data);
      console.log('Certifications Array:', response.data?.data || response.data);
      console.log('Is Array?', Array.isArray(response.data?.data || response.data));
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
    // TEMPORARY: If no certifications, add a mock one so UI works for admin testing
    if (allCertifications.length === 0 && authUser?.role === 'admin') {
      const now = new Date();
      return [{
        id: 'mock-cert-001',
        door_id: 'mock-door-001',
        engineer_id: 'mock-engineer-001',
        certificate_pdf_path: 'mock-certificate.pdf',
        certified_at: { seconds: Math.floor(now.getTime() / 1000) },
        serial_number: 'MF42-15-Demo',
        description: 'Demo Certified Refuge Bay Door',
        engineer_name: 'Demo Engineer',
        inspector_name: 'Demo Inspector',
        po_number: 'PO-Demo-001',
        signature: 'Demo Signature'
      }];
    }

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
      <div className="px-4 sm:px-6 lg:px-8">
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
    // Don't allow deleting mock data
    if (certId === 'mock-cert-001') {
      showError('Cannot delete mock certificate. This is demo data only.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this certificate? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/certifications/${certId}`);
      showSuccess('Certificate deleted successfully');
      // Refetch certifications
      window.location.reload();
    } catch (error) {
      console.error('Delete error:', error);
      showError(error.response?.data?.message || 'Failed to delete certificate');
    }
  };

  // Handle certificate download
  const handleDownloadCertificate = async (doorId, cert = null) => {
    // For mock data, create a simple demo PDF
    if (doorId === 'mock-door-001' || cert?.id === 'mock-cert-001') {
      try {
        // Create a simple demo PDF content as a blob
        const demoContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 24 Tf
50 700 Td
(Refuge Bay Door Certificate - DEMO) Tj
0 -50 Td
/F1 18 Tf
(Serial Number: MF42-15-Demo) Tj
0 -30 Td
(Description: Demo Certified Refuge Bay Door) Tj
0 -30 Td
(Certificate: Demo Certificate for Testing) Tj
0 -30 Td
(This is a demo certificate for UI testing purposes.) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000574 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
652
%%EOF`;

        const pdfBlob = new Blob([demoContent], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `demo-certificate-MF42-15-Demo.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        showSuccess('Demo certificate PDF downloaded successfully');
        return;
      } catch (error) {
        console.error('Demo PDF creation error:', error);
        showError('Failed to create demo certificate');
        return;
      }
    }

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
      console.error('Download error:', error);
      showError('Failed to download certificate');
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Certificates</h1>
          <p className="mt-2 text-sm text-gray-700">
            {showPending
              ? 'Review and certify completed door inspections.'
              : certifications.find(c => c.id === 'mock-cert-001')
                ? "View and download your certified door certificates. (Demo data shown - certify real doors to see actual certificates)"
                : `View and download your certified door certificates. (${certifications.length} found, ${allCertifications.length} total)`
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
          <div className="overflow-x-auto">
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
                      <div className="text-sm font-medium text-gray-900">
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
                      {showPending ? (
                        cert.certification_status === 'under_review' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Under Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending Review
                          </span>
                        )
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cert.certification_status === 'certified'
                            ? 'bg-green-100 text-green-800'
                            : cert.certification_status === 'under_review'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {cert.certification_status === 'certified'
                            ? 'Certified'
                            : cert.certification_status === 'under_review'
                            ? 'Under Review'
                            : 'Pending Review'
                          }
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {showPending ? (
                        <button
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

export default Certifications;
