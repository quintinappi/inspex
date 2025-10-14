import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminSetup from './pages/AdminSetup';
import Dashboard from './pages/Dashboard';
import Doors from './pages/Doors';
import AddDoor from './pages/AddDoor';
import DoorDetail from './pages/DoorDetail';
import Inspections from './pages/Inspections';
import InspectionDetail from './pages/InspectionDetail';
import Certifications from './pages/Certifications';
import CertificationDetail from './pages/CertificationDetail';
import Admin from './pages/Admin';
import DoorTypesManagement from './pages/DoorTypesManagement';
import Profile from './pages/Profile';
import SetupDatabase from './pages/SetupDatabase';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="App min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin-setup" element={<AdminSetup />} />
            <Route 
              path="/*" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/doors" element={<Doors />} />
                      <Route path="/doors/add" element={<AddDoor />} />
                      <Route path="/doors/:id" element={<DoorDetail />} />
                      <Route path="/inspections" element={<Inspections />} />
                      <Route path="/inspections/:id" element={<InspectionDetail />} />
                      <Route path="/certifications" element={<Certifications />} />
                      <Route path="/certifications/:id" element={<CertificationDetail />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/admin/door-types" element={<DoorTypesManagement />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/setup" element={<SetupDatabase />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
