import React, { useEffect, useState } from "react";
import Navbar from "./Navbar.jsx";
import { API_BASE } from "../config/api.js";
import {
  CalendarDays,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pl-PL");
};

export default function SuperAdminPanel() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [licenseStatus, setLicenseStatus] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    Promise.all([
      fetch(`${API_BASE}/settings/auto-logout`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) throw new Error("Nie udalo sie pobrac ustawien.");
        return res.json();
      }),
      fetch(`${API_BASE}/license/status`).then((res) => res.json()),
    ])
      .then(([settings, license]) => {
        setEnabled(settings.enabled);
        setLicenseStatus(license);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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
        throw new Error("Blad podczas aktualizacji ustawienia.");
      }

      const data = await res.json();
      setEnabled(data.enabled);
      setMessage(`Automatyczne wylogowywanie zostalo ${data.enabled ? "WLACZONE" : "WYLACZONE"}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800/90 text-white font-sans">
      <Navbar
        titleOverride={
          <>
            <span className="text-white">SuperAdmin</span>
            <span className="text-cyan-400"> Panel</span>
          </>
        }
      />

      <div className="pt-24 px-6 max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Zarzadzanie systemem</span>
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
          <div className="space-y-6">
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur-md shadow-xl hover:border-slate-600 transition-all duration-300">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Automatyczne wylogowywanie o 23:45</h3>
                  <p className="text-slate-400 text-sm max-w-lg">
                    Kiedy ta opcja jest aktywna, system kazdego dnia o godzinie 23:45 automatycznie wyloguje
                    wszystkich zalogowanych uzytkownikow i zwolni przypisane stanowiska produkcyjne oraz serwisowe.
                  </p>
                </div>

                <button
                  onClick={handleToggle}
                  disabled={saving}
                  className={`flex items-center justify-center p-1 rounded-full transition-all duration-300 ${
                    enabled ? "text-cyan-400" : "text-slate-500"
                  } hover:scale-105 disabled:opacity-50`}
                  title={enabled ? "Kliknij, aby wylaczyc" : "Kliknij, aby wlaczyc"}
                >
                  {enabled ? (
                    <ToggleRight className="w-16 h-16" />
                  ) : (
                    <ToggleLeft className="w-16 h-16" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur-md shadow-xl hover:border-slate-600 transition-all duration-300">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <ShieldCheck className={`h-5 w-5 ${licenseStatus?.valid ? "text-emerald-400" : "text-red-400"}`} />
                    <h3 className="text-lg font-bold text-white">Licencja aplikacji</h3>
                  </div>
                  <p className="text-sm text-slate-400">
                    {licenseStatus?.valid
                      ? "Licencja jest aktywna."
                      : licenseStatus?.message || "Licencja nie jest aktywna."}
                  </p>
                  {licenseStatus?.customer && (
                    <p className="mt-2 text-sm text-slate-300">Klient: {licenseStatus.customer}</p>
                  )}
                </div>

                <div className="grid min-w-full grid-cols-1 gap-3 sm:grid-cols-2 md:min-w-[360px]">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <CalendarDays className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Wazna do</span>
                    </div>
                    <div className="text-xl font-bold text-white">{formatDate(licenseStatus?.valid_until)}</div>
                    {typeof licenseStatus?.days_remaining === "number" && (
                      <div className="mt-1 text-xs text-slate-400">Pozostalo dni: {licenseStatus.days_remaining}</div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-400">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider">Uzytkownicy</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {licenseStatus?.max_users ? licenseStatus.max_users : "Bez limitu"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">Limit z pliku licencji</div>
                  </div>
                </div>
              </div>

              {Array.isArray(licenseStatus?.modules) && licenseStatus.modules.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {licenseStatus.modules.map((module) => (
                    <span
                      key={module}
                      className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100"
                    >
                      {module}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
