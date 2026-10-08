import axios from "axios";
import { useEffect, useState } from "react";
import { ScrollText, X } from "lucide-react";
import { API_BASE } from "../config/api.js";

export default function ProductionSyncLogsModal({ token, onClose, formatDateTime }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${API_BASE}/production/sync/logs`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then((response) => setData(response.data))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err?.response?.status === 403
            ? "Brak uprawnień do logów synchronizacji."
            : "Nie udało się pobrać logów synchronizacji produkcji.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="production-sync-logs-title"
        className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-950 shadow-2xl shadow-black/60"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-slate-950 px-5 py-4 sm:px-7">
          <div className="flex items-start gap-3">
            <ScrollText className="mt-1 h-6 w-6 shrink-0 text-cyan-300" aria-hidden="true" />
            <div>
              <h2 id="production-sync-logs-title" className="text-xl font-bold text-cyan-200">
                Niezsynchronizowane pozycje produkcji
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Pozycje odrzucone jako nieprawidłowe podczas ostatniej udanej synchronizacji.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} autoFocus
            className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Zamknij logi synchronizacji">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 p-5 sm:p-7">
          {loading && <p role="status" className="text-slate-300">Ładowanie logów…</p>}
          {error && <p role="alert" className="text-red-200">{error}</p>}
          {!loading && !error && (
            <>
              <p className="text-sm text-slate-300">
                Ostatnia synchronizacja: {formatDateTime(data?.last_success_at)}
                {" · "}Pominięte pozycje: {data?.skipped_invalid ?? 0}
              </p>
              {!data?.details_available ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
                  Szczegóły pominiętych pozycji nie zostały zapisane dla tej synchronizacji.
                  Będą dostępne po kolejnej synchronizacji produkcji.
                </p>
              ) : items.length === 0 ? (
                <p className="text-emerald-200">Brak pozycji odrzuconych jako nieprawidłowe.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[850px] text-sm">
                    <thead className="bg-white/5 text-left text-slate-200">
                      <tr>
                        {["Wiersz źródłowy", "Forma", "Wyrób / kod", "Start produkcji", "Koniec produkcji", "Powód pominięcia"].map((label) => (
                          <th key={label} className="px-4 py-3 font-semibold">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.row_number ?? index} className="border-t border-white/10 align-top text-slate-300">
                          <td className="px-4 py-3">{item.row_number ?? "—"}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-semibold">{item.mould_number || "Brak numeru"}</td>
                          <td className="px-4 py-3">
                            <div>{item.product || "—"}</div>
                            <div className="mt-1 text-xs text-slate-400">{item.product_code || "—"}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{formatDateTime(item.planned_start)}</td>
                          <td className="whitespace-nowrap px-4 py-3">{formatDateTime(item.planned_end)}</td>
                          <td className="px-4 py-3 text-amber-100">{item.reason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
