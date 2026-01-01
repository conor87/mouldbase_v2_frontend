import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  async function loginUser(e) {
    e.preventDefault();

    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);

    const res = await fetch("http://localhost:8000/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      setError("Niepoprawne dane logowania");
      return;
    }

    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);

    setError("");
    navigate(from, { replace: true }); // wraca tam, skąd user przyszedł
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
