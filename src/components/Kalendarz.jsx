import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import AddCalendarModal from "./subcomponents/AddCalendarModal.jsx";
import EditCalendarModal from "./subcomponents/EditCalendarModal.jsx";
import CalendarHistoryModal from "./subcomponents/CalendarHistoryModal.jsx";

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

const isAdminFromToken = () => {
  const role = getRoleFromToken();
  return role === "admin" || role === "superadmin";
};

const isSuperAdminFromToken = () => getRoleFromToken() === "superadmin";

const formatDateTime = (value) => {
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

const toSortableTime = (row) => {
  const raw = row?.start_date || row?.created || row?.updated;
  if (!raw) return 0;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getTime();
};

const statusBadge = (isActive) =>
  isActive
    ? { label: "Aktywny", cls: "bg-green-500/20 text-green-200 border-green-500/30" }
    : { label: "Zakonczony", cls: "bg-slate-500/20 text-slate-200 border-slate-500/30" };

export default function Kalendarz() {
  const token = localStorage.getItem("access_token");
  const logged = Boolean(token);
  const isAdmin = isAdminFromToken();
  const isSuperAdmin = isSuperAdminFromToken();
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const [entries, setEntries] = useState([]);
  const [moulds, setMoulds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addDraft, setAddDraft] = useState({
    mould_id: "",
    start_date: nowISOForInput(),
    end_date: nowISOForInput(),
    comment: "",
    is_active: true,
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    mould_id: "",
    start_date: nowISOForInput(),
    end_date: nowISOForInput(),
    comment: "",
    is_active: true,
  });

  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

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
    return `${m.mould_number} - ${m.product ?? ""}`.trim();
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resEntries, resMoulds] = await Promise.all([
        axios.get(`${API_BASE}/calendar/`, { params: { limit: 5000 }, headers: { ...authHeaders() } }),
        axios.get(`${API_BASE}/moulds`, { params: { limit: 20000 }, headers: { ...authHeaders() } }),
      ]);

      setEntries(resEntries.data || []);
      setMoulds(resMoulds.data || []);
    } catch (err) {
      console.error(err);
      setError("Nie udalo sie pobrac danych kalendarza.");
      setEntries([]);
      setMoulds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    const rows = [...(entries || [])];
    rows.sort((a, b) => {
      const aActive = Boolean(a?.is_active);
      const bActive = Boolean(b?.is_active);
      if (aActive !== bActive) return aActive ? -1 : 1;

      const t = toSortableTime(b) - toSortableTime(a);
      if (t !== 0) return t;

      return Number(b?.id ?? 0) - Number(a?.id ?? 0);
    });
    return rows;
  }, [entries]);

  const openAdd = () => {
    if (!isAdmin) return;
    setAddError(null);
    setAddDraft({
      mould_id: "",
      start_date: nowISOForInput(),
      end_date: nowISOForInput(),
      comment: "",
      is_active: true,
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

    const mouldId = String(addDraft.mould_id || "").trim();
    if (!mouldId) {
      setAddError("Wybierz forme.");
      return;
    }

    try {
      setSavingAdd(true);
      setAddError(null);

      const fd = new FormData();
      fd.append("mould_id", mouldId);
      fd.append("start_date", addDraft.start_date || "");
      fd.append("end_date", addDraft.end_date || "");
      fd.append("comment", addDraft.comment || "");
      fd.append("is_active", addDraft.is_active ? "true" : "false");

      await axios.post(`${API_BASE}/calendar/`, fd, {
        headers: { "Content-Type": "multipart/form-data", ...authHeaders() },
      });

      await refreshAll();
      closeAdd();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udalo sie dodac wpisu kalendarza.";
      setAddError(String(msg));
    } finally {
      setSavingAdd(false);
    }
  };

  const openEdit = (row) => {
    if (!isAdmin) return;
    const id = row?.id;
    if (!id) return;

    setEditError(null);
    setEditId(id);
    setEditDraft({
      mould_id: String(row?.mould_id ?? ""),
      start_date: toDateInputValue(row?.start_date) || nowISOForInput(),
      end_date: toDateInputValue(row?.end_date) || nowISOForInput(),
      comment: row?.comment ?? "",
      is_active: Boolean(row?.is_active),
    });
    setIsEditOpen(true);
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

    const mouldId = String(editDraft.mould_id || "").trim();
    if (!mouldId) {
      setEditError("Wybierz forme.");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);

      const fd = new FormData();
      fd.append("mould_id", mouldId);
      fd.append("start_date", editDraft.start_date || "");
      fd.append("end_date", editDraft.end_date || "");
      fd.append("comment", editDraft.comment || "");
      fd.append("is_active", editDraft.is_active ? "true" : "false");

      await axios.put(`${API_BASE}/calendar/${editId}`, fd, {
        headers: { "Content-Type": "multipart/form-data", ...authHeaders() },
      });

      await refreshAll();
      closeEdit();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udalo sie zapisac zmian.";
      setEditError(String(msg));
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteRow = async (row) => {
    if (!isAdmin) return;
    const id = row?.id;
    if (!id) return;

    setDeleteError(null);
    const ok = window.confirm(`Usunac wpis kalendarza (ID: ${id})?`);
    if (!ok) return;

    try {
      setDeletingId(id);
      await axios.delete(`${API_BASE}/calendar/${id}`, { headers: { ...authHeaders() } });
      await refreshAll();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udalo sie usunac wpisu.";
      setDeleteError(String(msg));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleStatus = async (row) => {
    if (!isAdmin) return;
    const id = row?.id;
    if (!id) return;

    try {
      const fd = new FormData();
      fd.append("is_active", row?.is_active ? "false" : "true");

      await axios.put(`${API_BASE}/calendar/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data", ...authHeaders() },
      });

      await refreshAll();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udalo sie zmienic statusu.";
      setDeleteError(String(msg));
    }
  };

  const openHistory = async (row) => {
    if (!isSuperAdmin) return;
    const id = row?.id;
    if (!id) return;

    try {
      setHistoryError(null);
      setHistoryLoading(true);
      setHistoryId(id);
      setIsHistoryOpen(true);

      const res = await axios.get(`${API_BASE}/calendar/${id}/log/`, {
        headers: { ...authHeaders() },
        params: { limit: 200 },
      });

      setHistoryRows(res.data || []);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udalo sie pobrac historii zmian.";
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

  return (
    <div className="p-10 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="px-4 py-2 bg-blue-500 rounded-lg text-white font-semibold hover:scale-105">
            {"<- Powrot"}
          </Link>
          <h1 className="text-4xl text-cyan-400 font-bold">Kalendarz</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
            title="Odswiez"
          >
            Odswiez
          </button>

          {logged && isAdmin && (
            <button
              type="button"
              onClick={openAdd}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
            >
              + Dodaj
            </button>
          )}
        </div>
      </div>

      {loading && <p>Ladowanie danych.</p>}
      {error && <p className="text-red-400">{error}</p>}
      {deleteError && <p className="text-red-400">{deleteError}</p>}

      {!loading && !error && sorted.length === 0 && <p className="opacity-80">Brak wpisow kalendarza.</p>}

      {!loading && !error && sorted.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-center px-4 py-3 font-semibold">Forma</th>
                <th className="text-center px-4 py-3 font-semibold">Od kiedy</th>
                <th className="text-center px-4 py-3 font-semibold">Do kiedy</th>
                <th className="text-center px-4 py-3 font-semibold">Komentarz</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-center px-4 py-3 font-semibold">Wpisujacy</th>
                {logged && isAdmin && <th className="text-center px-4 py-3 font-semibold">Akcje</th>}
              </tr>
            </thead>

            <tbody className="text-center">
              {sorted.map((row) => {
                const badge = statusBadge(Boolean(row?.is_active));
                const isDeletingThis = deletingId !== null && String(deletingId) === String(row.id);

                return (
                  <tr key={String(row.id)} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-4 py-3 align-middle">
                      <div className="whitespace-pre-wrap break-words">{labelMould(row.mould_id)}</div>
                    </td>

                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      {formatDateTime(row?.start_date)}
                    </td>

                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      {formatDateTime(row?.end_date)}
                    </td>

                    <td className="px-4 py-3 align-middle">
                      <div className="whitespace-pre-wrap break-words">{row?.comment || "-"}</div>
                    </td>

                    <td className="px-4 py-3 align-middle whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full border text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 align-middle whitespace-nowrap">{row?.created_by ?? "-"}</td>

                    {logged && isAdmin && (
                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleStatus(row)}
                            className={`px-3 py-2 rounded-lg border ${
                              row?.is_active
                                ? "border-green-500/40 bg-green-500/10 hover:bg-green-500/20 text-green-200"
                                : "border-slate-500/40 bg-slate-500/10 hover:bg-slate-500/20 text-slate-200"
                            }`}
                          >
                            {row?.is_active ? "Zakoncz" : "Aktywuj"}
                          </button>

                          <button
                            type="button"
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                            onClick={() => openEdit(row)}
                          >
                            Edytuj
                          </button>

                          {isSuperAdmin && (
                            <button
                              type="button"
                              className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100"
                              onClick={() => openHistory(row)}
                              title="Historia zmian"
                            >
                              Historia
                            </button>
                          )}

                          <button
                            type="button"
                            className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 disabled:opacity-50"
                            onClick={() => deleteRow(row)}
                            disabled={isDeletingThis}
                          >
                            {isDeletingThis ? "..." : "Usuń"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddCalendarModal
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

      <EditCalendarModal
        isOpen={logged && isAdmin && isEditOpen}
        onClose={closeEdit}
        onSave={saveEdit}
        saving={savingEdit}
        error={editError}
        draft={editDraft}
        setDraft={setEditDraft}
        moulds={moulds}
        labelMould={labelMould}
      />

      <CalendarHistoryModal
        isOpen={logged && isSuperAdmin && isHistoryOpen}
        onClose={closeHistory}
        historyId={historyId}
        historyRows={historyRows}
        loading={historyLoading}
        error={historyError}
        formatDateTime={formatDateTime}
      />
    </div>
  );
}
