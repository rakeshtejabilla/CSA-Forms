import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/useAuthStore';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  BarChart2,
  PlusCircle,
  Menu,
  X,
  User,
  Users,
  ChevronRight,
  Building2,
  LayoutTemplate,
} from 'lucide-react';
import SyncStatusIndicator from './SyncStatusIndicator';

export default function Sidebar() {
  const { user, token, logout } = useAuthStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabel = (role?: string) => {
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'ORG_ADMIN') return 'Org Admin';
    if (role === 'ENUMERATOR') return 'Enumerator';
    return role || 'User';
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', show: true },
    { id: 'forms', label: 'Manage Forms', icon: PlusCircle, path: '/forms', show: user?.role !== 'ENUMERATOR' },
    { id: 'farmers-master-list', label: 'Farmers Master List', icon: Users, path: '/farmers-master-list', show: user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN' },
    { id: 'farmers', label: 'Farmer Crop Data', icon: Building2, path: '/farmers', show: user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN' || user?.role === 'ENUMERATOR' },
    { id: 'submissions', label: 'Submissions', icon: FileSpreadsheet, path: '/submissions', show: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, path: '/analytics', show: user?.role !== 'ENUMERATOR' },
    { id: 'organizations', label: 'Organizations', icon: Building2, path: '/organizations', show: user?.role === 'SUPER_ADMIN' },
    { id: 'manage-templates', label: 'Prebuilt Templates', icon: LayoutTemplate, path: '/manage-templates', show: user?.role === 'SUPER_ADMIN' },
    { id: 'admin', label: 'Manage Users', icon: User, path: '/admin', show: user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN' },
  ].filter((n) => n.show);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + Toggle */}
      <div className={`flex items-center h-16 px-4 border-b border-slate-200 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={handleNavClick}>
            <div className="bg-brand-500 p-1.5 rounded-xl shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 text-sm tracking-tight block truncate">Form Builder</span>
              <span className="text-[9px] text-slate-400 font-medium uppercase tracking-widest block truncate">
                Center For Sustainable Agriculture
              </span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link to="/dashboard" className="flex items-center justify-center" onClick={handleNavClick}>
            <div className="bg-brand-500 p-1.5 rounded-xl">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
          title="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={handleNavClick}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sync Status */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-slate-100">
          <SyncStatusIndicator />
        </div>
      )}

      {/* User Profile + Actions */}
      {token && (
        <div className={`border-t border-slate-200 px-3 py-3 shrink-0 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <Link
                to="/profile"
                onClick={handleNavClick}
                className={`flex items-center gap-2.5 flex-1 min-w-0 p-1.5 rounded-xl hover:bg-slate-100 transition ${
                  location.pathname === '/profile' ? 'bg-slate-100' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-semibold block text-slate-800 truncate">{user?.name || 'User'}</span>
                  <span className="text-[10px] text-slate-400 font-medium block">{roleLabel(user?.role)}</span>
                </div>
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  to="/settings"
                  onClick={handleNavClick}
                  className={`p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition ${
                    location.pathname === '/settings' ? 'text-brand-600 bg-brand-50' : ''
                  }`}
                  title="Settings"
                >
                  <SettingsIcon className="h-4 w-4" />
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                to="/profile"
                onClick={handleNavClick}
                title={user?.name || 'Profile'}
                className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm hover:ring-2 hover:ring-brand-300 transition"
              >
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </Link>
              <Link
                to="/settings"
                onClick={handleNavClick}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                title="Settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </Link>
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: Top bar with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-50 flex items-center px-4 gap-3 shadow-sm">
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link to="/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
          <div className="bg-brand-500 p-1.5 rounded-xl">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-sm">Form Builder</span>
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white z-50 shadow-2xl transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0 shrink-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
