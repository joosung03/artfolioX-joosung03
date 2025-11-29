import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface RequireAuthProps {
  children: ReactElement;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-root">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect unauthenticated users to the login page and remember where they came from
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
