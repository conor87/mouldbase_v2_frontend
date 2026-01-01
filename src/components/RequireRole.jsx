// src/components/RequireRole.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getCurrentUser } from "../auth";

export default function RequireRole({ allowedRoles }) {
  const location = useLocation();
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
