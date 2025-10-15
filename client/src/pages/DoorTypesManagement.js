import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import { PhotoIcon, PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

function DoorTypesManagement() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const [showForm, setShowForm] = useState(false);
  const [editingDoorType, setEditingDoorType] = useState(null);
  const [selectedImages, setSelectedImages] = useState({
    iso_view: null,
    high_pressure_side: null,
    low_pressure_side: null
  });

  const [doorTypeForm, setDoorTypeForm] = useState({
    name: '',
    description: '',
    pressure_high: '',
    pressure_low: '',
    images: {
      iso_view: '',
      high_pressure_side: '',
      low_pressure_side: ''
    }
  });

  const { data: doorTypes, isLoading } = useQuery(
    'door-types',
    async () => {
      const response = await api.get('/door-types');
      return response.data;
    }
  );

  const createDoorTypeMutation = useMutation(
    async (data) => {
      const response = await api.post('/door-types', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('door-types');
        showSuccess('Door type created successfully');
        resetForm();
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to create door type');
      }
    }
  );

  const updateDoorTypeMutation = useMutation(
    async ({ id, data }) => {
      const response = await api.put(`/door-types/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('door-types');
        showSuccess('Door type updated successfully');
        resetForm();
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to update door type');
      }
    }
  );

  const deleteDoorTypeMutation = useMutation(
    async (id) => {
      const response = await api.delete(`/door-types/${id}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('door-types');
        showSuccess('Door type deleted successfully');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to delete door type');
      }
    }
  );

  const resetForm = () => {
    setDoorTypeForm({
      name: '',
      description: '',
      pressure_high: '',
      pressure_low: '',
      images: {
        iso_view: '',
        high_pressure_side: '',
        low_pressure_side: ''
      }
    });
    setSelectedImages({
      iso_view: null,
      high_pressure_side: null,
      low_pressure_side: null
    });
    setEditingDoorType(null);
    setShowForm(false);
  };

  const handleEdit = (doorType) => {
    setEditingDoorType(doorType);
    setDoorTypeForm({
      name: doorType.name || '',
      description: doorType.description || '',
      pressure_high: doorType.pressure_high || '',
      pressure_low: doorType.pressure_low || '',
      images: {
        iso_view: doorType.images?.iso_view || '',
        high_pressure_side: doorType.images?.high_pressure_side || '',
        low_pressure_side: doorType.images?.low_pressure_side || ''
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this door type? This action cannot be undone.')) {
      deleteDoorTypeMutation.mutate(id);
    }
  };

  const handleImageChange = (field, file) => {
    setSelectedImages(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const uploadImageToFirebase = async (file, path) => {
    // This function would handle the actual Firebase Storage upload
    // For now, we'll simulate it and return a temporary URL
    // In production, this would use Firebase Storage SDK to upload the file

    if (!file) return null;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock URL - in real implementation this would be the Firebase Storage URL
    return `https://firebasestorage.googleapis.com/v0/b/inspex-storage/o/${path}?alt=media&token=mock-token`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const templateData = { ...doorTypeForm };

      // Upload images if selected
      const uploadPromises = Object.entries(selectedImages).map(async ([field, file]) => {
        if (file) {
          try {
            const path = `door-types/${Date.now()}-${field}-${file.name}`;
            const url = await uploadImageToFirebase(file, path);
            templateData.images[field] = url;
          } catch (error) {
            showError(`Failed to upload ${field} image: ${error.message}`);
            return null;
          }
        }
      });

      await Promise.all(uploadPromises);

      if (editingDoorType) {
        updateDoorTypeMutation.mutate({
          id: editingDoorType.id,
          data: templateData
        });
      } else {
        createDoorTypeMutation.mutate(templateData);
      }
    } catch (error) {
      showError('Failed to process form submission');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Door Types Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage door types with technical drawings and specifications.
          </p>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {showForm ? 'Cancel' : 'Add Door Type'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDoorType ? 'Edit Door Type' : 'Add New Door Type'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={doorTypeForm.name}
                    onChange={(e) => setDoorTypeForm({...doorTypeForm, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., Refuge Bay Door"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    High Pressure Rating (kPa) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={doorTypeForm.pressure_high}
                    onChange={(e) => setDoorTypeForm({...doorTypeForm, pressure_high: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={doorTypeForm.description}
                  onChange={(e) => setDoorTypeForm({...doorTypeForm, description: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Door type description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Low Pressure Rating (kPa)
                </label>
                <input
                  type="number"
                  min="0"
                  value={doorTypeForm.pressure_low}
                  onChange={(e) => setDoorTypeForm({...doorTypeForm, pressure_low: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Technical Drawing Images */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Technical Drawings</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    ISO View
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange('iso_view', e.target.files[0])}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {doorTypeForm.images.iso_view && (
                    <img
                      src={doorTypeForm.images.iso_view}
                      alt="ISO View"
                      className="mt-2 h-24 w-24 object-contain border border-gray-300 rounded"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    High Pressure Side
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange('high_pressure_side', e.target.files[0])}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {doorTypeForm.images.high_pressure_side && (
                    <img
                      src={doorTypeForm.images.high_pressure_side}
                      alt="High Pressure Side"
                      className="mt-2 h-24 w-24 object-contain border border-gray-300 rounded"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Low Pressure Side
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange('low_pressure_side', e.target.files[0])}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {doorTypeForm.images.low_pressure_side && (
                    <img
                      src={doorTypeForm.images.low_pressure_side}
                      alt="Low Pressure Side"
                      className="mt-2 h-24 w-24 object-contain border border-gray-300 rounded"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDoorTypeMutation.isLoading || updateDoorTypeMutation.isLoading}
                  className="inline-flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {createDoorTypeMutation.isLoading || updateDoorTypeMutation.isLoading ? 'Saving...' : (editingDoorType ? 'Update Door Type' : 'Create Door Type')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Door Types List */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Door Types</h3>
            <p className="mt-1 text-sm text-gray-600">
              {doorTypes?.length || 0} door types configured
            </p>
          </div>

          {!doorTypes || doorTypes.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No door types</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first door type.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {doorTypes.map((doorType) => (
                <li key={doorType.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="grid grid-cols-3 gap-2">
                            {['iso_view', 'high_pressure_side', 'low_pressure_side'].map((view) => (
                              <div key={view} className="w-12 h-12">
                                {doorType.images?.[view] ? (
                                  <img
                                    src={doorType.images[view]}
                                    alt={`${view} of ${doorType.name}`}
                                    className="w-full h-full object-contain border border-gray-300 rounded"
                                  />
                                ) : (
                                  <div className="w-full h-full border border-gray-300 rounded bg-gray-100 flex items-center justify-center">
                                    <PhotoIcon className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{doorType.name}</h4>
                          <p className="text-sm text-gray-500">
                            High: {doorType.pressure_high} kPa
                            {doorType.pressure_low && ` | Low: ${doorType.pressure_low} kPa`}
                          </p>
                          {doorType.description && (
                            <p className="text-xs text-gray-600 mt-1">{doorType.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(doorType)}
                        className="p-1 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doorType.id)}
                        className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoorTypesManagement;
