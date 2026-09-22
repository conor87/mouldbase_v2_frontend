import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { API_BASE } from "../config/api.js";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const dateInputValue = (daysFromToday = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const readinessMeta = (value) => {
  const key = String(value || "").toLowerCase();
  if (key === "ready") {
    return { label: "Gotowa", className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200" };
  }
  if (key === "requires_pre_production_check") {
    return { label: "Do sprawdzenia przed produkcją", className: "border-sky-500/40 bg-sky-500/15 text-sky-100" };
  }
  if (key === "blocked") {
    return { label: "Zablokowana", className: "border-red-500/40 bg-red-500/15 text-red-200" };
  }
  if (key === "requires_changeover") {
    return { label: "Wymaga przezbrojenia", className: "border-amber-500/40 bg-amber-500/15 text-amber-100" };
  }
  if (key === "requires_tpm") {
    return { label: "Wymaga TPM", className: "border-orange-500/40 bg-orange-500/15 text-orange-100" };
  }
  return { label: "Do analizy", className: "border-slate-500/40 bg-slate-500/15 text-slate-200" };
};

const SummaryCard = ({ icon, label, value, colorClass }) => (
  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-lg shadow-black/10">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      </div>
      <div className={`rounded-xl p-3 ${colorClass}`}>{icon}</div>
    </div>
  </div>
);

export default function MouldPreparationReport() {
  const [dateFrom, setDateFrom] = useState(() => dateInputValue());
  const [dateTo, setDateTo] = useState(() => dateInputValue(2));
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const token = localStorage.getItem("access_token");

  const refreshReport = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      setRows([]);
      setError("Wybierz obie daty raportu.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUnavailable(false);

      const response = await axios.get(`${API_BASE}/production-preparation/`, {
        params: { date_from: dateFrom, date_to: dateTo },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setRows(normalizeList(response.data));
    } catch (err) {
      console.error(err);
      setRows([]);
      if (err?.response?.status === 404) {
        setUnavailable(true);
      } else {
        setError(err?.response?.data?.detail || "Nie udało się pobrać raportu przygotowania form.");
      }
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, token]);

  useEffect(() => {
    refreshReport();
  }, [refreshReport]);

  const summary = useMemo(() => {
    const blocked = rows.filter((row) => row?.readiness === "blocked").length;
    const changeovers = rows.filter((row) => Boolean(row?.changeover_required)).length;
    const tpms = rows.filter((row) => Array.isArray(row?.open_tpms) && row.open_tpms.length > 0).length;
    const preProductionChecks = rows.filter(
      (row) => row?.readiness === "requires_pre_production_check"
    ).length;
    const ready = rows.filter((row) => row?.readiness === "ready").length;
    return { total: rows.length, blocked, changeovers, tpms, preProductionChecks, ready };
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (filter === "blocked") return rows.filter((row) => row?.readiness === "blocked");
    if (filter === "changeover") return rows.filter((row) => Boolean(row?.changeover_required));
    if (filter === "tpm") {
      return rows.filter((row) => Array.isArray(row?.open_tpms) && row.open_tpms.length > 0);
    }
    if (filter === "pre-production-check") {
      return rows.filter((row) => row?.readiness === "requires_pre_production_check");
    }
    if (filter === "ready") return rows.filter((row) => row?.readiness === "ready");
    return rows;
  }, [filter, rows]);

  return (
    <div className="p-4 text-white sm:p-6 lg:p-10">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-cyan-300">
            <ClipboardCheck className="h-8 w-8" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 sm:text-4xl">Raport przygotowania form</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
              Nadchodząca produkcja, aktualna i wymagana wersja formy, potrzebne przezbrojenia oraz otwarte TPM-y.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Od
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => {
                const nextDateFrom = event.target.value;
                setDateFrom(nextDateFrom);
                if (dateTo && nextDateFrom > dateTo) {
                  setDateTo(nextDateFrom);
                }
              }}
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Do
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>

          <button
            type="button"
            onClick={refreshReport}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Odśwież
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard icon={<CalendarClock className="h-6 w-6" aria-hidden="true" />} label="Zaplanowane formy" value={summary.total} colorClass="bg-blue-500/15 text-blue-300" />
        <SummaryCard icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />} label="Zablokowane" value={summary.blocked} colorClass="bg-red-500/15 text-red-300" />
        <SummaryCard icon={<ArrowLeftRight className="h-6 w-6" aria-hidden="true" />} label="Do przezbrojenia" value={summary.changeovers} colorClass="bg-amber-500/15 text-amber-300" />
        <SummaryCard icon={<Wrench className="h-6 w-6" aria-hidden="true" />} label="Z otwartym TPM" value={summary.tpms} colorClass="bg-orange-500/15 text-orange-300" />
        <SummaryCard icon={<ClipboardCheck className="h-6 w-6" aria-hidden="true" />} label="Do sprawdzenia przed produkcją" value={summary.preProductionChecks} colorClass="bg-sky-500/15 text-sky-300" />
        <SummaryCard icon={<CheckCircle2 className="h-6 w-6" aria-hidden="true" />} label="Gotowe" value={summary.ready} colorClass="bg-emerald-500/15 text-emerald-300" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["all", "Wszystkie"],
          ["blocked", "Zablokowane"],
          ["changeover", "Przezbrojenia"],
          ["tpm", "TPM"],
          ["pre-production-check", "Do sprawdzenia przed produkcją"],
          ["ready", "Gotowe"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              filter === value
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                : "border-slate-600 bg-slate-900/40 text-slate-300 hover:border-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-10 text-center text-slate-300">
          Ładowanie raportu...
        </div>
      )}

      {!loading && unavailable && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-6 w-6 shrink-0 text-blue-300" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-bold text-blue-200">Widok jest gotowy na dane produkcyjne</h2>
              <p className="mt-1 text-slate-300">
                Endpoint <code className="rounded bg-black/20 px-1.5 py-0.5">/production-preparation/</code> nie jest jeszcze dostępny.
                Po dodaniu tabeli produkcji raport automatycznie pokaże formy, przezbrojenia i TPM-y.
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{String(error)}</div>
      )}

      {!loading && !error && !unavailable && rows.length === 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold text-emerald-200">Brak form wymagających przygotowania</h2>
          <p className="mt-1 text-slate-300">W wybranym horyzoncie nie znaleziono zaplanowanej produkcji.</p>
        </div>
      )}

      {!loading && !error && !unavailable && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/30">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Start produkcji</th>
                <th className="px-4 py-3 text-left font-semibold">Wymagana forma</th>
                <th className="px-4 py-3 text-left font-semibold">Aktualna wersja</th>
                <th className="px-4 py-3 text-center font-semibold">Gotowość</th>
                <th className="px-4 py-3 text-center font-semibold">Przezbrojenie</th>
                <th className="px-4 py-3 text-center font-semibold">TPM</th>
                <th className="px-4 py-3 text-left font-semibold">Działania</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const productionId = row?.production_id ?? row?.id ?? index;
                const requiredNumber = row?.required_mould_number ?? row?.mould_number ?? "-";
                const currentNumber = row?.current_mould_number ?? "Nieustalona";
                const tpms = Array.isArray(row?.open_tpms) ? row.open_tpms : [];
                const actions = Array.isArray(row?.actions) ? row.actions : [];
                const readiness = readinessMeta(row?.readiness);

                return (
                  <tr key={String(productionId)} className="border-t border-white/10 align-top hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-4">{formatDateTime(row?.planned_start ?? row?.production_start)}</td>
                    <td className="px-4 py-4">
                      {requiredNumber !== "-" ? (
                        <Link
                          to={`/moulds/${encodeURIComponent(requiredNumber)}`}
                          className="font-semibold text-cyan-300 underline decoration-cyan-500/40 underline-offset-4 hover:text-cyan-200"
                        >
                          {requiredNumber}
                        </Link>
                      ) : (
                        "-"
                      )}
                      {row?.product && <div className="mt-1 text-xs text-slate-400">{row.product}</div>}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-200">{currentNumber}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${readiness.className}`}>
                        {readiness.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {row?.changeover_required ? (
                        <Link to="/changeovers" className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200">
                          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                          {row?.changeover?.status === "missing" ? "Zaplanować" : "Wykonać"}
                        </Link>
                      ) : (
                        <span className="text-emerald-300">Niepotrzebne</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {tpms.length > 0 ? (
                        <Link to="/tpm" className="inline-flex items-center gap-1 text-orange-300 hover:text-orange-200">
                          <Wrench className="h-4 w-4" aria-hidden="true" />
                          {tpms.length}
                        </Link>
                      ) : (
                        <span className="text-emerald-300">Brak</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {actions.length > 0 ? (
                        <ul className="space-y-1 text-slate-200">
                          {actions.map((action, actionIndex) => (
                            <li key={`${productionId}-${actionIndex}`} className="flex gap-2">
                              <span className="text-cyan-400">•</span>
                              <span>{action?.description ?? action?.label ?? action?.type ?? "Działanie wymagane"}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400">Brak działań</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visibleRows.length === 0 && (
            <div className="p-8 text-center text-slate-400">Brak pozycji dla wybranego filtra.</div>
          )}
        </div>
      )}
    </div>
  );
}
