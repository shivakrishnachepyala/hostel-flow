import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { ExplorerPage } from './pages/ExplorerPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { GuestPage } from './pages/GuestPage';
import { EnrollmentPage } from './pages/EnrollmentPage';
import { ContactPage } from './pages/ContactPage';
import { ManagementLoginPage } from './pages/ManagementLoginPage';
import { ManagementDashboard } from './pages/ManagementDashboard';
import { StudentLoginPage } from './pages/StudentLoginPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import { StudentAuthProvider, StudentProtectedRoute } from './context/StudentAuthContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <StudentAuthProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="explorer" element={<ExplorerPage />} />
                <Route path="explore" element={<ExplorerPage />} />
                <Route path="availability" element={<AvailabilityPage />} />
                <Route path="guest-accommodation" element={<GuestPage />} />
                <Route path="guest" element={<GuestPage />} />
                <Route path="guest-stay" element={<GuestPage />} />
                <Route path="enrollment" element={<EnrollmentPage />} />
                <Route path="enroll" element={<EnrollmentPage />} />
                <Route path="contact" element={<ContactPage />} />
                
                {/* Student Portal Routes */}
                <Route path="student/login" element={<StudentLoginPage />} />
                <Route path="student" element={<StudentLoginPage />} />
                <Route
                  path="student/portal"
                  element={
                    <StudentProtectedRoute>
                      <StudentPortalPage />
                    </StudentProtectedRoute>
                  }
                />

                {/* Management / Staff Portal Routes */}
                <Route path="management/login" element={<ManagementLoginPage />} />
                <Route path="warden/login" element={<ManagementLoginPage />} />
                <Route path="warden" element={<ManagementLoginPage />} />
                <Route
                  path="management/dashboard"
                  element={
                    <ProtectedRoute>
                      <ManagementDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="warden/management"
                  element={
                    <ProtectedRoute>
                      <ManagementDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </StudentAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
