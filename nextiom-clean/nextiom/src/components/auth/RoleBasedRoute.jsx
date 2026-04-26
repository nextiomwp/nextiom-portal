import React from 'react';
import { getCurrentUser } from '@/lib/auth';

function RoleBasedRoute({ children, allowedRoles, onUnauthorized }) {
  const user = getCurrentUser();

  if (!user) {
    onUnauthorized();
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    onUnauthorized();
    return null;
  }

  return <>{children}</>;
}

export default RoleBasedRoute;
