import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config/api.js";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.logs)) return payload.logs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const getRowDate = (row) =>
  row?.created || row?.changed || row?.updated || row?.created_at || row?.timestamp || null;

const getChangeoverDate = (row) =>
  row?.available_date || row?.needed_date || row?.updated || row?.created || null;

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Dashboard() {
  const token = localStorage.getItem("access_token");
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const [tpms, setTpms] = useState([]);
  const [changeovers, setChangeovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [yearFilter, setYearFilter] = useState("all");

  const refreshAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resTpm, resChangeovers] = await Promise.all([
        axios.get(`${API_BASE}/tpm/`, {
          params: { limit: 5000 },
          headers: { ...authHeaders() },
        }),
        axios.get(`${API_BASE}/changeovers/`, {
          params: { limit: 5000 },
          headers: { ...authHeaders() },
        }),
      ]);

      setTpms(normalizeList(resTpm.data));
      setChangeovers(normalizeList(resChangeovers.data));
    } catch (err) {
      console.error(err);
      setError("Nie udalo sie pobrac danych.");
      setTpms([]);
      setChangeovers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const years = useMemo(() => {
    const set = new Set();
    (tpms || []).forEach((row) => {
      const raw = getRowDate(row);
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      set.add(d.getFullYear());
    });
    const list = Array.from(set).sort((a, b) => b - a).map(String);
    return ["all", ...list];
  }, [tpms]);

  const monthBuckets = useMemo(() => {
    const buckets = months.map(() => ({ total: 0, open: 0 }));

    (tpms || []).forEach((row) => {
      const raw = getRowDate(row);
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;

      const year = String(d.getFullYear());
      if (yearFilter !== "all" && year !== yearFilter) return;

      const monthIndex = d.getMonth();
      buckets[monthIndex].total += 1;

      const statusRaw = row?.status ?? row?.state ?? row?.status_code;
      const statusNum = Number(statusRaw);
      if (statusNum !== 2) {
        buckets[monthIndex].open += 1;
      }
    });

    return buckets;
  }, [tpms, yearFilter]);

  const changeoverBuckets = useMemo(() => {
    const buckets = months.map(() => ({ total: 0, open: 0 }));

    (changeovers || []).forEach((row) => {
      const raw = getChangeoverDate(row);
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;

      const year = String(d.getFullYear());
      if (yearFilter !== "all" && year !== yearFilter) return;

      const monthIndex = d.getMonth();
      buckets[monthIndex].total += 1;

      if (!row?.czy_wykonano) {
        buckets[monthIndex].open += 1;
      }
    });

    return buckets;
  }, [changeovers, yearFilter]);

  const totals = useMemo(() => {
    return monthBuckets.reduce(
      (acc, m) => {
        acc.total += m.total;
        acc.open += m.open;
        return acc;
      },
      { total: 0, open: 0 }
    );
  }, [monthBuckets]);

  const changeoverTotals = useMemo(() => {
    return changeoverBuckets.reduce(
      (acc, m) => {
        acc.total += m.total;
        acc.open += m.open;
        return acc;
      },
      { total: 0, open: 0 }
    );
  }, [changeoverBuckets]);

  const maxValue = useMemo(() => {
    let max = 0;
    monthBuckets.forEach((m) => {
      if (m.total > max) max = m.total;
      if (m.open > max) max = m.open;
    });
    return max;
  }, [monthBuckets]);

  const maxChangeoverValue = useMemo(() => {
    let max = 0;
    changeoverBuckets.forEach((m) => {
      if (m.total > max) max = m.total;
      if (m.open > max) max = m.open;
    });
    return max;
  }, [changeoverBuckets]);

  const yTicks = useMemo(() => {
    if (!maxValue) return [0];
    const steps = 4;
    const stepSize = Math.max(1, Math.ceil(maxValue / steps));
    const ticks = [];
    for (let i = steps; i >= 0; i -= 1) {
      ticks.push(i * stepSize);
    }
    return ticks;
  }, [maxValue]);

  const changeoverTicks = useMemo(() => {
    if (!maxChangeoverValue) return [0];
    const steps = 4;
    const stepSize = Math.max(1, Math.ceil(maxChangeoverValue / steps));
    const ticks = [];
    for (let i = steps; i >= 0; i -= 1) {
      ticks.push(i * stepSize);
    }
    return ticks;
  }, [maxChangeoverValue]);

  return (
    <div className="p-10 text-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-4xl text-cyan-400 font-bold">Dashboard</h1>
          <div className="text-sm text-slate-300">
            TPM: zgloszone i niezamkniete w podziale na miesiace.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYearFilter(y)}
              className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition ${
                yearFilter === y
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "border-slate-700 text-gray-300 hover:border-slate-500"
              }`}
            >
              {y === "all" ? "Calosc" : y}
            </button>
          ))}
        </div>
      </div>

      {loading && <p>Ladowanie danych.</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <>
          <div className="text-sm text-slate-300 mb-2">TPM</div>
          <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
            <div className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-cyan-400 inline-block" />
              Zgloszone: <span className="font-semibold text-cyan-200">{totals.total}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
              Niezamkniete: <span className="font-semibold text-amber-200">{totals.open}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-400 mb-2">Ilosc</div>
            <div className="flex">
              <div className="h-40 pr-3 flex flex-col justify-between text-xs text-slate-400">
                {yTicks.map((v, i) => (
                  <div key={`${v}-${i}`} className="leading-none">
                    {v}
                  </div>
                ))}
              </div>
              <div className="flex-1">
                <div className="relative h-40">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {yTicks.map((v, i) => (
                      <div key={`line-${v}-${i}`} className="border-t border-white/10" />
                    ))}
                  </div>

                  <div className="absolute inset-0 grid grid-cols-12 gap-3 items-end z-10">
                    {monthBuckets.map((m, idx) => {
                      const totalHeight = maxValue ? `${(m.total / maxValue) * 100}%` : "0%";
                      const openHeight = maxValue ? `${(m.open / maxValue) * 100}%` : "0%";

                      return (
                        <div key={months[idx]} className="h-full w-full flex items-end justify-center gap-2">
                          <div
                            className="w-4 rounded-md bg-cyan-400/90"
                            style={{ height: totalHeight }}
                            title={`Zgloszone: ${m.total}`}
                          />
                          <div
                            className="w-4 rounded-md bg-amber-400/90"
                            style={{ height: openHeight }}
                            title={`Niezamkniete: ${m.open}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 mt-2">
                  {months.map((label) => (
                    <div key={label} className="text-xs text-slate-300 text-center">
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-sm text-slate-300 mb-2">Przezbrojenia</div>
          <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
            <div className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-cyan-400 inline-block" />
              Wszystkie: <span className="font-semibold text-cyan-200">{changeoverTotals.total}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
              Niewykonane: <span className="font-semibold text-amber-200">{changeoverTotals.open}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-400 mb-2">Ilosc</div>
            <div className="flex">
              <div className="h-40 pr-3 flex flex-col justify-between text-xs text-slate-400">
                {changeoverTicks.map((v, i) => (
                  <div key={`${v}-${i}`} className="leading-none">
                    {v}
                  </div>
                ))}
              </div>
              <div className="flex-1">
                <div className="relative h-40">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {changeoverTicks.map((v, i) => (
                      <div key={`line-${v}-${i}`} className="border-t border-white/10" />
                    ))}
                  </div>

                  <div className="absolute inset-0 grid grid-cols-12 gap-3 items-end z-10">
                    {changeoverBuckets.map((m, idx) => {
                      const totalHeight = maxChangeoverValue
                        ? `${(m.total / maxChangeoverValue) * 100}%`
                        : "0%";
                      const openHeight = maxChangeoverValue
                        ? `${(m.open / maxChangeoverValue) * 100}%`
                        : "0%";

                      return (
                        <div key={months[idx]} className="h-full w-full flex items-end justify-center gap-2">
                          <div
                            className="w-4 rounded-md bg-cyan-400/90"
                            style={{ height: totalHeight }}
                            title={`Wszystkie: ${m.total}`}
                          />
                          <div
                            className="w-4 rounded-md bg-amber-400/90"
                            style={{ height: openHeight }}
                            title={`Niewykonane: ${m.open}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3 mt-2">
                  {months.map((label) => (
                    <div key={label} className="text-xs text-slate-300 text-center">
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
