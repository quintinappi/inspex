import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';
import { PhotoIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

function Profile() {
  const { user, changePassword } = useAuth();
  const { showSuccess, showError } = useNotification();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [selectedSignatureFile, setSelectedSignatureFile] = useState(null);
  const [userSignature, setUserSignature] = useState(user?.signature_url || null);



  // Signature upload mutation
  const uploadSignatureMutation = useMutation(
    async (signatureData) => {
      const formData = new FormData();
      formData.append('signature', signatureData.file);
      const response = await api.post(`/users/${user.id}/signature`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        showSuccess('Signature uploaded successfully');
        setSelectedSignatureFile(null);
        setUserSignature(data.signatureUrl); // Update with real URL from backend
        queryClient.invalidateQueries(['user-signature', user.id]);
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to upload signature');
      }
    }
  );

  // Signature delete mutation
  const deleteSignatureMutation = useMutation(
    async () => {
      const response = await api.delete(`/users/${user.id}/signature`);
      return response.data;
    },
    {
      onSuccess: () => {
        showSuccess('Signature deleted successfully');
        setUserSignature(null);
        queryClient.invalidateQueries(['user-signature', user.id]);
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to delete signature');
      }
    }
  );

  // Handle signature file change
  const handleSignatureFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Only image files are allowed');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB');
        return;
      }

      setSelectedSignatureFile(file);
    }
  };

  // Handle signature upload
  const handleSignatureUpload = async () => {
    if (!selectedSignatureFile) {
      showError('Please select a signature file to upload');
      return;
    }

    // Call actual API to upload to Firebase Storage
    uploadSignatureMutation.mutate({ file: selectedSignatureFile });
  };

  // Handle signature delete
  const handleSignatureDelete = () => {
    if (window.confirm('Are you sure you want to delete your signature?')) {
      deleteSignatureMutation.mutate();
    }
  };

  // Update user signature state when user changes
  React.useEffect(() => {
    setUserSignature(user?.signature_url || null);
  }, [user?.signature_url]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Profile update functionality will be added later
    showError('Profile editing not yet implemented');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({
      ...passwordForm,
      [name]: value
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showError('New password must be at least 8 characters long');
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);

      if (result.success) {
        showSuccess('Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showError(result.error || 'Failed to change password');
      }
    } catch (error) {
      showError('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };



  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your account information and preferences.
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-md">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Account Information
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Your personal details and account settings.
            </p>
          </div>
          <div className="border-t border-gray-200">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-4 py-5 sm:p-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Full name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Email address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Role</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{user.role}</dd>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Member since</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Section */}
        <div className="mt-8 max-w-md">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Change Password
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Update your password to keep your account secure.
              </p>
            </div>
            <div className="border-t border-gray-200">
              <form onSubmit={handlePasswordSubmit} className="px-4 py-5 sm:p-6 space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    id="currentPassword"
                    required
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    id="newPassword"
                    required
                    minLength="8"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="mt-8 max-w-md">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Signature
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Upload your signature to be used on certificates.
              </p>
            </div>
            <div className="border-t border-gray-200">
              <div className="px-4 py-6 sm:px-6">
                {/* Current Signature Display */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-shrink-0">
                    {userSignature ? (
                      <div className="relative">
                        <img
                          src={userSignature}
                          alt="User Signature"
                          className="h-16 w-32 object-contain border border-gray-300 rounded-md bg-white"
                        />
                        <button
                          onClick={handleSignatureDelete}
                          className="absolute -top-2 -right-2 h-5 w-5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-xs"
                          title="Delete signature"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                          <PhotoIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">No signature</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {userSignature ? 'Current signature' : 'No signature uploaded'}
                  </div>
                </div>

                {/* Upload New Signature */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Upload New Signature
                    </label>
                    <div className="mt-1 flex items-center space-x-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <button
                        type="button"
                        onClick={handleSignatureUpload}
                        disabled={!selectedSignatureFile || uploadSignatureMutation.isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {uploadSignatureMutation.isLoading ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      PNG, JPG, or SVG. Max file size: 5MB. Recommended: transparent background.
                    </p>
                  </div>

                  {selectedSignatureFile && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <img
                            src={URL.createObjectURL(selectedSignatureFile)}
                            alt="Selected signature preview"
                            className="h-8 w-16 object-contain border border-blue-300 rounded bg-white"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <p className="font-medium text-blue-800">
                            {selectedSignatureFile.name}
                          </p>
                          <p className="text-blue-600">
                            {(selectedSignatureFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}

export default Profile;
