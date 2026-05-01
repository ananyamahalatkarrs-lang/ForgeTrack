import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function RoleGuard({ children, allowedRoles }) {
  // Temporarily bypassed RoleGuard for debugging
  return children;
}
