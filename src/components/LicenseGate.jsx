import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { API_BASE } from "../config/api.js";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pl-PL");
};

export default function LicenseGate({ children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/license/status`);
        const data = await response.json();
        if (!ignore) setStatus(data);
      } catch {
        if (!ignore) {
          setStatus({
            valid: false,
            code: "backend_unavailable",
            message: "Nie mozna sprawdzic statusu licencji",
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadStatus();
    const interval = window.setInterval(loadStatus, 60000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-6 text-slate-100">
        Sprawdzanie licencji...
      </div>
    );
  }

  if (!status?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-6 text-slate-100">
        <div className="w-full max-w-lg rounded-lg border border-red-500/40 bg-slate-800 p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3 text-red-200">
            <AlertTriangle className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Licencja nieaktywna</h1>
          </div>
          <p className="text-sm leading-6 text-slate-200">{status?.message || "Licencja jest nieprawidlowa"}</p>
          {status?.valid_until && (
            <p className="mt-4 text-sm text-slate-400">Wazna do: {formatDate(status.valid_until)}</p>
          )}
        </div>
      </div>
    );
  }

  const showWarning = typeof status.days_remaining === "number" && status.days_remaining <= 30;

  return (
    <>
      {showWarning && (
        <div className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-center gap-2 border-b border-amber-400/30 bg-amber-950 px-4 py-2 text-sm text-amber-100">
          <ShieldCheck className="h-4 w-4" />
          Licencja wygasa {formatDate(status.valid_until)}.
        </div>
      )}
      <div className={showWarning ? "pt-9" : ""}>{children}</div>
    </>
  );
}
