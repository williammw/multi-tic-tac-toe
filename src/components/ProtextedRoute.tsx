// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex justify-center p-12">Loading...</div>;
  }

  if (!user) {
    // Redirect to home page but save the location they were trying to access
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}