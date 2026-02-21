import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CubeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useNotification } from '../context/NotificationContext';

function PurchaseOrders() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  
  // Form state
  const [poForm, setPoForm] = useState({
    po_number: '',
    client_name: '',
    client_email: '',
    description: '',
    status: 'active'
  });

  // PO door line items (door type + quantity)
  const [poLineItems, setPoLineItems] = useState([
    { door_type_id: '', quantity: 1 }
  ]);

  // Fetch purchase orders
  const { data: purchaseOrders, isLoading, error } = useQuery(
    'purchase-orders',
    async () => {
      const response = await api.get('/purchase-orders');
      return response.data;
    }
  );

  const { data: doorTypes } = useQuery(
    'door-types',
    async () => {
      const response = await api.get('/door-types');
      return response.data;
    },
    {
      enabled: showAddModal,
      staleTime: 60 * 1000
    }
  );

  // Mutations
  const createPOMutation = useMutation(
    async (poData) => {
      const response = await api.post('/purchase-orders', poData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchase-orders');
        setShowAddModal(false);
        resetForm();
        showSuccess('Purchase order created successfully!');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to create purchase order');
      }
    }
  );

  const updatePOMutation = useMutation(
    async ({ id, data }) => {
      const response = await api.put(`/purchase-orders/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchase-orders');
        setShowEditModal(false);
        setSelectedPO(null);
        resetForm();
        showSuccess('Purchase order updated successfully!');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to update purchase order');
      }
    }
  );

  const deletePOMutation = useMutation(
    async (poId) => {
      const response = await api.delete(`/purchase-orders/${poId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('purchase-orders');
        setShowDeleteModal(false);
        setSelectedPO(null);
        showSuccess('Purchase order deleted successfully!');
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to delete purchase order');
      }
    }
  );

  const getPODisplayDescription = (po) => {
    const direct = (po?.description || '').trim();
    if (direct) return direct;

    const items = Array.isArray(po?.line_items) ? po.line_items : [];
    if (items.length === 0) return '';

    return items
      .filter((i) => i && (i.door_type_name || i.door_type_id) && Number(i.quantity || 0) > 0)
      .map((i) => `${i.door_type_name || i.door_type_id} x${Number(i.quantity || 0)}`)
      .join(', ');
  };

  // Filter purchase orders
  const filteredPOs = purchaseOrders?.filter(po => {
    const derivedDescription = getPODisplayDescription(po);
    const matchesSearch = !searchQuery || 
      po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.client_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      derivedDescription?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Handlers
  const resetForm = () => {
    setPoForm({
      po_number: '',
      client_name: '',
      client_email: '',
      description: '',
      status: 'active'
    });

    setPoLineItems([{ door_type_id: '', quantity: 1 }]);
  };

  const handleAddPO = (e) => {
    e.preventDefault();
    const lineItems = (poLineItems || [])
      .map((item) => ({
        door_type_id: item.door_type_id,
        quantity: Number(item.quantity || 0)
      }))
      .filter((item) => item.door_type_id && Number.isFinite(item.quantity) && item.quantity > 0);

    if (lineItems.length === 0) {
      showError('Please select at least one door type and quantity');
      return;
    }

    createPOMutation.mutate({
      ...poForm,
      line_items: lineItems
    });
  };

  const updateLineItem = (index, updates) => {
    setPoLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const addLineItem = () => {
    setPoLineItems((prev) => [...prev, { door_type_id: '', quantity: 1 }]);
  };

  const removeLineItem = (index) => {
    setPoLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditPO = (e) => {
    e.preventDefault();
    updatePOMutation.mutate({ 
      id: selectedPO.id, 
      data: poForm
    });
  };

  const handleDeletePO = () => {
    deletePOMutation.mutate(selectedPO.id);
  };

  const openEditModal = (po) => {
    setSelectedPO(po);
    setPoForm({
      po_number: po.po_number || '',
      client_name: po.client_name || '',
      client_email: po.client_email || '',
      description: po.description || '',
      status: po.status || 'active'
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (po) => {
    setSelectedPO(po);
    setShowDeleteModal(true);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading purchase orders: {error.message}</div>;

  return (
    <div>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Orders</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage purchase orders and client information.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add PO
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total POs</dt>
                    <dd className="text-2xl font-bold text-gray-900">{purchaseOrders?.length || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {purchaseOrders?.filter(po => po.status === 'active').length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Doors</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {purchaseOrders?.reduce((sum, po) => sum + (po.door_count || 0), 0) || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by PO number, client, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* POs List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Mobile View (Cards) */}
          <div className="block sm:hidden divide-y divide-gray-200">
            {filteredPOs.length > 0 ? (
              filteredPOs.map((po) => (
                <div key={po.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{po.po_number}</span>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      po.status === 'active' ? 'bg-green-100 text-green-800' :
                      po.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {po.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-900 mb-1">
                    Client: {po.client_name || '-'}
                  </div>
                  {po.client_email && (
                    <div className="text-xs text-gray-500 mb-2">{po.client_email}</div>
                  )}
                  <div className="text-sm text-gray-500 mb-2">
                    {getPODisplayDescription(po) || 'No description'}
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <CubeIcon className="h-4 w-4 text-gray-400 mr-1" />
                    {po.door_count || 0} doors
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(po)}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(po)}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No purchase orders found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters.' 
                    : 'Get started by creating a new purchase order.'}
                </p>
              </div>
            )}
          </div>

          {/* Desktop View (Table) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doors
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPOs.length > 0 ? (
                  filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{po.po_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{po.client_name || '-'}</div>
                        {po.client_email && (
                          <div className="text-xs text-gray-500">{po.client_email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {getPODisplayDescription(po) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          po.status === 'active' ? 'bg-green-100 text-green-800' :
                          po.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <CubeIcon className="h-4 w-4 text-gray-400 mr-1" />
                          {po.door_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(po)}
                            className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                            title="Edit PO"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(po)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete PO"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      No purchase orders found. Click "Add PO" to create your first purchase order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add PO Modal */}
      {showAddModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)} />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Add New Purchase Order</h3>
              <form onSubmit={handleAddPO} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Number *</label>
                  <input
                    type="text"
                    required
                    value={poForm.po_number}
                    onChange={(e) => setPoForm({...poForm, po_number: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 placeholder-gray-400 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="e.g., PO-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Name</label>
                  <input
                    type="text"
                    value={poForm.client_name}
                    onChange={(e) => setPoForm({...poForm, client_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Email</label>
                  <input
                    type="email"
                    value={poForm.client_email}
                    onChange={(e) => setPoForm({...poForm, client_email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={poForm.description}
                    onChange={(e) => setPoForm({...poForm, description: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={poForm.status}
                    onChange={(e) => setPoForm({...poForm, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doors</label>
                  <div className="space-y-2">
                    {poLineItems.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <select
                          value={item.door_type_id}
                          onChange={(e) => updateLineItem(index, { door_type_id: e.target.value })}
                          className="flex-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          required
                        >
                          <option value="">Select door type...</option>
                          {(doorTypes || []).map((dt) => (
                            <option key={dt.id} value={dt.id}>{dt.name}</option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, { quantity: e.target.value })}
                          className="w-24 block border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          required
                        />

                        {poLineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            aria-label="Remove line item"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      + Add another door type
                    </button>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPOMutation.isLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm disabled:opacity-50"
                  >
                    {createPOMutation.isLoading ? 'Creating...' : 'Create PO'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit PO Modal */}
      {showEditModal && selectedPO && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)} />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Edit Purchase Order</h3>
              <form onSubmit={handleEditPO} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Number *</label>
                  <input
                    type="text"
                    required
                    value={poForm.po_number}
                    onChange={(e) => setPoForm({...poForm, po_number: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Name</label>
                  <input
                    type="text"
                    value={poForm.client_name}
                    onChange={(e) => setPoForm({...poForm, client_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Email</label>
                  <input
                    type="email"
                    value={poForm.client_email}
                    onChange={(e) => setPoForm({...poForm, client_email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={poForm.description}
                    onChange={(e) => setPoForm({...poForm, description: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={poForm.status}
                    onChange={(e) => setPoForm({...poForm, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setSelectedPO(null); }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatePOMutation.isLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm disabled:opacity-50"
                  >
                    {updatePOMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPO && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteModal(false)} />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Purchase Order</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete <strong>{selectedPO.po_number}</strong>?
                      {selectedPO.door_count > 0 ? (
                        <span className="text-amber-700 block mt-1">
                          Note: This PO has {selectedPO.door_count} door(s). If all doors are still in <strong>Pending Inspection</strong>, deleting this PO will also delete those doors. If any door has started inspection (or has inspections/certifications), deletion will be blocked.
                        </span>
                      ) : (
                        ' This action cannot be undone.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeletePO}
                  disabled={deletePOMutation.isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletePOMutation.isLoading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setSelectedPO(null); }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrders;
