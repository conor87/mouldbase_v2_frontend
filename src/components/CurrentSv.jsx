import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
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

const isLikelyIsoDate = (value) => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  return /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?/.test(v);
};

const formatCell = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Tak" : "Nie";
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (value instanceof Date) return value.toLocaleString("pl-PL");
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed && isLikelyIsoDate(trimmed)) {
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime()) && /[-T:]/.test(trimmed)) {
        return d.toLocaleString("pl-PL");
      }
    }
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const labelKey = (key) => {
  const raw = String(key || "");
  const normalized = raw.toLowerCase().replace(/[\s_]+/g, "");
  const map = {
    rv1: "Maszyna",
    tools: "Forma",
    statusname: "Status",
    sptxt: "Wyrób",
  };
  if (map[normalized]) return map[normalized];
  return raw
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const getStatusValue = (row) => {
  if (!row) return "";
  const keys = Object.keys(row);
  const key =
    keys.find((k) => String(k || "").toLowerCase().replace(/[\s_]+/g, "") === "statusname") ||
    keys.find((k) => String(k || "").toLowerCase().replace(/[\s_]+/g, "") === "status");
  return key ? String(row[key] ?? "").trim() : "";
};

export default function CurrentSv() {
  const token = localStorage.getItem("access_token");
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const [rows, setRows] = useState([]);
  const [moulds, setMoulds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resCurrent, resMoulds] = await Promise.all([
        axios.get(`${API_BASE}/current_sv/`, {
          params: { limit: 5000 },
          headers: { ...authHeaders() },
        }),
        axios.get(`${API_BASE}/moulds`, {
          params: { limit: 20000 },
          headers: { ...authHeaders() },
        }),
      ]);
      setRows(normalizeList(resCurrent.data));
      setMoulds(normalizeList(resMoulds.data));
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać danych current_sv.");
      setRows([]);
      setMoulds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    const base = Object.keys(rows[0] || {});
    const extras = new Set();
    rows.slice(1).forEach((row) => {
      Object.keys(row || {}).forEach((k) => {
        if (!base.includes(k)) extras.add(k);
      });
    });
    return [...base, ...Array.from(extras)];
  }, [rows]);

  const machineKey = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const keys = Object.keys(rows[0] || {});
    return (
      keys.find((k) => String(k || "").toLowerCase().replace(/[\s_]+/g, "") === "rv1") ??
      keys.find((k) => String(k || "").toLowerCase().replace(/[\s_]+/g, "") === "maszyna") ??
      null
    );
  }, [rows]);

  const sortedRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    if (!machineKey) return [...rows];
    const collator = new Intl.Collator("pl-PL", { numeric: true, sensitivity: "base" });
    return [...rows].sort((a, b) => {
      const av = String(a?.[machineKey] ?? "").trim();
      const bv = String(b?.[machineKey] ?? "").trim();
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return collator.compare(av, bv);
    });
  }, [rows, machineKey]);

  const mouldNumberSet = useMemo(() => {
    return new Set((moulds || []).map((m) => String(m?.mould_number ?? "").trim()).filter(Boolean));
  }, [moulds]);

  const renderCell = (col, value) => {
    const key = String(col || "").toLowerCase();
    if (key === "tools") {
      const raw = String(value ?? "").trim();
      if (raw && mouldNumberSet.has(raw)) {
        return (
          <Link className="text-cyan-300 hover:text-cyan-200 underline" to={`/moulds/${encodeURIComponent(raw)}`}>
            {raw}
          </Link>
        );
      }
    }
    return formatCell(value);
  };

  return (
    <div className="p-10 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl text-cyan-400 font-bold">Formy na maszynach</h1>
        <button
          type="button"
          onClick={refresh}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
        >
          Odśwież
        </button>
      </div>

      {loading && <p>Ładowanie danych…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && rows.length === 0 && <p className="opacity-80">Brak rekordów.</p>}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="text-center px-4 py-3 font-semibold whitespace-nowrap">
                    {labelKey(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-center">
              {sortedRows.map((row, index) => (
                <tr
                  key={row?.id ?? `${index}-${columns.length}`}
                  className={`border-t border-white/10 hover:bg-white/5 ${
                    getStatusValue(row).toUpperCase() === "AWARIA FORMY" ? "bg-red-600/50" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 align-middle whitespace-nowrap">
                      {renderCell(col, row?.[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
