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
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="explorer" element={<ExplorerPage />} />
          <Route path="availability" element={<AvailabilityPage />} />
          <Route path="guest-accommodation" element={<GuestPage />} />
          <Route path="enrollment" element={<EnrollmentPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="management/login" element={<ManagementLoginPage />} />
          <Route path="management/dashboard" element={<ManagementDashboard />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
