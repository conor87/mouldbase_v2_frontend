import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

//const API_BASE = import.meta?.env?.VITE_API_BASE ?? "";
//const API_BASE = import.meta?.env?.VITE_API_BASE ?? "http://localhost:8000";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";



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
