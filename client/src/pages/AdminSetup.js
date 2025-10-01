import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { setupInitialAdmin } from '../utils/setupAdmin';
import { useNotification } from '../context/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';

function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const { showSuccess, showError } = useNotification();

  const handleSetup = async () => {
    setLoading(true);
    try {
      const result = await setupInitialAdmin();
      if (result.success) {
        showSuccess(result.message);
        setSetupComplete(true);
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Failed to setup admin user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Setup Complete!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Admin user has been created successfully.
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Admin Login:</strong><br />
                Email: admin@inspex.com<br />
                Password: admin123
              </p>
            </div>
            <div className="mt-6">
              <Link
                to="/login"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            INSPEX Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Initialize your Refuge Bay Door Inspection System
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  First Time Setup Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Click the button below to create the initial administrator account.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Admin credentials that will be created:</h4>
            <div className="text-sm text-gray-600">
              <p><strong>Email:</strong> admin@inspex.com</p>
              <p><strong>Password:</strong> admin123</p>
              <p className="mt-2 text-xs text-gray-500">
                ⚠️ Please change these credentials after first login for security.
              </p>
            </div>
          </div>

          <button
            onClick={handleSetup}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <LoadingSpinner size="small" text="Setting up..." /> : 'Create Admin User'}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-500">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSetup;