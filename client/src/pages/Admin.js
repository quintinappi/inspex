import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { CogIcon, UserGroupIcon, ClipboardDocumentListIcon, HashtagIcon, BuildingOfficeIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../context/NotificationContext';

function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'inspector',
    company: '',
    phone: '',
    status: 'active'
  });
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [serialConfig, setSerialConfig] = useState({
    startingSerial: '',
    serialPrefix: 'MUF-S199-RBD'
  });
  const [companySettings, setCompanySettings] = useState({
    logo_url: null,
    logo_storage_path: null
  });
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);

  const { data: dashboardData, isLoading, error } = useQuery(
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
        if (data) {
          setSerialConfig({
            startingSerial: data.startingSerial || '',
            serialPrefix: data.serialPrefix || 'MUF-S199-RBD'
          });
        }
      }
    }
  );

  useQuery(
    'company-settings',
    async () => {
      const response = await api.get('/admin/company-settings');
      return response.data;
    },
    {
      onSuccess: (data) => {
        console.log('Company settings query response:', JSON.stringify(data, null, 2));
        if (data) {
          setCompanySettings({
            logo_url: data.logo_url || null,
            logo_storage_path: data.logo_storage_path || null
          });
          console.log('Set company settings to:', {
            logo_url: data.logo_url || null,
            logo_storage_path: data.logo_storage_path || null
          });
        }
      },
      retry: false
    }
  );

  const { data: usersData, isLoading: usersLoading } = useQuery(
    'users',
    async () => {
      const response = await api.get('/users');
      return response; // Return full response object, not just .data
    },
    {
      enabled: showUserManagement
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

  const createUserMutation = useMutation(
    async (userData) => {
      const response = await api.post('/users', userData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setShowAddUser(false);
        setUserForm({ name: '', email: '', password: '', role: 'inspector', company: '', phone: '', status: 'active' });
        showSuccess('User created successfully in both Firestore and Firebase Auth!');
      },
      onError: (error) => {
        showError(error.response?.data?.message || error.message || 'Failed to create user');
      }
    }
  );

  const updateUserMutation = useMutation(
    async ({ id, data }) => {
      const response = await api.put(`/users/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setEditingUser(null);
        setUserForm({ name: '', email: '', password: '', role: 'inspector', company: '', phone: '', status: 'active' });
        showSuccess('User updated successfully');
      },
      onError: (error) => {
        showError(error.response?.data?.message || error.message || 'Failed to update user');
      }
    }
  );

  const deleteUserMutation = useMutation(
    async (userId) => {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        showSuccess('User deleted from both Firestore and Firebase Auth');
      },
      onError: (error) => {
        showError(error.response?.data?.message || error.message || 'Failed to delete user');
      }
    }
  );

  const resetPasswordMutation = useMutation(
    async ({ userId, newPassword }) => {
      const response = await api.post(`/users/${userId}/reset-password`, { newPassword });
      return response.data;
    },
    {
      onSuccess: () => {
        setShowPasswordReset(false);
        setPasswordResetUser(null);
        setNewPassword('');
        showSuccess('Password reset successfully');
      },
      onError: (error) => {
        showError(error.response?.data?.message || error.message || 'Failed to reset password');
      }
    }
  );

  const uploadLogoMutation = useMutation(
    async (logoData) => {
      // Upload directly to Firebase Storage
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storage = getStorage();
      const filename = `logos/${Date.now()}-${logoData.file.name}`;
      const storageRef = ref(storage, filename);

      // Upload file
      await uploadBytes(storageRef, logoData.file);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Save URL to backend
      const response = await api.put('/admin/company-settings', {
        logo_url: downloadURL,
        logo_storage_path: filename
      });

      return response.data;
    },
    {
      onSuccess: (data) => {
        showSuccess('Logo uploaded successfully');
        setSelectedLogoFile(null);

        setCompanySettings({
          logo_url: data.settings?.logo_url || data.logo_url,
          logo_storage_path: data.settings?.logo_storage_path || data.logo_storage_path
        });

        queryClient.invalidateQueries('company-settings');
      },
      onError: (error) => {
        console.error('Logo upload error:', error);
        showError(error.response?.data?.message || error.message || 'Failed to upload logo');
      }
    }
  );

  const handleSerialConfigSubmit = (e) => {
    e.preventDefault();
    updateSerialConfigMutation.mutate(serialConfig);
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: userForm });
    } else {
      createUserMutation.mutate(userForm);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'inspector',
      company: user.company || '',
      phone: user.phone || '',
      status: user.status || 'active'
    });
    setShowAddUser(true);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const resetUserForm = () => {
    setUserForm({ name: '', email: '', password: '', role: 'inspector', company: '', phone: '', status: 'active' });
    setEditingUser(null);
    setShowAddUser(false);
  };

  const handleResetPassword = (user) => {
    setPasswordResetUser(user);
    setNewPassword('');
    setShowPasswordReset(true);
  };

  const handlePasswordResetSubmit = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
    resetPasswordMutation.mutate({ userId: passwordResetUser.id, newPassword });
  };

  const handleUploadLogo = async () => {
    if (!selectedLogoFile) {
      showError('Please select a logo file to upload');
      return;
    }

    if (selectedLogoFile.size > 2 * 1024 * 1024) {
      showError('File size must be less than 2MB');
      return;
    }

    uploadLogoMutation.mutate({ file: selectedLogoFile });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading admin dashboard</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-2 text-sm text-gray-600">
            System administration and management tools.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Doors</dt>
                    <dd className="text-2xl font-bold text-gray-900">{dashboardData?.statistics?.totalDoors?.count || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed Inspections</dt>
                    <dd className="text-2xl font-bold text-gray-900">{dashboardData?.statistics?.completedInspections?.count || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-2xl font-bold text-gray-900">{dashboardData?.statistics?.activeUsers || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Inspections</dt>
                    <dd className="text-2xl font-bold text-gray-900">{dashboardData?.statistics?.totalInspections?.count || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* User Management */}
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Users</h3>
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600 mb-4">Manage system users and their permissions.</p>
              <button
                onClick={() => setShowUserManagement(!showUserManagement)}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {showUserManagement ? 'Hide Users' : 'Manage Users'}
              </button>
            </div>
          </div>

          {/* Company Settings */}
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Company</h3>
                <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <p className="text-sm text-gray-600 mb-4">Upload company logo for certificates.</p>
              <button
                onClick={() => setShowCompanySettings(!showCompanySettings)}
                className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                {showCompanySettings ? 'Hide Settings' : 'Company Settings'}
              </button>
            </div>
          </div>

          {/* Door Types */}
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Door Types</h3>
                <PhotoIcon className="h-8 w-8 text-teal-600" />
              </div>
              <p className="text-sm text-gray-600 mb-4">Manage door types with technical drawings.</p>
              <button
                onClick={() => navigate('/admin/door-types')}
                className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
              >
                Manage Door Types
              </button>
            </div>
          </div>

          {/* Serial Number Configuration */}
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Serials</h3>
                <HashtagIcon className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 mb-4">Configure door serial number generation.</p>
              <div className="space-y-2">
                <input
                  type="number"
                  min="1"
                  value={serialConfig.startingSerial}
                  onChange={(e) => setSerialConfig({...serialConfig, startingSerial: e.target.value})}
                  className="block w-full border-gray-300 rounded-lg shadow-sm text-xs focus:ring-purple-500 focus:border-purple-500"
                  placeholder="200"
                />
                <input
                  type="text"
                  value={serialConfig.serialPrefix}
                  onChange={(e) => setSerialConfig({...serialConfig, serialPrefix: e.target.value})}
                  className="block w-full border-gray-300 rounded-lg shadow-sm text-xs focus:ring-purple-500 focus:border-purple-500"
                  placeholder="MUF-S199-RBD"
                />
                <button
                  onClick={handleSerialConfigSubmit}
                  disabled={updateSerialConfigMutation.isLoading}
                  className="w-full bg-purple-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateSerialConfigMutation.isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* User Management Section */}
      {showUserManagement && (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Manage system users and their permissions.
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <button
                  onClick={() => setShowAddUser(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Add User
                </button>
              </div>
            </div>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">
                <strong>✓ Integrated User Management:</strong> Creating a user here will automatically create their Firebase Authentication account. You can reset passwords and delete users from both Firestore and Auth in one action. Users with "Has Auth" badge can log in immediately.
              </p>
            </div>
          </div>

          {usersLoading ? (
            <div className="p-8 text-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersData?.data && usersData.data.length > 0 ? (
                      usersData.data.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500 md:hidden">{user.role}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                            <div className="text-sm text-gray-500 lg:hidden">{user.company}</div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'inspector' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'engineer' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.company || '-'}
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.status}
                              </span>
                              {user.hasAuthAccount ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Has Auth
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  No Auth
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex flex-col gap-2">
                              <div>
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="text-primary-600 hover:text-primary-900 mr-4"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                              {user.hasAuthAccount && (
                                <button
                                  onClick={() => handleResetPassword(user)}
                                  className="text-blue-600 hover:text-blue-900 text-xs"
                                >
                                  Reset Password
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                          No users found. Click "Add User" to create your first user.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showAddUser && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={resetUserForm}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </h3>
                  <div className="mt-6">
                    <form onSubmit={handleUserSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={userForm.name}
                          onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email *
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          value={userForm.email}
                          onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="john@example.com"
                        />
                      </div>

                      {!editingUser && (
                        <div>
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password * (minimum 6 characters)
                          </label>
                          <input
                            type="password"
                            id="password"
                            required
                            minLength={6}
                            value={userForm.password}
                            onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            placeholder="••••••••"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            This password will be used for Firebase Authentication login
                          </p>
                        </div>
                      )}

                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                          Role *
                        </label>
                        <select
                          id="role"
                          required
                          value={userForm.role}
                          onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                          <option value="inspector">Inspector</option>
                          <option value="engineer">Engineer</option>
                          <option value="admin">Admin</option>
                          <option value="client">Client</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                          Company
                        </label>
                        <input
                          type="text"
                          id="company"
                          value={userForm.company}
                          onChange={(e) => setUserForm({...userForm, company: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="Acme Corp"
                        />
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Phone
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          value={userForm.phone}
                          onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                          Status *
                        </label>
                        <select
                          id="status"
                          required
                          value={userForm.status}
                          onChange={(e) => setUserForm({...userForm, status: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>

                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                        <button
                          type="submit"
                          disabled={createUserMutation.isLoading || updateUserMutation.isLoading}
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                        >
                          {createUserMutation.isLoading || updateUserMutation.isLoading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                        </button>
                        <button
                          type="button"
                          onClick={resetUserForm}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && passwordResetUser && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowPasswordReset(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Reset Password for {passwordResetUser.name}
                  </h3>
                  <div className="mt-6">
                    <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                          New Password * (minimum 6 characters)
                        </label>
                        <input
                          type="password"
                          id="new-password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          placeholder="••••••••"
                          autoFocus
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Email: {passwordResetUser.email}
                        </p>
                      </div>

                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                        <button
                          type="submit"
                          disabled={resetPasswordMutation.isLoading}
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                        >
                          {resetPasswordMutation.isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPasswordReset(false)}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Company Settings Section */}
        {showCompanySettings && (
          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Company Settings</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Upload and manage company logo for certificates.
              </p>
            </div>
            <div className="px-4 py-6 sm:px-6">
              <div className="space-y-6">
                {/* Current Logo Preview */}
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    <h4 className="text-sm font-medium text-gray-900">Current Logo</h4>
                  </div>
                  <div className="flex items-center space-x-4">
                    {companySettings.logo_url ? (
                      <div className="relative">
                        <img
                          src={companySettings.logo_url}
                          alt="Company Logo"
                          className="h-16 w-16 object-contain border border-gray-300 rounded-md"
                        />
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to remove the logo?')) {
                              setCompanySettings({ logo_url: null, logo_storage_path: null });
                            }
                          }}
                          className="absolute -top-2 -right-2 h-5 w-5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                        <PhotoIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      {companySettings.logo_url ? 'Logo uploaded' : 'No logo uploaded'}
                    </div>
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Upload New Logo</label>
                  <div className="mt-1 flex items-center space-x-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedLogoFile(e.target.files[0])}
                      className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleUploadLogo}
                      disabled={!selectedLogoFile || uploadLogoMutation.isLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {uploadLogoMutation.isLoading ? 'Uploading...' : 'Upload Logo'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    PNG, JPG, or SVG. Recommended size: 200x200px. Max file size: 2MB.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity - Always at Bottom */}
        <div className="mt-8 bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <p className="mt-1 text-sm text-gray-600">
              Latest system activities and changes. All activity is visible for full transparency.
            </p>
          </div>
          {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {dashboardData.recentActivity.map((activity, index) => {
                // Determine icon color based on activity type
                const getColorClass = () => {
                  switch (activity.color || activity.type) {
                    case 'blue':
                    case 'inspection_completed':
                      return 'bg-blue-600';
                    case 'green':
                    case 'door_created':
                      return 'bg-green-600';
                    case 'purple':
                    case 'user_action':
                      return 'bg-purple-600';
                    case 'orange':
                    case 'system':
                      return 'bg-orange-600';
                    default:
                      return 'bg-blue-600';
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
    </div>
  );
}

export default Admin;
