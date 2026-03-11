import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { API_BASE } from "../config/api.js";



export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  async function loginUser(e) {
    e.preventDefault();

    try {
      setError("");

      const body = new URLSearchParams();
      body.append("username", username);
      body.append("password", password);

      const res = await fetch(`${API_BASE}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        setError("Niepoprawne dane logowania");
        return;
      }

      const data = await res.json();

      // ✅ ZAPIS TOKENA
      localStorage.setItem("access_token", data.access_token);

      // ✅ ZAPIS USERNAME (potrzebne do /auth/{username})
      localStorage.setItem("username", username);

      // ✅ POBRANIE ROLI + ID i zapis do localStorage
      const meRes = await fetch(`${API_BASE}/auth/${encodeURIComponent(username)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (meRes.ok) {
        const me = await meRes.json();
        if (me?.role) localStorage.setItem("role", me.role);
        if (me?.id != null) localStorage.setItem("user_id", String(me.id));
        if (me?.username) localStorage.setItem("username", me.username);
      } else {
        // jeśli nie uda się pobrać roli, to nadal zaloguje,
        // ale np. przyciski admina mogą się nie pojawić
        console.warn("Nie udało się pobrać roli użytkownika");
      }

      // Decode user info from JWT token as fallback
      try {
        const decoded = JSON.parse(atob(data.access_token.split(".")[1]));
        const userId = decoded.id ?? decoded.user_id ?? null;
        const uname = decoded.sub ?? decoded.username ?? username;
        // Ensure user_id and role are in localStorage (fallback if /auth/{username} failed)
        if (userId && !localStorage.getItem("user_id")) localStorage.setItem("user_id", String(userId));
        if (decoded.role && !localStorage.getItem("role")) localStorage.setItem("role", decoded.role);
        if (uname && !localStorage.getItem("username")) localStorage.setItem("username", uname);
        if (userId) {
          const now = new Date();
          const p = (n) => String(n).padStart(2, "0");
          const created_at = `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
          await fetch(`${API_BASE}/mes-session/logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.access_token}` },
            body: JSON.stringify({ user_id: userId, username: uname, action: "login", created_at }),
          });
        }
      } catch { /* ignore */ }

      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError("Błąd logowania (problem z połączeniem).");
    }
  }

  return (
    <>
      <Navbar />
      <div className="flex justify-center mt-20">
        <form onSubmit={loginUser} className="bg-slate-700 p-8 rounded-xl w-80">
          <h2 className="text-2xl text-center font-bold mb-4">Logowanie</h2>

          <input
            className="w-full text-center p-2 mb-3 bg-slate-600 rounded"
            type="text"
            placeholder="Nazwa użytkownika"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full text-center p-2 mb-3 bg-slate-600 rounded"
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="w-full bg-green-500 py-2 rounded hover:bg-green-600">
            Zaloguj
          </button>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </form>
      </div>
    </>
  );
}
