import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../context/NotificationContext';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  PhotoIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

function DoorTypesManagement() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();

  const [showForm, setShowForm] = useState(false);
  const [editingDoorType, setEditingDoorType] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // 2 images: high_pressure_side, low_pressure_side
  const [selectedImages, setSelectedImages] = useState({
    high_pressure_side: null,
    low_pressure_side: null
  });

  const [doorTypeForm, setDoorTypeForm] = useState({
    name: '',
    description: '',
    reference_drawing: '',
    pressure_high: '',
    pressure_low: '',
    images: {
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
      reference_drawing: '',
      pressure_high: '',
      pressure_low: '',
      images: {
        high_pressure_side: '',
        low_pressure_side: ''
      }
    });
    setSelectedImages({
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
      reference_drawing: doorType.reference_drawing || '',
      pressure_high: doorType.pressure_high || '',
      pressure_low: doorType.pressure_low || '',
      images: {
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
    if (file) {
      setSelectedImages(prev => ({
        ...prev,
        [field]: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setDoorTypeForm(prev => ({
          ...prev,
          images: {
            ...prev.images,
            [field]: reader.result
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToFirebase = async (file, doorTypeId, field) => {
    if (!file) return null;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    const timestamp = Date.now();
    const fileName = `door-types/${doorTypeId}/${field}-${timestamp}.jpg`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const templateData = { ...doorTypeForm };
      const doorTypeId = editingDoorType?.id || 'new-' + Date.now();

      // Upload images if selected
      const uploadPromises = Object.entries(selectedImages).map(async ([field, file]) => {
        if (file) {
          try {
            const url = await uploadImageToFirebase(file, doorTypeId, field);
            templateData.images[field] = url;
          } catch (error) {
            console.error(`Failed to upload ${field}:`, error);
            showError(`Failed to upload ${field} image`);
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
    } finally {
      setUploading(false);
    }
  };

  // Predefined door types from deployed version
  const predefinedTypes = [
    { name: '400 kPa Double Door', pressure_high: 400 },
    { name: '400 kPa V1', pressure_high: 400 },
    { name: '400 kPa V2', pressure_high: 400 },
    { name: '140 kPa', pressure_high: 140 }
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Door Types Management</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage door types with technical drawings and specifications for certificates.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {showForm ? 'Cancel' : 'Add Door Type'}
          </button>
        </div>
      </div>

      {/* Quick Add Predefined Types */}
      {!showForm && (!doorTypes || doorTypes.length === 0) && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Setup</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create the standard door types used in your certificates:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {predefinedTypes.map((type) => (
              <button
                key={type.name}
                onClick={() => {
                  setDoorTypeForm({
                    ...doorTypeForm,
                    name: type.name,
                    pressure_high: type.pressure_high
                  });
                  setShowForm(true);
                }}
                className="p-4 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-left transition-colors"
              >
                <CubeIcon className="h-8 w-8 text-primary-500 mb-2" />
                <p className="font-medium text-gray-900">{type.name}</p>
                <p className="text-sm text-gray-600">{type.pressure_high} kPa</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingDoorType ? 'Edit Door Type' : 'Add New Door Type'}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={doorTypeForm.name}
                  onChange={(e) => setDoorTypeForm({...doorTypeForm, name: e.target.value})}
                  className="block w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 400 kPa V1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Drawing
                </label>
                <input
                  type="text"
                  value={doorTypeForm.reference_drawing}
                  onChange={(e) => setDoorTypeForm({...doorTypeForm, reference_drawing: e.target.value})}
                  className="block w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., DWG-12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pressure Rating (kPa) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={doorTypeForm.pressure_high}
                  onChange={(e) => setDoorTypeForm({...doorTypeForm, pressure_high: e.target.value})}
                  className="block w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={2}
                value={doorTypeForm.description}
                onChange={(e) => setDoorTypeForm({...doorTypeForm, description: e.target.value})}
                className="block w-full bg-white border border-gray-300 rounded-lg py-2 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Brief description of this door type..."
              />
            </div>

            {/* Technical Drawing Images - 4 images */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                <PhotoIcon className="h-5 w-5 mr-2 text-primary-500" />
                Certificate Images (2 views required)
              </h4>
              <p className="text-xs text-gray-600 mb-4">
                These images will appear on the final PDF certificate. Upload both views for complete documentation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'high_pressure_side', label: 'High Pressure Side', desc: 'High pressure face' },
                  { key: 'low_pressure_side', label: 'Low Pressure Side', desc: 'Low pressure face' }
                ].map((imageType) => (
                  <div key={imageType.key} className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {imageType.label}
                    </label>
                    <p className="text-xs text-gray-600 mb-3">{imageType.desc}</p>
                    
                    <div className="relative">
                      {doorTypeForm.images[imageType.key] ? (
                        <div className="relative mb-2">
                          <img
                            src={doorTypeForm.images[imageType.key]}
                            alt={imageType.label}
                            className="w-full h-32 object-contain bg-white rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setDoorTypeForm(prev => ({
                                ...prev,
                                images: { ...prev.images, [imageType.key]: '' }
                              }));
                              setSelectedImages(prev => ({ ...prev, [imageType.key]: null }));
                            }}
                            className="absolute -top-2 -right-2 h-6 w-6 bg-red-600 text-white rounded-full hover:bg-red-700 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center mb-2">
                          <PhotoIcon className="h-8 w-8 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                      
                      <label className="block w-full">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={(e) => handleImageChange(imageType.key, e.target.files[0])}
                          className="hidden"
                        />
                        <span className="block w-full text-center py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg cursor-pointer transition-colors">
                          {doorTypeForm.images[imageType.key] ? 'Change' : 'Upload'}
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createDoorTypeMutation.isLoading || updateDoorTypeMutation.isLoading || uploading}
                className="inline-flex items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {uploading ? 'Uploading Images...' : 
                 createDoorTypeMutation.isLoading || updateDoorTypeMutation.isLoading ? 'Saving...' : 
                 (editingDoorType ? 'Update Door Type' : 'Create Door Type')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Door Types List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Door Types</h3>
              <p className="mt-1 text-sm text-gray-600">
                {doorTypes?.length || 0} door types configured
              </p>
            </div>
          </div>
        </div>

        {!doorTypes || doorTypes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No door types</h3>
            <p className="mt-1 text-sm text-gray-600">
              Get started by adding your first door type above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {doorTypes.map((doorType) => (
              <div key={doorType.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* 4 Image Thumbnails */}
                    <div className="grid grid-cols-2 gap-2">
                      {['high_pressure_side', 'low_pressure_side'].map((view) => (
                        <div key={view} className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          {doorType.images?.[view] ? (
                            <img
                              src={doorType.images[view]}
                              alt={`${view} of ${doorType.name}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <PhotoIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{doorType.name}</h4>
                      <p className="text-sm text-gray-600">
                        {doorType.pressure_high} kPa
                        {doorType.pressure_low ? ` / ${doorType.pressure_low} kPa` : ''}
                      </p>
                      {doorType.description && (
                        <p className="text-xs text-gray-600 mt-1">{doorType.description}</p>
                      )}
                      {/* Image count indicator */}
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="text-xs text-gray-500">
                          Images: {Object.values(doorType.images || {}).filter(Boolean).length}/2
                        </span>
                        {Object.values(doorType.images || {}).filter(Boolean).length >= 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(doorType)}
                      className="p-2 rounded-lg text-gray-500 hover:text-primary-700 hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(doorType.id)}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DoorTypesManagement;
