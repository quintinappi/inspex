import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeftIcon, CubeIcon } from '@heroicons/react/24/outline';

function AddDoor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  
  const [formData, setFormData] = useState({
    po_id: '',
    door_number: '',
    job_number: '',
    door_type_id: '',
    size: '1.5',
    pressure: '400',
    version: 'V1',
    description: ''
  });

  // Fetch purchase orders
  const { data: purchaseOrders, isLoading: loadingPOs } = useQuery(
    'purchase-orders-for-door',
    async () => {
      const response = await api.get('/purchase-orders');
      return response.data;
    }
  );

  // Fetch door types
  const { data: doorTypes, isLoading: loadingDoorTypes } = useQuery(
    'door-types-for-door',
    async () => {
      const response = await api.get('/door-types');
      return response.data;
    }
  );

  const addDoorMutation = useMutation(
    async (doorData) => {
      const response = await api.post('/doors', doorData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('doors');
        showSuccess('Door added successfully');
        navigate('/doors');
      },
      onError: (error) => {
        showError(error.response?.data?.error || 'Failed to add door');
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    addDoorMutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Auto-update pressure when door type is selected
  const handleDoorTypeChange = (e) => {
    const doorTypeId = e.target.value;
    const selectedType = doorTypes?.find(dt => dt.id === doorTypeId);
    
    setFormData({
      ...formData,
      door_type_id: doorTypeId,
      pressure: selectedType ? String(selectedType.pressure_high) : formData.pressure
    });
  };

  // Get selected PO details
  const selectedPO = purchaseOrders?.find(po => po.id === formData.po_id);
  
  // Get selected door type details
  const selectedDoorType = doorTypes?.find(dt => dt.id === formData.door_type_id);

  const isLoading = loadingPOs || loadingDoorTypes;

  if (isLoading) return <LoadingSpinner />;

  // Light theme input classes
  const inputClass = "mt-1 block w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/doors')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeftIcon className="-ml-1 mr-1 h-5 w-5" />
          Back to Doors
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Add New Door</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a new refuge bay door. Serial and drawing numbers will be auto-generated.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Purchase Order Selection */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <label htmlFor="po_id" className={labelClass}>
              Purchase Order *
            </label>
            <select
              name="po_id"
              id="po_id"
              required
              value={formData.po_id}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="" className="bg-white text-gray-500">Select a Purchase Order</option>
              {purchaseOrders?.map(po => (
                <option key={po.id} value={po.id} className="bg-white text-gray-900">
                  {po.po_number} {po.client_name ? `- ${po.client_name}` : ''}
                </option>
              ))}
            </select>
            {purchaseOrders?.length === 0 && (
              <p className="mt-2 text-xs text-red-600">
                No purchase orders found. Please create one first.
              </p>
            )}
            {selectedPO && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-900"><span className="text-gray-500">Client:</span> {selectedPO.client_name || 'N/A'}</p>
                <p className="text-sm text-gray-900 mt-1"><span className="text-gray-500">Email:</span> {selectedPO.client_email || 'N/A'}</p>
                {selectedPO.description && (
                  <p className="text-sm text-gray-900 mt-1"><span className="text-gray-500">Description:</span> {selectedPO.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Door Type Selection */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <label htmlFor="door_type_id" className={labelClass}>
              Door Type *
            </label>
            <select
              name="door_type_id"
              id="door_type_id"
              required
              value={formData.door_type_id}
              onChange={handleDoorTypeChange}
              className={inputClass}
            >
              <option value="" className="bg-white text-gray-500">Select a Door Type</option>
              {doorTypes?.map(dt => (
                <option key={dt.id} value={dt.id} className="bg-white text-gray-900">
                  {dt.name} ({dt.pressure_high} kPa)
                </option>
              ))}
            </select>
            {doorTypes?.length === 0 && (
              <p className="mt-2 text-xs text-red-600">
                No door types found. Please create one in Admin &gt; Door Types.
              </p>
            )}
            {selectedDoorType && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3 mb-2">
                  <CubeIcon className="h-5 w-5 text-primary-500" />
                  <span className="text-sm font-medium text-gray-900">{selectedDoorType.name}</span>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="text-gray-500">Pressure:</span> {selectedDoorType.pressure_high} kPa
                </p>
                {selectedDoorType.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="text-gray-500">Description:</span> {selectedDoorType.description}
                  </p>
                )}
                {/* Image count */}
                <div className="mt-3 flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Technical Drawings:</span>
                  <span className={`text-xs font-medium ${
                    Object.values(selectedDoorType.images || {}).filter(Boolean).length === 4 
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`}>
                    {Object.values(selectedDoorType.images || {}).filter(Boolean).length}/4 views
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Door Number & Job Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <label htmlFor="door_number" className={labelClass}>
                Door Number *
              </label>
              <input
                type="number"
                name="door_number"
                id="door_number"
                required
                min="1"
                value={formData.door_number}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g., 1"
              />
              <p className="mt-2 text-xs text-gray-500">
                Sequential number for this door in the PO
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <label htmlFor="job_number" className={labelClass}>
                Job Number
              </label>
              <input
                type="text"
                name="job_number"
                id="job_number"
                value={formData.job_number}
                onChange={handleChange}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Version, Size, Pressure */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <label htmlFor="version" className={labelClass}>
                Door Version *
              </label>
              <select
                name="version"
                id="version"
                value={formData.version}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="V1" className="bg-white">Version 1</option>
                <option value="V2" className="bg-white">Version 2</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">Design version</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <label htmlFor="size" className={labelClass}>
                Size *
              </label>
              <select
                name="size"
                id="size"
                value={formData.size}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="1.5" className="bg-white">1.5M</option>
                <option value="1.8" className="bg-white">1.8M</option>
                <option value="2.0" className="bg-white">2.0M</option>
              </select>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <label htmlFor="pressure" className={labelClass}>
                Pressure *
              </label>
              <select
                name="pressure"
                id="pressure"
                value={formData.pressure}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="140" className="bg-white">140 kPa</option>
                <option value="400" className="bg-white">400 kPa</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">Auto-set from door type</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className={inputClass}
              placeholder="Optional description or notes about this door"
            />
          </div>

          {/* Preview of what will be generated */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
            <h4 className="text-sm font-medium text-primary-700 mb-3 flex items-center">
              <CubeIcon className="h-4 w-4 mr-2" />
              Will be auto-generated
            </h4>
            <div className="text-sm text-gray-600 space-y-2">
              <p><span className="text-gray-500">Serial Number:</span> <span className="text-gray-900 font-mono">Based on size and next available number</span></p>
              <p><span className="text-gray-500">Drawing Number:</span> <span className="text-gray-900 font-mono">Auto-generated from serial</span></p>
              <p><span className="text-gray-500">Inspection Status:</span> <span className="text-amber-600">Pending</span></p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/doors')}
              className="py-2.5 px-5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addDoorMutation.isLoading || !formData.po_id || !formData.door_type_id}
              className="inline-flex items-center py-2.5 px-5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addDoorMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Adding...
                </>
              ) : (
                'Add Door'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDoor;
