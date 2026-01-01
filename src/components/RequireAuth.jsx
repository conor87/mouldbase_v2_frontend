import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function RequireAuth() {
  const location = useLocation();
  const token = localStorage.getItem("access_token");

  if (!token) {
    // jeśli brak tokena -> przekieruj na /login
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // jeśli jest token -> wyświetl chronione trasy
  return <Outlet />;
}
