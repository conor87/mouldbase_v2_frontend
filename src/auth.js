import { jwtDecode } from "jwt-decode";

export function getCurrentUser() {
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded;
  } catch {
    return null;
  }
}
