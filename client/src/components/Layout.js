import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  CogIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['admin', 'inspector', 'engineer', 'client'] },
  { name: 'Doors', href: '/doors', icon: CubeIcon, roles: ['admin', 'inspector'] },
  { name: 'Inspections', href: '/inspections', icon: ClipboardDocumentCheckIcon, roles: ['admin', 'inspector'] },
  { name: 'Certifications', href: '/certifications', icon: ShieldCheckIcon, roles: ['admin', 'engineer', 'client'] },
  { name: 'Purchase Orders', href: '/admin/purchase-orders', icon: DocumentTextIcon, roles: ['admin'] },
  { name: 'Users', href: '/admin/users', icon: UserGroupIcon, roles: ['admin'] },
  { name: 'Settings', href: '/admin', icon: CogIcon, roles: ['admin'] },
];

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [companyLogoUrl, setCompanyLogoUrl] = useState(null);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.get('/admin/company-settings');
        const url = response.data?.spectiv_logo || response.data?.logo_url || null;
        if (mounted) {
          setCompanyLogoUrl(url);
          setLogoLoaded(true);
        }
      } catch (e) {
        // Ignore (non-admin roles used to be blocked; also works offline)
        if (mounted) {
          setCompanyLogoUrl(null);
          setLogoLoaded(true);
        }
      }
    };
    if (user) load();
    return () => { mounted = false; };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-gray-900/50 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
             onClick={() => setSidebarOpen(false)} />
        
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-600"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-gray-700" />
            </button>
          </div>
          <Sidebar navigation={filteredNavigation} currentPath={location.pathname} onLinkClick={() => setSidebarOpen(false)} user={user} companyLogoUrl={companyLogoUrl} logoLoaded={logoLoaded} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar navigation={filteredNavigation} currentPath={location.pathname} user={user} companyLogoUrl={companyLogoUrl} logoLoaded={logoLoaded} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <div className="flex items-center lg:hidden">
                <button
                  className="p-2 -ml-2 mr-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {logoLoaded ? (
                    <img src={companyLogoUrl || '/logo.png'} alt="Spectiv" className="h-7 sm:h-8 w-auto" />
                  ) : (
                    <div className="h-7 sm:h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-end">
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-sm text-gray-600 hidden md:block truncate max-w-[200px]">
                    Welcome, <span className="text-gray-900 font-medium">{user?.name}</span>
                  </span>
                  <Link
                    to="/profile"
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    title="Profile"
                  >
                    <UserIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    title="Sign Out"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 bg-gray-50">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ navigation, currentPath, onLinkClick, user, companyLogoUrl, logoLoaded }) {
  const activeHref = React.useMemo(() => {
    // Choose the most specific matching href so parent routes (e.g. /admin) don't
    // stay highlighted when a child route (e.g. /admin/users) is active.
    const matches = navigation.filter((item) => {
      if (item.href === '/') return currentPath === '/';
      return currentPath === item.href || currentPath.startsWith(`${item.href}/`);
    });

    if (matches.length === 0) return null;
    return matches.reduce((best, item) => (item.href.length > best.href.length ? item : best), matches[0]).href;
  }, [navigation, currentPath]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-8">
          {logoLoaded ? (
            <img src={companyLogoUrl || '/logo.png'} alt="Spectiv" className="h-10 w-auto" />
          ) : (
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          )}
        </div>
        
        {/* Role indicator */}
        <div className="px-4 mb-6">
          <div className="flex items-center px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-primary-600 mr-2"></div>
            <span className="text-sm text-gray-600">Role</span>
            <span className="ml-auto text-sm font-medium text-gray-900 capitalize">{user?.role}</span>
          </div>
        </div>
        
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = !!activeHref && activeHref === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onLinkClick}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Bottom section */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Layout;
