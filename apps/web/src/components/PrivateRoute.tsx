import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {

    return <div>加载中...</div>;
  }

  if (!isAuthenticated) {

    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}