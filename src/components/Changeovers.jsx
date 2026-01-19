import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_BASE } from "../config/api.js";

import ChangeoverHistoryModal from "./subcomponents/ChangeoverHistoryModal";
import AddChangeoverModal from "./subcomponents/AddChangeoverModal";
import EditChangeoverModal from "./subcomponents/EditChangeoverModal";

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
  return d.toLocaleString("pl-PL");
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
};

const nowISOForInput = () => new Date().toISOString().slice(0, 16);

// ===== JWT helpers =====
const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getRoleFromToken = () => {
  const token = localStorage.getItem("access_token");
  const payload = token ? parseJwt(token) : null;
  return payload?.role ?? null;
};

const getUsernameFromToken = () => {
  const token = localStorage.getItem("access_token");
  const payload = token ? parseJwt(token) : null;
  return payload?.sub ?? payload?.username ?? null;
};

const isAdminFromToken = () => {
  const role = getRoleFromToken();
  return role === "admindn" || role === "superadmin";
};

const isSuperAdminFromToken = () => getRoleFromToken() === "superadmin";

export default function Changeovers() {
  const token = localStorage.getItem("access_token");
  const logged = Boolean(token);
  const isAdmin = isAdminFromToken();
  const isSuperAdmin = isSuperAdminFromToken();
  const usernameFromJwt = getUsernameFromToken();

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const [changeovers, setChangeovers] = useState([]);
  const [moulds, setMoulds] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ PAGINACJA
  const [page, setPage] = useState(1);
  const DONE_FIRST_PAGE_LIMIT = 10;
  const DONE_PAGE_SIZE = 20;

  // --- ADD modal ---
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addDraft, setAddDraft] = useState({
    from_mould_id: "",
    to_mould_id: "",
    available_date: nowISOForInput(),
    needed_date: nowISOForInput(),
    czy_wykonano: false,
  });

  // --- EDIT modal ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    from_mould_id: "",
    to_mould_id: "",
    available_date: nowISOForInput(),
    needed_date: nowISOForInput(),
    czy_wykonano: false,
  });

  // --- DELETE ---
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // --- TOGGLE WYKONANO ---
  const [togglingId, setTogglingId] = useState(null);
  const [toggleError, setToggleError] = useState(null);

  // --- HISTORY (superadmin) ---
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyId, setHistoryId] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const mouldById = useMemo(() => {
    const map = new Map();
    (moulds || []).forEach((m) => map.set(String(m.id), m));
    return map;
  }, [moulds]);

  const labelMould = (id) => {
    const m = mouldById.get(String(id));
    if (!m) return id ? `ID:${id}` : "-";
    return `${m.mould_number} — ${m.product ?? ""}`.trim();
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resCh, resM] = await Promise.all([
        axios.get(`${API_BASE}/changeovers/`, { params: { limit: 5000 }, headers: { ...authHeaders() } }),
        axios.get(`${API_BASE}/moulds`, { params: { limit: 20000 }, headers: { ...authHeaders() } }),
      ]);

      setChangeovers(normalizeList(resCh.data));
      setMoulds(normalizeList(resM.data));
      setPage(1);
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać danych przezbrojeń.");
      setChangeovers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    return [...(changeovers || [])].sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));
  }, [changeovers]);

  const openRows = useMemo(() => sorted.filter((x) => !x?.czy_wykonano), [sorted]);
  const doneRows = useMemo(() => sorted.filter((x) => !!x?.czy_wykonano), [sorted]);

  const doneRemainder = Math.max(0, doneRows.length - DONE_FIRST_PAGE_LIMIT);
  const extraPages = Math.ceil(doneRemainder / DONE_PAGE_SIZE);
  const totalPages = 1 + extraPages;

  const pageRows = useMemo(() => {
    if (page <= 1) return [...openRows, ...doneRows.slice(0, DONE_FIRST_PAGE_LIMIT)];
    const start = DONE_FIRST_PAGE_LIMIT + (page - 2) * DONE_PAGE_SIZE;
    const end = start + DONE_PAGE_SIZE;
    return doneRows.slice(start, end);
  }, [page, openRows, doneRows]);

  const goToPage = (p) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next);
  };

  // ===== ADD =====
  const openAdd = () => {
    if (!isAdmin) return;
    setAddError(null);
    setAddDraft({
      from_mould_id: "",
      to_mould_id: "",
      available_date: nowISOForInput(),
      needed_date: nowISOForInput(),
      czy_wykonano: false,
    });
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    if (savingAdd) return;
    setIsAddOpen(false);
    setAddError(null);
  };

  const saveAdd = async () => {
    if (!isAdmin) return;

    const fromId = String(addDraft.from_mould_id || "").trim();
    const toId = String(addDraft.to_mould_id || "").trim();

    if (!fromId || !toId) {
      setAddError("Wybierz formę 'z jakiej' i 'na jaką'.");
      return;
    }

    try {
      setSavingAdd(true);
      setAddError(null);

      const fd = new FormData();
      fd.append("from_mould_id", fromId);
      fd.append("to_mould_id", toId);
      fd.append("available_date", addDraft.available_date || nowISOForInput());
      fd.append("needed_date", addDraft.needed_date || nowISOForInput());
      fd.append("czy_wykonano", addDraft.czy_wykonano ? "true" : "false");
      if (usernameFromJwt) fd.append("updated_by", usernameFromJwt);

      await axios.post(`${API_BASE}/changeovers/`, fd, {
        headers: { "Content-Type": "multipart/form-data", ...authHeaders() },
      });

      await refreshAll();
      closeAdd();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się dodać przezbrojenia.";
      setAddError(String(msg));
    } finally {
      setSavingAdd(false);
    }
  };

  // ===== EDIT =====
  const openEdit = async (row) => {
    if (!isAdmin) return;
    const id = row?.id;
    if (!id) return;

    try {
      setEditError(null);
      setEditId(id);

      // ✅ ujednolicone na trailing slash (często ważne w FastAPI)
      const res = await axios.get(`${API_BASE}/changeovers/${id}/`, {
        headers: { ...authHeaders() },
      });

      const entry = res.data || {};

      setEditDraft({
        from_mould_id: String(entry.from_mould_id ?? ""),
        to_mould_id: String(entry.to_mould_id ?? ""),
        available_date: toDateInputValue(entry.available_date) || nowISOForInput(),
        needed_date: toDateInputValue(entry.needed_date) || nowISOForInput(),
        czy_wykonano: Boolean(entry.czy_wykonano),
      });

      setIsEditOpen(true);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się pobrać danych do edycji.";
      setEditError(String(msg));
    }
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setIsEditOpen(false);
    setEditError(null);
    setEditId(null);
  };

  const saveEdit = async () => {
    if (!isAdmin) return;
    if (!editId) return;

    const fromId = String(editDraft.from_mould_id || "").trim();
    const toId = String(editDraft.to_mould_id || "").trim();

    if (!fromId || !toId) {
      setEditError("Wybierz formę 'z jakiej' i 'na jaką'.");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);

      const fd = new FormData();
      fd.append("from_mould_id", fromId);
      fd.append("to_mould_id", toId);
      fd.append("available_date", editDraft.available_date || nowISOForInput());
      fd.append("needed_date", editDraft.needed_date || nowISOForInput());
      fd.append("czy_wykonano", editDraft.czy_wykonano ? "true" : "false");
      if (usernameFromJwt) fd.append("updated_by", usernameFromJwt);

      // ✅ trailing slash
      await axios.put(`${API_BASE}/changeovers/${editId}/`, fd, {
        headers: { "Content-Type": "multipart/form-data", ...authHeaders() },
      });

      await refreshAll();
      closeEdit();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się zapisać edycji.";
      setEditError(String(msg));
    } finally {
      setSavingEdit(false);
    }
  };

  // ===== DELETE =====
  const deleteRow = async (row) => {
    if (!isAdmin) return;

    const id = row?.id;
    if (!id) return;

    setDeleteError(null);

    const ok = window.confirm(`Usunąć przezbrojenie (ID: ${id})?`);
    if (!ok) return;

    try {
      setDeletingId(id);
      // ✅ trailing slash
      await axios.delete(`${API_BASE}/changeovers/${id}/`, { headers: { ...authHeaders() } });
      await refreshAll();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się usunąć rekordu.";
      setDeleteError(String(msg));
    } finally {
      setDeletingId(null);
    }
  };

  // ===== TOGGLE "czy_wykonano" =====
  const toggleDone = async (row) => {
    if (!isAdmin) return;
    const id = row?.id;
    if (!id) return;

    try {
      setToggleError(null);
      setTogglingId(id);

      const next = !row?.czy_wykonano;

      const fd = new FormData();
      fd.append("czy_wykonano", next ? "true" : "false");
      if (usernameFromJwt) fd.append("updated_by", usernameFromJwt);

      // ✅ trailing slash
      await axios.put(`${API_BASE}/changeovers/${id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data", ...authHeaders() },
      });

      await refreshAll();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się zmienić statusu wykonania.";
      setToggleError(String(msg));
    } finally {
      setTogglingId(null);
    }
  };

  // ===== HISTORY (superadmin) =====
  const openHistory = async (row) => {
    if (!isSuperAdmin) return;
    const id = row?.id;
    if (!id) return;

    try {
      setHistoryError(null);
      setHistoryLoading(true);
      setHistoryId(id);
      setIsHistoryOpen(true);

      const res = await axios.get(`${API_BASE}/changeovers/${id}/log/`, {
        headers: { ...authHeaders() },
        params: { limit: 200 },
      });

      setHistoryRows(normalizeList(res.data));
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się pobrać historii zmian.";
      setHistoryError(String(msg));
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    if (historyLoading) return;
    setIsHistoryOpen(false);
    setHistoryId(null);
    setHistoryRows([]);
    setHistoryError(null);
  };

  const DoneBadge = ({ value }) => {
    const done = Boolean(value);
    return (
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
          done ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"
        }`}
        title={done ? "Wykonano" : "Nie wykonano"}
      >
        {done ? "✓" : "✕"}
      </span>
    );
  };

  return (
    <>
      <div className="p-10 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* <Link to="/" className="px-4 py-2 bg-blue-500 rounded-lg text-white font-semibold hover:scale-105">
              ← Powrót
            </Link> */}

            <h1 className="text-4xl text-cyan-400 font-bold">Przezbrojenia</h1>
          </div>

          {logged && isAdmin && (
            <button
              type="button"
              onClick={openAdd}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
            >
              ＋ Dodaj
            </button>
          )}
        </div>

        {loading && <p>Ładowanie danych…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {deleteError && <p className="text-red-400">{deleteError}</p>}
        {toggleError && <p className="text-red-400">{toggleError}</p>}

        {!loading && !error && sorted.length === 0 && <p className="opacity-80">Brak rekordów przezbrojeń.</p>}

        {!loading && !error && sorted.length > 0 && (
          <>
            <div className="mb-3 text-sm opacity-80">
              Strona <span className="text-cyan-300 font-semibold">{page}</span> /{" "}
              <span className="text-cyan-300 font-semibold">{totalPages}</span> — na 1. stronie: wszystkie niewykonane +
              max {DONE_FIRST_PAGE_LIMIT} wykonanych
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-center px-4 py-3 font-semibold">ID</th>
                    <th className="text-center px-4 py-3 font-semibold">Z jakiej formy</th>
                    <th className="text-center px-4 py-3 font-semibold">Na jaką formę</th>
                    <th className="text-center px-4 py-3 font-semibold">Dostępna od</th>
                    <th className="text-center px-4 py-3 font-semibold">Potrzebna na</th>
                    <th className="text-center px-4 py-3 font-semibold">Wykonano</th>
                    <th className="text-center px-4 py-3 font-semibold">TPM</th>
                    <th className="text-center px-4 py-3 font-semibold">Updated by</th>
                    <th className="text-center px-4 py-3 font-semibold">Updated</th>
                    {logged && isAdmin && <th className="text-center px-4 py-3 font-semibold">Akcje</th>}
                  </tr>
                </thead>

                <tbody className="text-center">
                  {pageRows.map((r) => {
                    const isDeletingThis = deletingId !== null && String(deletingId) === String(r.id);
                    const isTogglingThis = togglingId !== null && String(togglingId) === String(r.id);
                    const fromMould = mouldById.get(String(r.from_mould_id));
                    const toMould = mouldById.get(String(r.to_mould_id));
                    const hasOpenTpm = Boolean(fromMould?.has_open_tpm || toMould?.has_open_tpm);

                    return (
                      <tr key={String(r.id)} className="border-t border-white/10 hover:bg-white/5">
                        <td className="px-4 py-3 align-middle whitespace-nowrap">{String(r.id)}</td>
                        <td className="px-4 py-3 align-middle">
                          <div className="whitespace-pre-wrap break-words">{labelMould(r.from_mould_id)}</div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="whitespace-pre-wrap break-words">{labelMould(r.to_mould_id)}</div>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">{formatDateOnly(r.available_date)}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">{formatDateOnly(r.needed_date)}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <div className="flex justify-center">
                            <DoneBadge value={r.czy_wykonano} />
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          {hasOpenTpm ? (
                            <div className="flex justify-center">
                              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold shadow-lg bg-gradient-to-b from-red-500 to-orange-500">
                                TPM
                              </span>
                            </div>
                          ) : (
                            <span className="opacity-60">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">{r.updated_by ?? "-"}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">{formatDateOnly(r.updated)}</td>

                        {logged && isAdmin && (
                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleDone(r)}
                                disabled={isTogglingThis}
                                className={`px-3 py-2 rounded-lg border disabled:opacity-50 ${
                                  r.czy_wykonano
                                    ? "border-green-500/40 bg-green-500/10 hover:bg-green-500/20 text-green-200"
                                    : "border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-200"
                                }`}
                              >
                                {isTogglingThis ? "…" : r.czy_wykonano ? "Cofnij" : "Wykonano"}
                              </button>

                              <button
                                type="button"
                                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                                onClick={() => openEdit(r)}
                              >
                                ✎
                              </button>

                              <button
                                type="button"
                                className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 disabled:opacity-50"
                                onClick={() => deleteRow(r)}
                                disabled={isDeletingThis}
                              >
                                {isDeletingThis ? "…" : "🗑️"}
                              </button>

                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100"
                                  onClick={() => openHistory(r)}
                                  title="Historia zmian"
                                >
                                  🕘
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-2 border border-white/10 rounded-lg disabled:opacity-40 hover:bg-white/10"
                >
                  ◀
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p)}
                    className={`px-3 py-2 rounded-lg border ${
                      p === page ? "bg-cyan-500 text-black border-cyan-400" : "border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-2 border border-white/10 rounded-lg disabled:opacity-40 hover:bg-white/10"
                >
                  ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ✅ MODALE */}
      <AddChangeoverModal
        isOpen={logged && isAdmin && isAddOpen}
        onClose={closeAdd}
        onSave={saveAdd}
        saving={savingAdd}
        error={addError}
        draft={addDraft}
        setDraft={setAddDraft}
        moulds={moulds}
        labelMould={labelMould}
      />

      <EditChangeoverModal
        isOpen={logged && isAdmin && isEditOpen}
        onClose={closeEdit}
        onSave={saveEdit}
        saving={savingEdit}
        error={editError}
        editId={editId}
        draft={editDraft}
        setDraft={setEditDraft}
        moulds={moulds}
        labelMould={labelMould}
      />

      <ChangeoverHistoryModal
        isOpen={logged && isSuperAdmin && isHistoryOpen}
        onClose={closeHistory}
        historyId={historyId}
        historyRows={historyRows}
        loading={historyLoading}
        error={historyError}
        formatDateOnly={formatDateOnly}
      />
    </>
  );
}
