import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  async function registerUser(e) {
    e.preventDefault();

    setMessage(""); // wyczyść poprzedni komunikat

    try {
      const res = await fetch("http://localhost:8000/auth/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        // komunikat (opcjonalnie) + przekierowanie
        setMessage("Rejestracja udana. Przekierowanie do logowania...");
        // od razu przekierowanie:
        navigate("/login", { replace: true });
      } else {
        // próbujemy najpierw odczytać JSON, a jak się nie uda – tekst
        let errorMsg = "Błąd rejestracji.";
        try {
          const data = await res.json();
          if (data.detail) {
            errorMsg = "Błąd: " + data.detail;
          } else {
            errorMsg = "Błąd: " + JSON.stringify(data);
          }
        } catch {
          const text = await res.text();
          if (text) {
            errorMsg = "Błąd: " + text;
          }
        }
        setMessage(errorMsg);
      }
    } catch (err) {
      setMessage("Błąd połączenia z serwerem.");
      console.error(err);
    }
  }

  return (
    <>
    <Navbar />
    <div className="flex justify-center text-center mt-20">
      <form onSubmit={registerUser} className="bg-slate-700 p-8 rounded-xl w-80">
        <h2 className="text-2xl font-bold mb-4">Rejestracja</h2>

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

        <button className="w-full bg-blue-500 py-2 rounded hover:bg-blue-600">
          Zarejestruj
        </button>

        {message && <p className="mt-4 text-sm">{message}</p>}
      </form>
    </div>
    </>
  );
}
