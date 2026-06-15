import React, { useEffect, useState } from "react";
import Navbar from "./Navbar.jsx";
import { API_BASE } from "../config/api.js";
import { ShieldAlert, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";

export default function SuperAdminPanel() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/settings/auto-logout`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać ustawień.");
        return res.json();
      })
      .then((data) => {
        setEnabled(data.enabled);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleToggle = async () => {
    const token = localStorage.getItem("access_token");
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/settings/auto-logout`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (!res.ok) {
        throw new Error("Błąd podczas aktualizacji ustawienia.");
      }

      const data = await res.json();
      setEnabled(data.enabled);
      setMessage(`Automatyczne wylogowywanie zostało ${data.enabled ? "WŁĄCZONE" : "WYŁĄCZONE"}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800/90 text-white font-sans">
      <Navbar titleOverride={
        <>
          <span className="text-white">SuperAdmin</span>
          <span className="text-cyan-400"> Panel</span>
        </>
      } />
      
      <div className="pt-24 px-6 max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Zarządzanie systemem</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Panel Superadministratora</h1>
          <p className="text-slate-400 text-sm mt-1">Ustawienia globalne aplikacji MouldBook 2.0</p>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur-md shadow-xl hover:border-slate-600 transition-all duration-300">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Automatyczne wylogowywanie o 23:45</h3>
                <p className="text-slate-400 text-sm max-w-lg">
                  Kiedy ta opcja jest aktywna, system każdego dnia o godzinie 23:45 automatycznie wyloguje wszystkich zalogowanych użytkowników i zwolni przypisane stanowiska produkcyjne oraz serwisowe.
                </p>
              </div>

              <button
                onClick={handleToggle}
                disabled={saving}
                className={`flex items-center justify-center p-1 rounded-full transition-all duration-300 ${
                  enabled ? "text-cyan-400" : "text-slate-500"
                } hover:scale-105 disabled:opacity-50`}
                title={enabled ? "Kliknij, aby wyłączyć" : "Kliknij, aby włączyć"}
              >
                {enabled ? (
                  <ToggleRight className="w-16 h-16" />
                ) : (
                  <ToggleLeft className="w-16 h-16" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
