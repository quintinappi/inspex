import firestoreService from './firestoreService';
import axios from 'axios';
import { auth } from '../firebase';

// Create axios instance for backend API calls
const backendAPI = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api'
});

// Add auth token to requests
backendAPI.interceptors.request.use(async (config) => {
  // Set Content-Type to application/json for non-FormData requests
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  // Try to get Firebase Auth token first
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    } catch (error) {
      console.error('Error getting Firebase ID token:', error);
    }
  }

  // Fallback to localStorage token
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Routes that should use backend API instead of Firestore
const BACKEND_ROUTES = ['users', 'door-types'];

// Export Firestore service with axios-like interface for backwards compatibility
const api = {
  // Generic methods
  get: async (path) => {
    const pathname = path.split('?')[0];
    const parts = pathname.split('/').filter(Boolean);

    // Check if this route should use backend API
    if (BACKEND_ROUTES.includes(parts[0])) {
      const response = await backendAPI.get(path);
      return response;
    }

    // Handle admin endpoints
    if (parts[0] === 'admin') {
      if (parts[1] === 'dashboard') {
        return firestoreService.getAdminDashboard();
      }
      if (parts[1] === 'serial-config') {
        return firestoreService.getConfig();
      }
      // Handle admin/company-settings - use backend API
      if (parts[1] === 'company-settings') {
        const response = await backendAPI.get(path);
        return response;
      }
    }

    // Handle doors/status/{status} query
    if (parts[0] === 'doors' && parts[1] === 'status' && parts[2]) {
      return firestoreService.getDoorsByStatus(parts[2]);
    }

    // Handle inspections endpoints
    if (parts[0] === 'inspections') {
      if (parts.length === 1) {
        // GET /inspections - list all inspections with enhanced data
        return backendAPI.get(path);
      }
      if (parts.length === 2 && parts[1] !== 'start') {
        // GET /inspections/{id} - get inspection with checks
        // Use backend API instead of direct Firestore to ensure data consistency
        return backendAPI.get(path);
      }
    }

    // Handle certifications endpoints
    if (parts[0] === 'certifications') {
      if (parts[1] === 'pending') {
        return firestoreService.getDoorsPendingCertification();
      }
      if (parts[1] === 'completed') {
        return backendAPI.get(path);
      }
      // Handle backend routes: /certifications/my-certificates, /certifications/download, and other routes
      if (parts[1] === 'my-certificates' || parts[1] === 'download' || (parts[1] === 'door' && parts[2] && parts[3] === 'inspection')) {
        const response = await backendAPI.get(path);
        return response;
      }
    }

    if (parts.length === 1) {
      // Collection query (e.g., /doors)
      const collection = parts[0];
      // Use specialized method for doors collection
      if (collection === 'doors') {
        return firestoreService.getDoors();
      }
      return firestoreService.getAll(collection);
    } else if (parts.length === 2) {
      // Document query (e.g., /doors/123)
      const [collection, id] = parts;
      // Use specialized method for individual door
      if (collection === 'doors') {
        return firestoreService.getDoor(id);
      }
      return firestoreService.get(collection, id);
    }

    throw new Error('Unsupported path format');
  },

  post: async (path, data, config) => {
    const parts = path.split('/').filter(Boolean);

    // Check if this route should use backend API
    if (BACKEND_ROUTES.includes(parts[0])) {
      const response = await backendAPI.post(path, data, config);
      return response;
    }

    // Handle certifications/certify/{doorId} - use backend API
    if (parts[0] === 'certifications' && parts[1] === 'certify' && parts[2]) {
      const response = await backendAPI.post(path, data, config);
      return response;
    }

    // Handle admin endpoints
    if (parts[0] === 'admin') {
      if (parts[1] === 'serial-config') {
        return firestoreService.updateConfig(data);
      }
    }

    // Handle doors - use special createDoor method for serial number generation
    if (parts[0] === 'doors') {
      return firestoreService.createDoor(data);
    }

    // Handle inspections/start/{doorId} - use backend API for consistency
    if (parts[0] === 'inspections' && parts[1] === 'start' && parts[2]) {
      const response = await backendAPI.post(path, data, config);
      return response;
    }

    // Handle inspections/complete/{id} - use backend API for consistency
    if (parts[0] === 'inspections' && parts[1] === 'complete' && parts[2]) {
      const response = await backendAPI.post(path, data, config);
      return response;
    }

    const collection = parts[0];
    return firestoreService.create(collection, data);
  },

  put: async (path, data, config) => {
    const parts = path.split('/').filter(Boolean);

    // Check if this route should use backend API
    if (BACKEND_ROUTES.includes(parts[0])) {
      const response = await backendAPI.put(path, data, config);
      return response;
    }

    // Handle admin endpoints
    if (parts[0] === 'admin') {
      // Handle admin/company-settings - use backend API
      if (parts[1] === 'company-settings') {
        const response = await backendAPI.put(path, data, config);
        return response;
      }
    }

    // Handle inspections/{inspectionId}/checks/{checkId}
    if (parts[0] === 'inspections' && parts[2] === 'checks' && parts.length === 4) {
      const checkId = parts[3];
      return firestoreService.updateInspectionCheck(checkId, data);
    }

    // Handle inspections/check/{checkId} (old format for backwards compatibility)
    if (parts[0] === 'inspections' && parts[1] === 'check' && parts[2]) {
      return firestoreService.updateInspectionCheck(parts[2], data);
    }

    if (parts.length === 2) {
      const [collection, id] = parts;
      return firestoreService.update(collection, id, data);
    }

    throw new Error('Unsupported path format');
  },

  delete: async (path, config) => {
    const parts = path.split('/').filter(Boolean);

    // Check if this route should use backend API
    if (BACKEND_ROUTES.includes(parts[0])) {
      const response = await backendAPI.delete(path, config);
      return response;
    }

    // Handle inspections deletion specially
    if (parts[0] === 'inspections' && parts.length === 2) {
      return firestoreService.deleteInspection(parts[1]);
    }

    if (parts.length === 2) {
      const [collection, id] = parts;
      return firestoreService.delete(collection, id);
    }

    throw new Error('Unsupported path format');
  }
};

export default api;
