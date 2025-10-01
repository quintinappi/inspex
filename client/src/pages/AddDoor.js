import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';

function AddDoor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  
  const [formData, setFormData] = useState({
    po_number: '',
    door_number: '',
    job_number: '',
    size: '1.5',
    pressure: '400',
    version: 'V1'
  });

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

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Add New Door</h1>
          <p className="mt-2 text-sm text-gray-700">
            Add a new refuge bay door to the system.
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="po_number" className="block text-sm font-medium text-gray-700">
              PO Number *
            </label>
            <input
              type="text"
              name="po_number"
              id="po_number"
              required
              value={formData.po_number}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="door_number" className="block text-sm font-medium text-gray-700">
              Door Number *
            </label>
            <input
              type="number"
              name="door_number"
              id="door_number"
              required
              value={formData.door_number}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="job_number" className="block text-sm font-medium text-gray-700">
              Job Number
            </label>
            <input
              type="text"
              name="job_number"
              id="job_number"
              value={formData.job_number}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="version" className="block text-sm font-medium text-gray-700">
              Door Version *
            </label>
            <select
              name="version"
              id="version"
              value={formData.version}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="V1">Version 1</option>
              <option value="V2">Version 2</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Door design version (independent of pressure rating)
            </p>
          </div>

          <div>
            <label htmlFor="size" className="block text-sm font-medium text-gray-700">
              Size *
            </label>
            <select
              name="size"
              id="size"
              value={formData.size}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="1.5">1.5M</option>
              <option value="1.8">1.8M</option>
              <option value="2.0">2.0M</option>
            </select>
          </div>

          <div>
            <label htmlFor="pressure" className="block text-sm font-medium text-gray-700">
              Pressure *
            </label>
            <select
              name="pressure"
              id="pressure"
              value={formData.pressure}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="140">140 kPa</option>
              <option value="400">400 kPa</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Both V1 and V2 doors can have either pressure rating
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/doors')}
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addDoorMutation.isLoading}
              className="inline-flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {addDoorMutation.isLoading ? <LoadingSpinner size="small" /> : 'Add Door'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDoor;