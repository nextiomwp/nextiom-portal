import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import ModeratorDashboard from '@/pages/ModeratorDashboard';
import CustomerDashboard from '@/pages/CustomerDashboard';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
import RegisterPage from '@/pages/RegisterPage';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { initializeDemoData } from '@/lib/storage';
import InvoicePrintPage from '@/pages/invoices/InvoicePrintPage';
import ActivityLogPrintPage from '@/pages/ActivityLogPrintPage';
import QuotationPrintPage from '@/pages/quotations/QuotationPrintPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import ImpersonationDashboard from '@/pages/impersonation/ImpersonationDashboard';
import ImpersonationGuard from '@/utils/impersonationGuard';

function App() {
  
  useEffect(() => {
    // Initialize demo data on app start
    initializeDemoData();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50">
          <Helmet>
              <title>Nextiom Portal</title>
              <meta name="description" content="Nextiom Customer & Product Management System" />
          </Helmet>

          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invoices/print" element={<InvoicePrintPage />} />
            <Route path="/quotations/print" element={<QuotationPrintPage />} />
            <Route path="/activity-log/print" element={<ActivityLogPrintPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['customer', 'admin', 'moderator']}>
                   {/* Fallback - ProtectedRoute will redirect based on role */}
                   <div /> 
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                   <Dashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/moderator-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['moderator']}>
                   <ModeratorDashboard />
                </ProtectedRoute>
              } 
            />

            <Route
              path="/admin/impersonate/:customerId"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ImpersonationGuard>
                    <ImpersonationDashboard />
                  </ImpersonationGuard>
                </ProtectedRoute>
              }
            />
            
            <Route 
              path="/customer-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                   <CustomerDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
