import React, { useState } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNotification } from '../context/NotificationContext';

function SetupDatabase() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const { showSuccess, showError } = useNotification();

  const inspectionPoints = [
    { name: 'Drawing Number Confirmation', description: 'Confirm Drawing Number used by Fabricator', order_index: 1 },
    { name: 'Overall Dimensions', description: 'Confirm Over-All Dimensions', order_index: 2 },
    { name: 'Member Sizes', description: 'Confirm Member Sizes as per Drawing', order_index: 3 },
    { name: 'Welds', description: 'Confirm Welds are of acceptable quality (IE No Undercuts, Porosity, Lack of Fusion etc.)', order_index: 4 },
    { name: 'Paint Finish', description: 'Paint/Powder Coat Finish Acceptable', order_index: 5 },
    { name: 'Hardware Assembly', description: 'All Hardware Assembled and in Working Order', order_index: 6 },
    { name: 'Pressure Testing', description: 'Test Door to Specified Pressure and Hold for 5 Minutes', order_index: 7 },
    { name: 'Leakage Check', description: 'No Leakage During or After Pressure Test', order_index: 8 },
    { name: 'Structural Integrity', description: 'No Structural Deformation Under Pressure', order_index: 9 },
    { name: 'Seal Inspection', description: 'Door Seal in Good Condition and Properly Fitted', order_index: 10 },
    { name: 'Hinge Mechanism', description: 'Hinge Mechanism Functions Smoothly', order_index: 11 },
    { name: 'Locking Mechanism', description: 'Locking Mechanism Engages and Disengages Properly', order_index: 12 },
    { name: 'Safety Features', description: 'All Safety Features Present and Functional', order_index: 13 }
  ];

  const seedInspectionPoints = async () => {
    setLoading(true);
    setStatus('Seeding inspection points...');

    try {
      // Check if already exist
      const existingPoints = await getDocs(collection(db, 'inspection_points'));

      if (!existingPoints.empty) {
        setStatus(`Found ${existingPoints.size} existing inspection points. Skipping...`);
        showSuccess('Inspection points already exist!');
        setLoading(false);
        return;
      }

      // Add all points
      for (const point of inspectionPoints) {
        await addDoc(collection(db, 'inspection_points'), point);
      }

      setStatus(`✅ Successfully seeded ${inspectionPoints.length} inspection points!`);
      showSuccess('Inspection points seeded successfully!');
    } catch (error) {
      console.error('Error seeding inspection points:', error);
      setStatus(`❌ Error: ${error.message}`);
      showError('Failed to seed inspection points');
    }

    setLoading(false);
  };

  const updateDoorStatuses = async () => {
    setLoading(true);
    setStatus('Updating door statuses...');

    try {
      const doorsSnapshot = await getDocs(collection(db, 'doors'));

      if (doorsSnapshot.empty) {
        setStatus('No doors found in database.');
        setLoading(false);
        return;
      }

      let updatedCount = 0;
      for (const doorDoc of doorsSnapshot.docs) {
        const doorData = doorDoc.data();

        // Only update if missing status fields
        if (!doorData.inspection_status || !doorData.certification_status) {
          await updateDoc(doc(db, 'doors', doorDoc.id), {
            inspection_status: doorData.inspection_status || 'pending',
            certification_status: doorData.certification_status || 'pending',
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        }
      }

      setStatus(`✅ Updated ${updatedCount} doors with status fields!`);
      showSuccess(`Updated ${updatedCount} doors!`);
    } catch (error) {
      console.error('Error updating doors:', error);
      setStatus(`❌ Error: ${error.message}`);
      showError('Failed to update doors');
    }

    setLoading(false);
  };

  const setupAll = async () => {
    await seedInspectionPoints();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await updateDoorStatuses();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Database Setup
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                Set up the database with required data for inspections to work properly.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {/* Status Display */}
              {status && (
                <div className={`p-4 rounded-md ${status.includes('❌') ? 'bg-red-50' : 'bg-blue-50'}`}>
                  <p className="text-sm font-mono">{status}</p>
                </div>
              )}

              {/* Setup All Button */}
              <div className="flex flex-col space-y-3">
                <button
                  onClick={setupAll}
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Setting up...
                    </>
                  ) : (
                    '🚀 Setup All (Recommended)'
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or setup individually</span>
                  </div>
                </div>

                {/* Individual Buttons */}
                <button
                  onClick={seedInspectionPoints}
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  📋 Seed Inspection Points (13 items)
                </button>

                <button
                  onClick={updateDoorStatuses}
                  disabled={loading}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  🚪 Update Door Statuses
                </button>
              </div>
            </div>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    One-time setup required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This setup is required before you can start inspections. It only needs to be run once.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SetupDatabase;
