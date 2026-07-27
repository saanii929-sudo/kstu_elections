'use client';

import { Bell, Menu, LogOut } from 'lucide-react';
import { useUI } from '@/context/ui-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';

export default function AdminTopBar() {
  const { setSidebarOpen } = useUI();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    toast.success('Logged out successfully');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white px-4 md:px-8 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu */}
        <button
          className="md:hidden text-black"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-6">
        <Bell className="text-gray-400 hidden sm:block cursor-pointer hover:text-gray-600" />
        <div className='w-0.5 h-8 bg-gray-200 md:flex hidden'></div>
        
        {/* Desktop View */}
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-black">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400">
              {user?.role === 'org-admin' ? 'Admin' : 'SuperAdmin'}
              {user?.organizationName && ` • ${user.organizationName}`}
            </p>
          </div>

          <div className="w-9 h-9 rounded-full bg-[#1C2338] flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Mobile View - Avatar with Dropdown */}
        <div className="md:hidden relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {user?.role === 'org-admin' ? 'Admin' : 'Event Organizer'}
                </p>
                {user?.organizationName && (
                  <p className="text-xs text-gray-500 mt-1">{user.organizationName}</p>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  setShowDropdown(false);
                  handleLogout();
                }}
                className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
