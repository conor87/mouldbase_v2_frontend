import { useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { API_BASE } from "../config/api.js";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });
const reportUrl = `${API_BASE}/service-shift-reports/current`;

export default function MES_ServiceShiftReport() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState(null);
  const [reportAction, setReportAction] = useState(null);

  const openReport = async () => {
    setOpen(true);
    setLoading(true);
    setReport(null);
    setError("");
    try {
      const response = await fetch(reportUrl, { headers: authHeaders() });
      if (!response.ok) throw new Error("Nie udało się pobrać raportu bieżącej zmiany.");
      setReport(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const choose = async (item, choice) => {
    const key = `${item.item_type}:${item.item_id}`;
    setSavingKey(key);
    setError("");
    try {
      const response = await fetch(reportUrl, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          item_type: item.item_type,
          item_id: item.item_id,
          remaining_hours: choice === "+" ? null : choice,
          is_completed: choice === "+",
        }),
      });
      if (!response.ok) throw new Error("Nie udało się zapisać deklaracji.");
      const saved = await response.json();
      setReport((current) => ({
        ...current,
        items: current.items.map((row) =>
          row.item_type === item.item_type && row.item_id === item.item_id
            ? { ...row, remaining_hours: saved.remaining_hours, is_completed: saved.is_completed }
            : row),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  };

  const changeApproval = async (action) => {
    setReportAction(action);
    setError("");
    try {
      const response = await fetch(`${reportUrl}/${action}`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Nie udało się zmienić zatwierdzenia raportu.");
      }
      setReport(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setReportAction(null);
    }
  };

  const confirmed = report?.items.some((item) => item.czy_zatwierdzony) ?? false;
  const complete = report?.items.length > 0
    && report.items.every((item) => item.is_completed || item.remaining_hours != null);

  return (
    <>
      <button type="button" onClick={openReport} title="Raport bieżącej zmiany" aria-label="Raport"
        className="rounded-lg border border-cyan-500/50 p-2 text-cyan-300 hover:bg-cyan-500/20">
        <ClipboardList className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Raport bieżącej zmiany serwisu">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-600 bg-slate-800 p-6 text-white shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Raport bieżącej zmiany</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Zamknij raport" className="rounded p-1 hover:bg-slate-700"><X /></button>
            </div>
            {loading && <p className="text-slate-300">Ładowanie zleceń…</p>}
            {error && <p className="mb-3 text-red-300" role="alert">{error}</p>}
            {!loading && report && (
              <>
                <p className="mb-3 text-sm text-slate-300">Od wejścia do pracy: {report.shift_started_at ? new Date(report.shift_started_at).toLocaleString("pl-PL") : "brak aktywnej sesji MES"}</p>
                <p className="mb-4 text-sm text-slate-300">Wybierz 1–8 godzin potrzebnych na następnej zmianie lub +, jeśli zlecenie zostanie wykonane.</p>
                {report.items.length === 0 && <p className="text-slate-300">Brak przezbrojeń i prac serwisowych na tej zmianie.</p>}
                <div className="space-y-3">
                  {report.items.map((item) => (
                    <div key={`${item.item_type}:${item.item_id}`} className="rounded-xl border border-slate-600 bg-slate-900/50 p-4">
                      <div className="mb-1 text-sm font-medium text-cyan-300">{item.item_type === "changeover" ? "Przezbrojenie" : "Serwis"}{item.workstation_names ? ` · ${item.workstation_names}` : ""}</div>
                      <div className="mb-3 font-semibold">{item.title}</div>
                      {item.item_type === "changeover" ? (
                        <div className="mb-3 grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
                          <span>Z formy: <strong className="text-white">{item.moulds?.find((m) => m.role === "from")?.mould_number || "—"}</strong></span>
                          <span>Na formę: <strong className="text-white">{item.moulds?.find((m) => m.role === "to")?.mould_number || "—"}</strong></span>
                        </div>
                      ) : (
                        <div className="mb-3 text-sm text-slate-300">Forma: <strong className="text-white">{item.moulds?.find((m) => m.role === "serviced")?.mould_number || item.item_id}</strong></div>
                      )}
                      <div className="flex flex-wrap gap-2" aria-label={`Pozostały czas dla ${item.title}`}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, "+"].map((choice) => {
                          const selected = choice === "+" ? item.is_completed : item.remaining_hours === choice;
                          return <button key={choice} type="button" onClick={() => choose(item, choice)}
                            disabled={savingKey !== null || reportAction !== null || confirmed}
                            title={choice === "+" ? "Zlecenie zostanie wykonane" : `Pozostało ${choice} godzin na następnej zmianie`}
                            aria-pressed={selected}
                            className={`min-w-10 rounded-lg border px-3 py-2 font-bold transition disabled:opacity-50 ${selected ? "border-cyan-400 bg-cyan-500/30" : "border-slate-600 hover:bg-slate-700"}`}>{choice}</button>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {confirmed ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-green-200">Raport zatwierdzony.</p>
                    <button type="button" onClick={() => changeApproval("unconfirm")} disabled={reportAction !== null}
                      className="rounded-lg border border-amber-500/50 px-4 py-2.5 font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50">
                      {reportAction === "unconfirm" ? "Odblokowywanie…" : "Edytuj raport"}
                    </button>
                  </div>
                ) : report.items.length > 0 && (
                  <button type="button" onClick={() => changeApproval("confirm")}
                    disabled={!complete || savingKey !== null || reportAction !== null}
                    className="mt-5 rounded-lg bg-green-600 px-5 py-2.5 font-semibold hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50">
                    {reportAction === "confirm" ? "Zatwierdzanie…" : "Zatwierdź raport"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
