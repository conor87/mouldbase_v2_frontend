import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config/api.js";

const formatHours = (value) => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 }).format(value);

export default function WorkHours() {
  const authHeaders = () => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedStk, setExpandedStk] = useState([]);
  const invalidRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${API_BASE}/work-hours/tasks`, { signal: controller.signal, headers: authHeaders() })
      .then((response) => setTasks(response.data))
      .catch((err) => { if (!axios.isCancel(err)) setError(err.response?.data?.detail || "Nie udało się pobrać listy zadań."); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (invalidRange) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) { setLoading(true); setError(""); }
    });
    axios.get(`${API_BASE}/work-hours/summary`, {
      params: { task: task || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined },
      headers: authHeaders(),
      signal: controller.signal,
    })
      .then((response) => setData(response.data))
      .catch((err) => { if (!axios.isCancel(err)) { setError(err.response?.data?.detail || "Nie udało się pobrać godzin pracy."); setData(null); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [task, dateFrom, dateTo, invalidRange]);

  const filteredTasks = useMemo(() => tasks.filter((item) =>
    item.toLocaleLowerCase("pl").includes(taskSearch.toLocaleLowerCase("pl"))
  ), [tasks, taskSearch]);

  const maxHours = Math.max(1, ...(data?.months || []).map((item) => item.hours));
  const points = useMemo(() => {
    const months = data?.months || [];
    return months.map((item, index) => ({
      ...item,
      x: months.length === 1 ? 50 : 5 + index * 90 / (months.length - 1),
      y: 90 - item.hours * 80 / maxHours,
    }));
  }, [data, maxHours]);

  return (
    <div className="p-6 md:p-10 text-white space-y-6">
      <h1 className="text-4xl font-bold text-cyan-400">Work hours</h1>
      <div className="grid gap-4 md:grid-cols-3 rounded-2xl border border-white/10 bg-white/5 p-5">
        <label className="flex flex-col gap-2">Task
          <input className="rounded bg-slate-800 p-2" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Szukaj task" aria-label="Szukaj task" />
          <select className="rounded bg-slate-800 p-2" value={task} onChange={(event) => setTask(event.target.value)} aria-label="Wybierz task">
            <option value="">Wszystkie taski</option>
            {task && !filteredTasks.includes(task) && <option value={task}>{task}</option>}
            {filteredTasks.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">Data od
          <input type="date" className="rounded bg-slate-800 p-2" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="flex flex-col gap-2">Data do
          <input type="date" className="rounded bg-slate-800 p-2" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
      </div>
      {(invalidRange || error) && <p role="alert" className="text-red-400">{invalidRange ? "Data od musi być nie późniejsza niż data do." : error}</p>}
      {loading && <p>Ładowanie danych…</p>}
      {!invalidRange && !loading && data && <>
        <div className="flex flex-wrap gap-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p>Suma godzin: <strong className="text-cyan-300">{formatHours(data.total_hours)} h</strong></p>
          <p>Praca maszyn: {formatHours(data.machine_hours)} h</p>
          <p>Praca ludzi: {formatHours(data.human_hours)} h</p>
          <p>Koszt prac: <strong className="text-amber-300">{formatHours(data.total_cost)}</strong></p>
        </div>
        {data.unpriced_hours > 0 && <p className="text-amber-300">Bez wyliczonego kosztu: {formatHours(data.unpriced_hours)} h (brak stawki STK).</p>}
        {data.invalid_date_rows > 0 && <p className="text-amber-300">Pominięto {data.invalid_date_rows} wpisów z nieprawidłową datą.</p>}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-xl font-semibold">Ilość godzin według miesiąca</h2>
          {points.length === 0 ? <p>Brak danych dla wybranych filtrów.</p> : <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(650, points.length * 65) }}>
              <div className="text-sm text-slate-300">Ilość godzin</div>
              <div className="flex gap-2">
                <div className="flex h-72 flex-col justify-between text-xs text-slate-300 text-right">
                  {[1, 0.75, 0.5, 0.25, 0].map((fraction) => <span key={fraction}>{formatHours(maxHours * fraction)}</span>)}
                </div>
                <div className="flex-1">
              <div className="relative h-72">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Wykres liniowy godzin pracy według miesięcy">
                {[10, 30, 50, 70, 90].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#475569" strokeWidth="0.15" />)}
                <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#22d3ee" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
              </svg>
              {points.map((point) => <span key={point.month} className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300" style={{ left: `${point.x}%`, top: `${point.y}%` }} title={`${point.month}: ${formatHours(point.hours)} h`} />)}
              </div>
              <div className="relative h-8 text-xs text-slate-300">
                {points.map((point) => <span key={point.month} className="absolute -translate-x-1/2" style={{ left: `${point.x}%` }}>{point.month}</span>)}
              </div>
                </div>
              </div>
            </div>
          </div>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 overflow-x-auto">
          <h2 className="mb-4 text-xl font-semibold">Godziny według STK</h2>
          <table className="w-full min-w-[650px] text-sm">
            <thead><tr className="border-b border-white/20 text-left"><th className="py-2">STK / pozycja</th><th className="py-2 text-right">Godziny</th><th className="py-2 text-right">Koszt</th></tr></thead>
            <tbody>
              {(data.groups || []).map((group) => <React.Fragment key={group.stk}>
                <tr className="border-b border-white/10">
                  <td className="py-2"><button type="button" aria-expanded={expandedStk.includes(group.stk)} className="text-cyan-300 hover:underline" onClick={() => setExpandedStk((previous) => previous.includes(group.stk) ? previous.filter((stk) => stk !== group.stk) : [...previous, group.stk])}>{expandedStk.includes(group.stk) ? "▾" : "▸"} STK {group.stk}</button></td>
                  <td className="py-2 text-right font-semibold">{formatHours(group.hours)} h</td>
                  <td className="py-2 text-right">{formatHours(group.cost)}</td>
                </tr>
                {expandedStk.includes(group.stk) && <tr><td colSpan={3} className="pb-4 pl-5">
                  <table className="w-full text-xs"><thead><tr className="text-left text-slate-400"><th className="py-1">Task</th><th>Źródło</th><th>Maszyna / pracownik</th><th className="text-right">Godziny</th><th className="text-right">Koszt</th></tr></thead><tbody>
                    {group.items.map((item, index) => <tr key={`${item.task}-${item.source}-${item.item}-${index}`} className="border-t border-white/5"><td className="py-1">{item.task || "—"}</td><td>{item.source === "machine" ? "Maszyna" : "Pracownik"}</td><td>{item.item || "—"}</td><td className="text-right">{formatHours(item.hours)} h</td><td className="text-right">{item.cost == null ? "Brak stawki" : formatHours(item.cost)}</td></tr>)}
                  </tbody></table>
                </td></tr>}
              </React.Fragment>)}
              <tr className="border-t border-white/30 font-bold"><td className="py-3">Suma</td><td className="text-right">{formatHours(data.total_hours)} h</td><td className="text-right">{formatHours(data.total_cost)}</td></tr>
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}
