import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EngravingPlateGenerator from '../components/EngravingPlateGenerator';
import { useNotification } from '../context/NotificationContext';
import { ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline';

function DoorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  const [showPlateGenerator, setShowPlateGenerator] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const { data: door, isLoading, error } = useQuery(['door', id], async () => {
    const response = await api.get(`/doors/${id}`);
    return response.data;
  }, {
    cacheTime: 0,
    staleTime: 0
  });

  // Start inspection mutation
  const startInspectionMutation = useMutation(
    async (doorId) => {
      const response = await api.post(`/inspections/start/${doorId}`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['door', id]);
        showSuccess('Inspection started successfully');
        navigate(`/inspections/${data.inspection.id}`);
      },
      onError: (error) => {
        showError(error.response?.data?.message || 'Failed to start inspection');
      }
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">Error loading door details</div>;

  // Image configuration for 4 views
  const imageViews = [
    { key: 'high_pressure_side', label: 'High Pressure Side', desc: 'High pressure face' },
    { key: 'low_pressure_side', label: 'Low Pressure Side', desc: 'Low pressure face' }
  ];

  const images = door?.door_type_data?.images || {};
  const hasImages = Object.values(images).some(img => img);

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <Link
          to="/doors"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeftIcon className="-ml-1 mr-1 h-5 w-5" />
          Back to Doors
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Door Details</h1>
        <p className="mt-2 text-sm text-gray-600">
          View detailed information for door {door?.serial_number}
        </p>
      </div>

      {/* Technical Drawings Section */}
      {hasImages && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <PhotoIcon className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-gray-900">Technical Drawings</h3>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Technical drawings from door type: {door?.door_type_data?.name}
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {imageViews.map((view) => {
                const imageUrl = images[view.key];
                return (
                  <div 
                    key={view.key} 
                    className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-primary-500 transition-colors cursor-pointer"
                    onClick={() => imageUrl && setSelectedImage({ url: imageUrl, label: view.label })}
                  >
                    <div className="aspect-square bg-white flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={view.label}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400">
                          <PhotoIcon className="h-10 w-10 mb-2" />
                          <span className="text-xs">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{view.label}</p>
                      <p className="text-xs text-gray-500">{view.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Door Information */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{door?.serial_number}</h3>
          <p className="mt-1 text-sm text-gray-500">{door?.description || door?.door_type_data?.description}</p>
        </div>
        <div className="border-t border-gray-200">
          <dl className="divide-y divide-gray-200">
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4 bg-gray-50">
              <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">
                {door?.serial_number}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Drawing Number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {door?.drawing_number || 'N/A'}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4 bg-gray-50">
              <dt className="text-sm font-medium text-gray-500">PO Number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {door?.po_number || 'N/A'}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Door Number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {door?.door_number}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4 bg-gray-50">
              <dt className="text-sm font-medium text-gray-500">Job Number</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {door?.job_number || 'N/A'}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Size</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {door?.size}M
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4 bg-gray-50">
              <dt className="text-sm font-medium text-gray-500">Pressure</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {door?.pressure} kPa
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Door Type</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {door?.door_type_data?.name || `Version ${door?.door_type?.replace('V', '')}`}
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4 bg-gray-50">
              <dt className="text-sm font-medium text-gray-500">Inspection Status</dt>
              <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                <StatusBadge status={door?.inspection_status} />
              </dd>
            </div>
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Certification Status</dt>
              <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                <StatusBadge status={door?.certification_status} />
              </dd>
            </div>
            {door?.certification_status === 'rejected' && door?.rejection_reason && (
              <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4 bg-red-50 border-l-4 border-red-500">
                <dt className="text-sm font-bold text-red-800">⚠️ Rejection Reason</dt>
                <dd className="mt-1 text-sm text-red-700 sm:mt-0 sm:col-span-2 font-medium">
                  {door.rejection_reason}
                </dd>
              </div>
            )}
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4 bg-gray-50">
              <dt className="text-sm font-medium text-gray-500">Created Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {door?.created_at ? new Date(door.created_at).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end space-x-3">
        <button
          onClick={() => setShowPlateGenerator(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <PhotoIcon className="h-4 w-4 mr-2" />
          Generate Plate Image
        </button>
        {door?.inspection_status === 'pending' && (
          <button
            onClick={() => startInspectionMutation.mutate(door.id)}
            disabled={startInspectionMutation.isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
          >
            {startInspectionMutation.isLoading ? 'Starting...' : 'Start Inspection'}
          </button>
        )}
        {door?.inspection_status === 'completed' && door?.certification_status === 'pending' && (
          <Link
            to={`/certifications/${door.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            Certify Door
          </Link>
        )}
      </div>

      {/* Engraving Plate Generator Modal */}
      {showPlateGenerator && (
        <EngravingPlateGenerator
          door={door}
          onClose={() => setShowPlateGenerator(false)}
        />
      )}

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-full">
            <img
              src={selectedImage.url}
              alt={selectedImage.label}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-center text-white mt-4 text-lg font-medium">{selectedImage.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 border border-amber-200' },
    in_progress: { label: 'In Progress', className: 'bg-primary-100 text-primary-800 border border-primary-200' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border border-green-200' },
    certified: { label: 'Certified', className: 'bg-green-100 text-green-800 border border-green-200' },
    rejected: { label: '⚠️ REJECTED', className: 'bg-red-100 text-red-800 border border-red-200 font-bold' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default DoorDetail;
