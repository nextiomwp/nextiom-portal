import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import CustomerDashboard from '@/pages/CustomerDashboard';
import Login from '@/pages/Login';
import AdminLogin from '@/pages/AdminLogin';
import RegisterPage from '@/pages/RegisterPage';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { initializeDemoData } from '@/lib/storage';

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
              <title>Nextiom - Digital Services Platform</title>
              <meta name="description" content="Nextiom Customer & Product Management System" />
          </Helmet>

          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['customer', 'admin']}>
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