'use client';

import { Bell, Menu, LogOut, Building2, Check, ChevronRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useUI } from '@/context/ui-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface OrgOption {
  organizationId: string;
  organizationName: string;
  assignedAwards: any[];
}

export default function Topbar() {
  const { setSidebarOpen } = useUI();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [switchingOrg, setSwitchingOrg] = useState(false);
  const [allOrgs, setAllOrgs] = useState<OrgOption[]>([]);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData) return;

    const parsed = JSON.parse(userData);
    setUser(parsed);

    if (parsed.role === 'org-admin' && token) {
      fetch('/api/auth/my-organizations', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (r) => {
          const data = await r.json();
          if (r.ok && data.success && Array.isArray(data.data)) {
            setAllOrgs(data.data);
          } else {
            // Fall back to what's in localStorage
            setAllOrgs(parsed.organizations || []);
          }
        })
        .catch(() => {
          setAllOrgs(parsed.organizations || []);
        });
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !desktopDropdownRef.current?.contains(target) &&
        !mobileDropdownRef.current?.contains(target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOrgId: string =
    user?.organizationId != null ? String(user.organizationId) : '';

  const otherOrgs: OrgOption[] = allOrgs.filter(
    (o) => String(o.organizationId) !== currentOrgId
  );
  const hasMultipleOrgs = user?.role === 'org-admin' && otherOrgs.length > 0;

  const handleLogout = () => {
    toast.success('Logged out successfully');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenTimestamp');
    router.push('/login');
  };

  const handleSwitchOrg = async (org: OrgOption) => {
    if (String(org.organizationId) === currentOrgId) return;
    setSwitchingOrg(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/switch-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId: org.organizationId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to switch organization');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      setShowDropdown(false);
      toast.success(`Switched to ${org.organizationName}`);
      window.location.reload();
    } catch {
      toast.error('Failed to switch organization');
    } finally {
      setSwitchingOrg(false);
    }
  };

  // Shared dropdown JSX used by both desktop and mobile
  const dropdown = showDropdown && (
    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
      {/* User Info */}
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
        <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Building2 size={11} className="text-green-600 shrink-0" />
          <p className="text-xs text-green-700 font-medium truncate">
            {user?.organizationName || 'Organization'}
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {user?.role === 'org-admin' ? 'Admin' : 'Event Organizer'}
        </p>
      </div>

      {/* Switch Organization */}
      {hasMultipleOrgs && (
        <div className="border-b border-gray-200">
          <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Switch Organization
          </p>
          {/* Current org */}
          <div className="flex items-center gap-3 px-4 py-2 bg-green-50">
            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {user?.organizationName?.charAt(0).toUpperCase() || 'O'}
            </div>
            <span className="text-sm text-gray-800 font-medium truncate flex-1">
              {user?.organizationName}
            </span>
            <Check size={14} className="text-green-600 shrink-0" />
          </div>
          {/* Other orgs */}
          {otherOrgs.map((org) => (
            <button
              key={org.organizationId}
              onClick={() => handleSwitchOrg(org)}
              disabled={switchingOrg}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition disabled:opacity-60"
            >
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold shrink-0">
                {org.organizationName?.charAt(0).toUpperCase() || 'O'}
              </div>
              <span className="text-sm text-gray-700 truncate flex-1 text-left">
                {org.organizationName}
              </span>
              <ChevronRight size={14} className="text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Change Password */}
      <Link
        href="/dashboard/settings"
        onClick={() => setShowDropdown(false)}
        className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
      >
        <Lock size={16} className="text-gray-500" />
        Change Password
      </Link>

      {/* Logout */}
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
  );

  return (
    <header className="h-16 bg-white px-4 md:px-8 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button className="md:hidden text-black" onClick={() => setSidebarOpen(true)}>
          <Menu />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-6">
        <Bell className="text-gray-400 hidden sm:block cursor-pointer hover:text-gray-600" />
        <div className="w-0.5 h-8 bg-gray-200 md:flex hidden" />

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-black">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400">
              {user?.role === 'org-admin' ? 'Admin' : 'Event Organizer'}
              {user?.organizationName && ` • ${user.organizationName}`}
            </p>
          </div>

          <div className="relative" ref={desktopDropdownRef}>
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </button>
            {dropdown}
          </div>
        </div>

        <div className="md:hidden relative" ref={mobileDropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </button>
          {dropdown}
        </div>
      </div>
    </header>
  );
}
