import { type ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth";

export interface ProtectedRoutesProps {
  redirectTo?: string;
  fallback?: ReactNode;
}

export const ProtectedRoutes = ({
  redirectTo = "/login",
  fallback = null,
}: ProtectedRoutesProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return fallback;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to={redirectTo} replace />;
};
