import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
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

const pickFirst = (obj, keys, fallback = null) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

const toSortableTime = (row) => {
  const raw = pickFirst(row, ["created_at", "updated_at", "review_date"], null);
  if (!raw) return 0;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getTime();
};

const isOpenGuide = (guide) => String(guide?.status ?? "").toLowerCase() === "open";

export default function OpenServiceGuides() {
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const [guides, setGuides] = useState([]);
  const [moulds, setMoulds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  const refreshAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resGuides, resMoulds] = await Promise.all([
        axios.get(`${API_BASE}/service-guides/`, { params: { limit: 5000 }, headers: { ...authHeaders() } }),
        axios.get(`${API_BASE}/moulds`, { params: { limit: 20000 }, headers: { ...authHeaders() } }),
      ]);

      setGuides(normalizeList(resGuides.data));
      setMoulds(normalizeList(resMoulds.data));
    } catch (err) {
      console.error(err);
      setError("Nie udalo sie pobrac danych przewodnikow.");
      setGuides([]);
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

  const openGuides = useMemo(() => {
    const rows = [...(guides || [])].filter(isOpenGuide);
    rows.sort((a, b) => {
      const t = toSortableTime(b) - toSortableTime(a);
      if (t !== 0) return t;

      const aId = Number(pickFirst(a, ["id"], 0)) || 0;
      const bId = Number(pickFirst(b, ["id"], 0)) || 0;
      return bId - aId;
    });
    return rows;
  }, [guides]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return openGuides;

    return openGuides.filter((guide) => {
      const mouldId = pickFirst(guide, ["mould_id"], null);
      const mould = mouldId != null ? mouldById.get(String(mouldId)) : null;
      const haystack = [
        guide?.guide_number,
        guide?.product_name,
        guide?.review_reason,
        mould?.mould_number,
        mould?.product,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [openGuides, searchTerm, mouldById]);

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

  const progressLabel = (guide) => {
    const steps = Array.isArray(guide?.steps) ? guide.steps : [];
    if (steps.length === 0) return "0 / 0";
    const done = steps.filter((step) => Boolean(step?.is_done)).length;
    return `${done} / ${steps.length}`;
  };

  return (
    <div className="p-10 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl text-cyan-400 font-bold">Otwarte przewodniki</h1>
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
            placeholder="Szukaj po numerze formy, produkcie lub przewodniku..."
            className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>

        {!loading && !error && (
          <div className="text-sm opacity-80">
            Wynik: <span className="text-cyan-300 font-semibold">{filtered.length}</span> /{" "}
            <span className="text-cyan-300 font-semibold">{openGuides.length}</span>
          </div>
        )}
      </div>

      {loading && <p>Ladowanie danych.</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && openGuides.length === 0 && <p className="opacity-80">Brak otwartych przewodnikow.</p>}
      {!loading && !error && openGuides.length > 0 && filtered.length === 0 && (
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
                  <th className="text-center px-4 py-3 font-semibold">Przewodnik</th>
                  <th className="text-center px-4 py-3 font-semibold">Powod przegladu</th>
                  <th className="text-center px-4 py-3 font-semibold">Postep</th>
                  <th className="text-center px-4 py-3 font-semibold">Data przegladu</th>
                  <th className="text-center px-4 py-3 font-semibold">Utworzono</th>
                </tr>
              </thead>

              <tbody className="text-center">
                {currentRows.map((guide, index) => {
                  const id = pickFirst(guide, ["id"], index + 1);
                  const mouldId = pickFirst(guide, ["mould_id"], null);
                  const mould = mouldId != null ? mouldById.get(String(mouldId)) : null;

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
                        <div className="whitespace-pre-wrap break-words">
                          {mould ? (
                            <button
                              type="button"
                              className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2 font-semibold"
                              onClick={() =>
                                navigate(`/moulds/${mould.mould_number}`, {
                                  state: { mould, openGuideId: guide?.id },
                                })
                              }
                              title="Otworz przewodnik"
                            >
                              {guide?.guide_number || "-"}
                            </button>
                          ) : (
                            guide?.guide_number || "-"
                          )}
                        </div>
                        {guide?.product_name && (
                          <div className="mt-1 text-xs text-slate-400 whitespace-pre-wrap break-words">
                            {guide.product_name}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div className="whitespace-pre-wrap break-words">{guide?.review_reason || "-"}</div>
                      </td>

                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <span className="inline-flex px-3 py-1 rounded-full border border-yellow-500/30 bg-yellow-500/20 text-yellow-100 text-xs font-semibold">
                          {progressLabel(guide)}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle whitespace-nowrap">{formatDateOnly(guide?.review_date)}</td>
                      <td className="px-4 py-3 align-middle whitespace-nowrap">{formatDateOnly(guide?.created_at)}</td>
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
