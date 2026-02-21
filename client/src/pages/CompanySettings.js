import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  PhotoIcon,
  BuildingOfficeIcon,
  CloudArrowUpIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

function CompanySettings() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [uploading, setUploading] = useState({});

  // Fetch company settings
  const { data: settings, isLoading } = useQuery(
    'company-settings',
    async () => {
      const response = await api.get('/admin/company-settings');
      return response.data;
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    async (data) => {
      const response = await api.put('/admin/company-settings', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('company-settings');
        showSuccess('Settings saved successfully');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to save settings');
      }
    }
  );

  // Logos configuration
  const logos = [
    {
      key: 'spectiv_logo',
      name: 'Spectiv Logo',
      description: 'Your company logo - appears on certificates and reports',
      current: settings?.spectiv_logo
    },
    {
      key: 'client_logo',
      name: 'Client Logo (Manufab/HCC)',
      description: 'Client logo that appears on their certificates',
      current: settings?.client_logo
    },
    {
      key: 'structdesign_logo',
      name: 'Structdesign Logo',
      description: 'Engineering partner logo for certifications',
      current: settings?.structdesign_logo
    }
  ];

  const handleLogoUpload = async (logoKey, file) => {
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      showError('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('File size must be less than 5MB');
      return;
    }

    setUploading(prev => ({ ...prev, [logoKey]: true }));

    try {
      // Upload to Firebase Storage
      const timestamp = Date.now();
      const fileName = `logos/${logoKey}-${timestamp}.jpg`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update settings
      const newSettings = {
        ...settings,
        [logoKey]: downloadURL,
        [`${logoKey}_path`]: fileName
      };
      
      updateSettingsMutation.mutate(newSettings);
    } catch (error) {
      console.error('Upload error:', error);
      showError('Failed to upload logo');
    } finally {
      setUploading(prev => ({ ...prev, [logoKey]: false }));
    }
  };

  const handleRemoveLogo = (logoKey) => {
    const newSettings = { ...settings };
    delete newSettings[logoKey];
    delete newSettings[`${logoKey}_path`];
    updateSettingsMutation.mutate(newSettings);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Company Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage company logos and branding for certificates.
        </p>
      </div>

      {/* Company Logos Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <BuildingOfficeIcon className="h-5 w-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900">Company Logos</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            These logos appear on inspection reports and certificates.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {logos.map((logo) => (
              <div key={logo.key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-1">{logo.name}</h4>
                <p className="text-xs text-gray-500 mb-4">{logo.description}</p>

                {/* Logo Preview */}
                <div className="relative mb-4">
                  {logo.current ? (
                    <div className="relative">
                      <div className="h-32 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                        <img
                          src={logo.current}
                          alt={logo.name}
                          className="max-h-full max-w-full object-contain p-2"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveLogo(logo.key)}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-600 text-white rounded-full hover:bg-red-700 flex items-center justify-center text-xs shadow-lg"
                        title="Remove logo"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-2 right-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                      <PhotoIcon className="h-10 w-10 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">No Logo</span>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <label className="block w-full">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/svg+xml"
                    onChange={(e) => handleLogoUpload(logo.key, e.target.files[0])}
                    className="hidden"
                  />
                  <span className={`block w-full text-center py-2 px-4 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    logo.current 
                      ? 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300' 
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}>
                    {uploading[logo.key] ? (
                      <span className="flex items-center justify-center">
                        <CloudArrowUpIcon className="h-4 w-4 mr-2 animate-pulse" />
                        Uploading...
                      </span>
                    ) : (
                      logo.current ? 'Change Logo' : 'Upload Logo'
                    )}
                  </span>
                </label>

                {/* File requirements */}
                <p className="mt-2 text-xs text-gray-500 text-center">
                  PNG, JPG, or SVG. Max 5MB.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Certificate Preview Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Certificate Preview</h3>
          <p className="mt-1 text-sm text-gray-600">
            How your logos will appear on the final certificate.
          </p>
        </div>

        <div className="p-6">
          <div className="bg-white rounded-lg p-8 max-w-3xl mx-auto border border-gray-200 shadow-sm">
            {/* Certificate Header Preview */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-gray-200">
              <div className="flex items-center space-x-4">
                {settings?.spectiv_logo ? (
                  <img 
                    src={settings.spectiv_logo} 
                    alt="Spectiv" 
                    className="h-16 object-contain"
                  />
                ) : (
                  <div className="h-16 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-sm">
                    Spectiv Logo
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Certificate No:</p>
                    <p className="text-lg font-bold text-gray-900">MF42-XX-XXXX</p>
              </div>
            </div>

            {/* Certificate Body Preview */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                CERTIFICATE OF INSPECTION
              </h2>
              <p className="text-gray-600">
                This certifies that the following refuge bay door has been inspected
              </p>
            </div>

            {/* Door Info Preview */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Serial Number:</span>
                  <p className="font-semibold text-gray-900">MF42-15-XXXX</p>
                </div>
                <div>
                  <span className="text-gray-600">Door Type:</span>
                  <p className="font-semibold text-gray-900">400 kPa V1</p>
                </div>
                <div>
                  <span className="text-gray-600">Client:</span>
                  <p className="font-semibold text-gray-900">Manufab / HCC</p>
                </div>
                <div>
                  <span className="text-gray-600">Date:</span>
                  <p className="font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Logos Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              {settings?.structdesign_logo ? (
                <img 
                  src={settings.structdesign_logo} 
                  alt="Structdesign" 
                  className="h-12 object-contain"
                />
              ) : (
                <div className="h-12 w-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                  Structdesign
                </div>
              )}

              {settings?.client_logo ? (
                <img 
                  src={settings.client_logo} 
                  alt="Client" 
                  className="h-12 object-contain"
                />
              ) : (
                <div className="h-12 w-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                  Client Logo
                </div>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              This is a preview. Actual certificate may vary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanySettings;
