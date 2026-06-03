import React from 'react';
import { Navigate } from 'react-router-dom';

function ImpersonationGuard({ children }) {
  const token = sessionStorage.getItem('impersonation_token');
  const user = sessionStorage.getItem('impersonated_user');

  if (!token || !user) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return <>{children}</>;
}

export default ImpersonationGuard;
