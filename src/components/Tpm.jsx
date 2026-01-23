import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
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

const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pl-PL");
};

const buildMediaSrc = (API_BASE, maybePath) => {
  if (!maybePath) return "";
  const v = String(maybePath);
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/media/")) {
    try {
      const apiUrl = new URL(API_BASE);
      return `${apiUrl.origin}${v}`;
    } catch {
      return v;
    }
  }
  return `${API_BASE}/${v.replace(/^\//, "")}`;
};

const STATUS_OPTIONS = [
  { value: 0, label: "Otwarty", cls: "bg-red-500/20 text-red-200 border-red-500/30" },
  { value: 1, label: "W trakcie", cls: "bg-yellow-500/20 text-yellow-100 border-yellow-500/30" },
  { value: 2, label: "Zamkniety", cls: "bg-green-500/20 text-green-200 border-green-500/30" },
  { value: 3, label: "Odrzucony", cls: "bg-slate-500/20 text-slate-200 border-slate-500/30" },
];

const TIME_OPTIONS = [
  { value: 0, label: "Natychmiast" },
  { value: 1, label: "W trakcie przegladu" },
  { value: 2, label: "Po zakonczonej produkcji" },
];

const pickFirst = (obj, keys, fallback = null) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

const statusRank = (rawStatus) => {
  const n = Number(rawStatus);
  if (n === 0) return 0; // open first
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 99;
};

const getRowDate = (row) =>
  pickFirst(row, ["created","changed", "updated", "created_at", "timestamp"], null);

const getRowYear = (row) => {
  const raw = getRowDate(row);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
};

const toSortableTime = (row) => {
  const raw = getRowDate(row);
  if (!raw) return 0;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getTime();
};

export default function Tpm() {
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const [tpms, setTpms] = useState([]);
  const [moulds, setMoulds] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  const refreshAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resTpm, resM] = await Promise.all([
        axios.get(`${API_BASE}/tpm/`, { params: { limit: 5000 }, headers: { ...authHeaders() } }),
        axios.get(`${API_BASE}/moulds`, { params: { limit: 20000 }, headers: { ...authHeaders() } }),
      ]);

      setTpms(normalizeList(resTpm.data));
      setMoulds(normalizeList(resM.data));
    } catch (err) {
      console.error(err);
      setError("Nie udalo sie pobrac danych TPM.");
      setTpms([]);
      setMoulds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mouldById = useMemo(() => {
    const map = new Map();
    (moulds || []).forEach((m) => map.set(String(m.id), m));
    return map;
  }, [moulds]);

  const sorted = useMemo(() => {
    const rows = [...(tpms || [])];
    rows.sort((a, b) => {
      const aStatus = pickFirst(a, ["status", "state", "status_code"], null);
      const bStatus = pickFirst(b, ["status", "state", "status_code"], null);
      const r = statusRank(aStatus) - statusRank(bStatus);
      if (r !== 0) return r;

      const t = toSortableTime(b) - toSortableTime(a);
      if (t !== 0) return t;

      const aId = Number(pickFirst(a, ["id", "pk", "tpm_id"], 0)) || 0;
      const bId = Number(pickFirst(b, ["id", "pk", "tpm_id"], 0)) || 0;
      return bId - aId;
    });
    return rows;
  }, [tpms]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sorted.filter((row) => {
      const year = getRowYear(row);
      const matchesYear = yearFilter === "all" || String(year) === yearFilter;
      if (!matchesYear) return false;

      if (!term) return true;
      const mouldId = pickFirst(row, ["mould_id", "mould", "mould_pk"], null);
      if (mouldId == null) return false;

      const mould = mouldById.get(String(mouldId));
      const mouldNumber = String(mould?.mould_number ?? "").toLowerCase();
      const product = String(mould?.product ?? "").toLowerCase();

      return mouldNumber.includes(term) || product.includes(term);
    });
  }, [sorted, searchTerm, mouldById, yearFilter]);

  const years = useMemo(() => {
    const set = new Set();
    (tpms || []).forEach((row) => {
      const year = getRowYear(row);
      if (year) set.add(year);
    });
    const list = Array.from(set).sort((a, b) => b - a).map(String);
    return ["all", ...list];
  }, [tpms]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const currentRows = filtered.slice(startIndex, startIndex + pageSize);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const paginationItems = useMemo(() => {
    const delta = 3;
    const pagesSet = new Set([1, totalPages]);

    for (let p = safePage - delta; p <= safePage + delta; p++) {
      if (p >= 1 && p <= totalPages) pagesSet.add(p);
    }

    const pages = Array.from(pagesSet).sort((a, b) => a - b);

    const items = [];
    let prev = null;
    for (const p of pages) {
      if (prev !== null && p - prev > 1) items.push("...");
      items.push(p);
      prev = p;
    }
    return items;
  }, [safePage, totalPages]);

  const labelMould = (mouldId) => {
    const m = mouldById.get(String(mouldId));
    if (!m) return mouldId ? `ID:${mouldId}` : "-";
    return `${m.mould_number} - ${m.product ?? ""}`.trim();
  };

  const timeLabel = (raw) => {
    const n = Number(raw);
    const found = TIME_OPTIONS.find((x) => x.value === n);
    return found?.label ?? (raw == null ? "-" : String(raw));
  };

  const statusPill = (raw) => {
    const n = Number(raw);
    const found = STATUS_OPTIONS.find((x) => x.value === n);
    if (!found) return { label: raw == null ? "-" : String(raw), cls: "bg-white/10 text-white border-white/10" };
    return found;
  };

  return (
    <div className="p-10 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* <Link to="/" className="px-4 py-2 bg-blue-500 rounded-lg text-white font-semibold hover:scale-105">
            ← Powrót
          </Link> */}
          <h1 className="text-4xl text-cyan-400 font-bold">TPM</h1>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
          title="Odswiez"
        >
          Odswiez
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full sm:w-[520px] flex flex-col gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Szukaj po numerze formy lub produkcie..."
            className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => {
                  setYearFilter(y);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition ${
                  yearFilter === y
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "border-slate-700 text-gray-300 hover:border-slate-500"
                }`}
              >
                {y === "all" ? "Wszystkie lata" : y}
              </button>
            ))}
          </div>

          {!loading && !error && (
            <div className="text-sm opacity-80">
              Wynik: <span className="text-cyan-300 font-semibold">{filtered.length}</span> /{" "}
              <span className="text-cyan-300 font-semibold">{sorted.length}</span>
            </div>
          )}
        </div>
      </div>

      {loading && <p>Ladowanie danych.</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && sorted.length === 0 && <p className="opacity-80">Brak rekordow TPM.</p>}
      {!loading && !error && sorted.length > 0 && filtered.length === 0 && (
        <p className="opacity-80">Brak wynikow dla podanego wyszukiwania.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-center px-4 py-3 font-semibold">ID</th>
                  <th className="text-center px-4 py-3 font-semibold">Forma</th>
                  <th className="text-center px-4 py-3 font-semibold">Opis</th>
                  <th className="text-center px-4 py-3 font-semibold">Czas reakcji</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                  <th className="text-center px-4 py-3 font-semibold">Autor</th>
                  <th className="text-center px-4 py-3 font-semibold">Foto 1</th>
                  <th className="text-center px-4 py-3 font-semibold">Foto 2</th>
                  <th className="text-center px-4 py-3 font-semibold">Data</th>
                </tr>
              </thead>

              <tbody className="text-center">
                {currentRows.map((row, index) => {
                  const id = pickFirst(row, ["id", "pk", "tpm_id"], index + 1);
                  const mouldId = pickFirst(row, ["mould_id", "mould", "mould_pk"], null);
                  const mould = mouldId != null ? mouldById.get(String(mouldId)) : null;

                  const opis = pickFirst(
                    row,
                    ["opis_zgloszenia", "opis", "description", "title", "subject", "note"],
                    ""
                  );

                  const trt = pickFirst(row, ["tpm_time_type", "czas_reakcji", "time_type"], null);
                  const statusRaw = pickFirst(row, ["status", "state", "status_code"], null);
                  const badge = statusPill(statusRaw);
                  const author =
                    pickFirst(row, ["created_by", "author", "username", "user_name", "created_by_username"], null) ??
                    pickFirst(row?.user, ["username", "name", "email"], null);
                  const changed = getRowDate(row);
                  const photo1 = buildMediaSrc(
                    API_BASE,
                    pickFirst(row, ["extra_photo_1", "photo_1", "photo1"], null)
                  );
                  const photo2 = buildMediaSrc(
                    API_BASE,
                    pickFirst(row, ["extra_photo_2", "photo_2", "photo2"], null)
                  );

                  return (
                    <tr key={String(id)} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{String(id)}</td>

                      <td className="px-4 py-3 align-middle">
                        <div className="whitespace-pre-wrap break-words">
                          {mould ? (
                            <button
                              type="button"
                              className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                              onClick={() => navigate(`/moulds/${mould.mould_number}`, { state: { mould } })}
                              title="Otworz szczegoly formy"
                            >
                              {labelMould(mouldId)}
                            </button>
                          ) : (
                            labelMould(mouldId)
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div className="whitespace-pre-wrap break-words">{opis || "-"}</div>
                      </td>

                      <td className="px-4 py-3 align-middle whitespace-nowrap">{timeLabel(trt)}</td>

                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full border text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div className="whitespace-pre-wrap break-words">{author || "-"}</div>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div className="flex justify-center">
                        {photo1 ? (
                          <a href={photo1} target="_blank" rel="noreferrer">
                            <img
                              src={photo1}
                              alt="TPM photo 1"
                              className="w-12 h-12 object-cover rounded-lg border border-white/10"
                            />
                          </a>
                        ) : (
                          <span className="opacity-60">-</span>
                        )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div className="flex justify-center">
                        {photo2 ? (
                          <a href={photo2} target="_blank" rel="noreferrer">
                            <img
                              src={photo2}
                              alt="TPM photo 2"
                              className="w-12 h-12 object-cover rounded-lg border border-white/10"
                            />
                          </a>
                        ) : (
                          <span className="opacity-60">-</span>
                        )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-middle whitespace-nowrap">{formatDateOnly(changed)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              <button
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 1}
                className="px-3 py-2 border border-slate-700 rounded-lg disabled:opacity-40 hover:border-slate-500"
              >
                &lsaquo;
              </button>

              {paginationItems.map((item, idx) =>
                item === "..." ? (
                  <span key={`dots-${idx}`} className="px-3 py-2 text-gray-400 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => goToPage(item)}
                    className={`px-3 py-2 rounded-lg border ${
                      safePage === item
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage === totalPages}
                className="px-3 py-2 border border-slate-700 rounded-lg disabled:opacity-40 hover:border-slate-500"
              >
                &rsaquo;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
