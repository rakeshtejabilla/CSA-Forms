import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from './context/useAuthStore';
import { useOfflineStore } from './context/useOfflineStore';
import { useSettingsStore } from './context/useSettingsStore';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import FormBuilderPage from './pages/FormBuilder';
import ManageForms from './pages/ManageForms';
import SubmissionsPage from './pages/Submissions';
import AnalyticsPage from './pages/Analytics';
import AdminPage from './pages/Admin';
import OrganizationsPage from './pages/Organizations';
import DynamicFormRenderer from './pages/DynamicFormRenderer';
import ProfilePage from './pages/Profile';
import SettingsPage from './pages/Settings';
import NotFoundPage from './pages/NotFound';
import ManageTemplatesPage from './pages/ManageTemplates';
import Farmers from './pages/Farmers';
import FarmersMasterList from './pages/FarmersMasterList';

import { WifiOff } from 'lucide-react';

export default function App() {
  const { token, loadUser } = useAuthStore();
  const { isOnline, loadCounts } = useOfflineStore();
  const { theme } = useSettingsStore();
  const location = useLocation();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (token) loadUser();
  }, [token]);

  useEffect(() => {
    loadCounts();
  }, []);

  // Render Login page directly if path matches /login
  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Right: content area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-amber-700 text-sm flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4 animate-pulse" />
            <span>You are offline. Changes will be saved locally and synced when back online.</span>
          </div>
        )}

        {/* Mobile top-bar spacer */}
        <div className="md:hidden h-14 shrink-0" />

        {/* Main Content */}
        <main className="flex-1 w-full px-4 sm:px-6 py-6">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']}>
                  <ManageForms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmers-master-list"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']}>
                  <FarmersMasterList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmers"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'ENUMERATOR']}>
                  <Farmers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/new"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']}>
                  <FormBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/:formId"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']}>
                  <FormBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/:formId/fill"
              element={
                <ProtectedRoute>
                  <DynamicFormRenderer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/:formId/analytics"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions"
              element={
                <ProtectedRoute>
                  <SubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions/:formId"
              element={
                <ProtectedRoute>
                  <SubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizations"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <OrganizationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-templates"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <ManageTemplatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/new"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <FormBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/:formId"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <FormBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-400">
          <div className="px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 Form Builder — Center For Sustainable Agriculture. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-600 transition">Privacy</a>
              <a href="#" className="hover:text-slate-600 transition">Terms</a>
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}