import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RoleGuard({ children, allowedRoles }) {
  const { session, role, loading, status } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center space-y-4">
        <div className="text-secondary animate-pulse text-body-lg">Authenticating...</div>
        <div className="text-tertiary text-caption font-mono opacity-50">{status}</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}
