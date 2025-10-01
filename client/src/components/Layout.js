import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CubeIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  CogIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['admin', 'inspector', 'engineer', 'client'] },
  { name: 'Doors', href: '/doors', icon: CubeIcon, roles: ['admin', 'inspector', 'engineer'] },
  { name: 'Inspections', href: '/inspections', icon: ClipboardDocumentCheckIcon, roles: ['admin', 'inspector'] },
  { name: 'Certifications', href: '/certifications', icon: ShieldCheckIcon, roles: ['admin', 'engineer'] },
  { name: 'Downloads', href: '/downloads', icon: DocumentArrowDownIcon, roles: ['client', 'admin'] },
  { name: 'Admin', href: '/admin', icon: CogIcon, roles: ['admin'] },
];

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
             onClick={() => setSidebarOpen(false)} />
        
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <Sidebar navigation={filteredNavigation} currentPath={location.pathname} onLinkClick={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar navigation={filteredNavigation} currentPath={location.pathname} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <button
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              
              <div className="flex-1 lg:flex lg:items-center lg:justify-between">
                <h1 className="text-lg font-semibold text-gray-900 lg:hidden">INSPEX</h1>
                <div className="lg:flex-1" />
                
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    Welcome, {user?.name}
                  </span>
                  <div className="relative">
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
                    >
                      <UserIcon className="h-5 w-5" />
                      <span className="hidden sm:block">Profile</span>
                    </Link>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span className="hidden sm:block">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ navigation, currentPath, onLinkClick }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-2xl font-bold text-primary-600">INSPEX</h1>
        </div>
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = currentPath === item.href || 
                           (item.href !== '/' && currentPath.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onLinkClick}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-primary-50 border-r-4 border-primary-500 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default Layout;