import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../layouts/AppLayout';
import { LoadingState } from '../components/ui';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import OnboardingPage from '../pages/onboarding/OnboardingPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import DocumentsPage from '../pages/documents/DocumentsPage';
import RecordsPage from '../pages/records/RecordsPage';
import TimelinePage from '../pages/timeline/TimelinePage';
import MedicinesPage from '../pages/medicines/MedicinesPage';
import TrendsPage from '../pages/trends/TrendsPage';
import DoctorsPage from '../pages/doctors/DoctorsPage';
import CaregiversPage from '../pages/caregivers/CaregiversPage';
import AbhaPage from '../pages/abha/AbhaPage';
import EmergencyPage from '../pages/emergency/EmergencyPage';
import PublicEmergencyView from '../pages/emergency/PublicEmergencyView';
import CopilotPage from '../pages/copilot/CopilotPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import SettingsPage from '../pages/settings/SettingsPage';
import ProfilePage from '../pages/profile/ProfilePage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Loading Healthify..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  const { user, logout } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/emergency/view/:userId" element={<PublicEmergencyView />} />

        {/* Onboarding */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Master Application Layout with Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout user={user} onLogout={logout} />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/medicines" element={<MedicinesPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/caregivers" element={<CaregiversPage />} />
          <Route path="/abha" element={<AbhaPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
