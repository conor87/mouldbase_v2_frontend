// MouldDetails_Tpm.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

// Helpery
const pickFirst = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pl-PL");
};

// enumy (dopasowane do modelu TPM)
const STATUS_OPTIONS = [
  { value: 0, label: "Otwarty" },
  { value: 1, label: "W trakcie realizacji" },
  { value: 2, label: "Zamknięty" },
  { value: 3, label: "Odrzucony" },
];

const TIME_OPTIONS = [
  { value: 0, label: "Natychmiast" },
  { value: 1, label: "W trakcie przeglądu" },
  { value: 2, label: "Po zakończonej produkcji" },
];

// badge statusu (Twoje wymagania)
const statusBadge = (rawStatus) => {
  const n = Number(rawStatus);
  if (Number.isNaN(n)) return { text: "-", cls: "bg-white/10 text-white" };
  if (n === 2) return { text: "✓", cls: "bg-green-500/30 text-green-200" }; // zamknięty
  if (n === 1) return { text: "…", cls: "bg-yellow-500/30 text-yellow-100" }; // w trakcie
  if (n === 3) return { text: "X", cls: "bg-red-500/30 text-red-200" }; // odrzucony
  return { text: "X", cls: "bg-red-500/30 text-red-200" }; // otwarty
};

const timeLabel = (raw) => {
  const n = Number(raw);
  const found = TIME_OPTIONS.find((x) => x.value === n);
  return found?.label ?? (raw == null ? "-" : String(raw));
};

// URL do podglądu zdjęć z backendu
const normalizeMediaUrl = (API_BASE, value) => {
  if (!value) return "";
  const s = String(value);

  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/media/")) {
    try {
      const apiUrl = new URL(API_BASE);
      return `${apiUrl.origin}${s}`;
    } catch {
      return s;
    }
  }
  // jeśli backend zwróci np. "media/tpm/xxx.jpg" bez leading slash
  if (s.startsWith("media/")) {
    return `${API_BASE}/${s}`;
  }
  // fallback
  return `${API_BASE}/${s.replace(/^\//, "")}`;
};

export default function MouldDetails_Tpm({
  API_BASE,
  mouldId,
  mouldNumber,
  logged,
  isAdmin, // admin/superadmin => true
  authHeaders, // () => ({ Authorization: `Bearer ...` })
}) {
  const [tpms, setTpms] = useState([]);
  const [loadingTpms, setLoadingTpms] = useState(false);
  const [tpmError, setTpmError] = useState(null);

  // show 10 / show all
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [mouldNumber]);

  // --- ADD modal ---
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addDraft, setAddDraft] = useState({
    opis_zgloszenia: "",
    tpm_time_type: "0",
    status: "0",
    changed: todayISO(),
  });

  const [addPhoto1, setAddPhoto1] = useState(null);
  const [addPhoto2, setAddPhoto2] = useState(null);
  const [addPreview1, setAddPreview1] = useState("");
  const [addPreview2, setAddPreview2] = useState("");

  // --- EDIT modal ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    opis_zgloszenia: "",
    tpm_time_type: "0",
    status: "0",
    changed: todayISO(),
  });

  const [editPhoto1, setEditPhoto1] = useState(null);
  const [editPhoto2, setEditPhoto2] = useState(null);
  const [editPreview1, setEditPreview1] = useState("");
  const [editPreview2, setEditPreview2] = useState("");

  // --- DELETE ---
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const refreshTpms = async () => {
    if (!mouldNumber) return;
    const res = await axios.get(`${API_BASE}/tpm/`, { params: { search: mouldNumber } });
    setTpms(normalizeList(res.data));
  };

  useEffect(() => {
    if (!mouldNumber) return;

    const controller = new AbortController();

    const fetchTpms = async () => {
      try {
        setLoadingTpms(true);
        setTpmError(null);

        const res = await axios.get(`${API_BASE}/tpm/`, {
          params: { search: mouldNumber },
          signal: controller.signal,
        });

        setTpms(normalizeList(res.data));
      } catch (err) {
        if (
          axios.isCancel?.(err) ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        )
          return;

        console.error(err);
        setTpmError("Nie udało się pobrać danych TPM.");
        setTpms([]);
      } finally {
        setLoadingTpms(false);
      }
    };

    fetchTpms();
    return () => controller.abort();
  }, [API_BASE, mouldNumber]);

  const sortedTpms = useMemo(() => {
    return [...tpms].sort((a, b) => {
      const aStatus = Number(a?.status ?? a?.state ?? a?.status_code);
      const bStatus = Number(b?.status ?? b?.state ?? b?.status_code);

      const aClosed = aStatus === 2;
      const bClosed = bStatus === 2;
      if (aClosed !== bClosed) return aClosed ? 1 : -1;

      return Number(b?.id ?? 0) - Number(a?.id ?? 0);
    });
  }, [tpms]);

  const visibleTpms = showAll ? sortedTpms : sortedTpms.slice(0, 10);

  // --- ADD ---
  const openAdd = () => {
    if (!isAdmin || !logged) return;

    setAddError(null);
    setAddDraft({
      opis_zgloszenia: "",
      tpm_time_type: "0",
      status: "0",
      changed: todayISO(),
    });

    // reset zdjęć
    if (addPreview1?.startsWith("blob:")) URL.revokeObjectURL(addPreview1);
    if (addPreview2?.startsWith("blob:")) URL.revokeObjectURL(addPreview2);
    setAddPhoto1(null);
    setAddPhoto2(null);
    setAddPreview1("");
    setAddPreview2("");

    setIsAddOpen(true);
  };

  const closeAdd = () => {
    if (savingAdd) return;

    if (addPreview1?.startsWith("blob:")) URL.revokeObjectURL(addPreview1);
    if (addPreview2?.startsWith("blob:")) URL.revokeObjectURL(addPreview2);
    setAddPreview1("");
    setAddPreview2("");
    setAddPhoto1(null);
    setAddPhoto2(null);

    setIsAddOpen(false);
    setAddError(null);
  };

  const saveAdd = async () => {
    if (!isAdmin || !logged) return;

    if (!mouldId) {
      setAddError("Brak mould_id (mouldData.id).");
      return;
    }

    try {
      setSavingAdd(true);
      setAddError(null);

      const fd = new FormData();
      fd.append("mould_id", String(mouldId));
      fd.append("opis_zgloszenia", addDraft.opis_zgloszenia ?? "");
      fd.append("tpm_time_type", String(parseInt(addDraft.tpm_time_type || "0", 10) || 0));
      fd.append("status", String(parseInt(addDraft.status || "0", 10) || 0));
      fd.append("changed", (addDraft.changed || todayISO()).trim());

      // ✅ zdjęcia
      if (addPhoto1) fd.append("extra_photo_1", addPhoto1);
      if (addPhoto2) fd.append("extra_photo_2", addPhoto2);

      await axios.post(`${API_BASE}/tpm/`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(authHeaders?.() ?? {}),
        },
      });

      await refreshTpms();
      closeAdd();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się dodać wpisu TPM.";
      setAddError(String(msg));
    } finally {
      setSavingAdd(false);
    }
  };

  // --- EDIT ---
  const openEdit = (row) => {
    if (!isAdmin || !logged) return;

    const id = row?.id ?? row?.tpm_id ?? row?.pk;
    if (!id) return;

    setEditError(null);
    setEditId(id);

    const rowChanged = row?.changed ? String(row.changed).slice(0, 10) : "";

    setEditDraft({
      opis_zgloszenia: row?.opis_zgloszenia ?? "",
      tpm_time_type: String(row?.tpm_time_type ?? 0),
      status: String(row?.status ?? 0),
      changed: rowChanged || todayISO(),
    });

    // reset uploadów
    setEditPhoto1(null);
    setEditPhoto2(null);

    // podgląd z backendu (jeśli istnieje)
    const p1 = normalizeMediaUrl(API_BASE, row?.extra_photo_1);
    const p2 = normalizeMediaUrl(API_BASE, row?.extra_photo_2);

    if (editPreview1?.startsWith("blob:")) URL.revokeObjectURL(editPreview1);
    if (editPreview2?.startsWith("blob:")) URL.revokeObjectURL(editPreview2);

    setEditPreview1(p1 || "");
    setEditPreview2(p2 || "");

    setIsEditOpen(true);
  };

  const closeEdit = () => {
    if (savingEdit) return;

    if (editPreview1?.startsWith("blob:")) URL.revokeObjectURL(editPreview1);
    if (editPreview2?.startsWith("blob:")) URL.revokeObjectURL(editPreview2);

    setEditPreview1("");
    setEditPreview2("");
    setEditPhoto1(null);
    setEditPhoto2(null);

    setIsEditOpen(false);
    setEditError(null);
    setEditId(null);
  };

  const saveEdit = async () => {
    if (!isAdmin || !logged) return;
    if (!editId) return;

    try {
      setSavingEdit(true);
      setEditError(null);

      const fd = new FormData();
      fd.append("opis_zgloszenia", editDraft.opis_zgloszenia ?? "");
      fd.append("tpm_time_type", String(parseInt(editDraft.tpm_time_type || "0", 10) || 0));
      fd.append("status", String(parseInt(editDraft.status || "0", 10) || 0));
      fd.append("changed", (editDraft.changed || todayISO()).trim());

      // ✅ zdjęcia (jeśli wybrane)
      if (editPhoto1) fd.append("extra_photo_1", editPhoto1);
      if (editPhoto2) fd.append("extra_photo_2", editPhoto2);

      await axios.put(`${API_BASE}/tpm/${editId}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(authHeaders?.() ?? {}),
        },
      });

      await refreshTpms();
      closeEdit();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się zapisać edycji wpisu TPM.";
      setEditError(String(msg));
    } finally {
      setSavingEdit(false);
    }
  };

  // --- DELETE ---
  const deleteTpm = async (row) => {
    if (!isAdmin || !logged) return;

    const id = row?.id ?? row?.tpm_id ?? row?.pk;
    if (!id) return;

    setDeleteError(null);

    const ok = window.confirm(`Usunąć wpis TPM (ID: ${id})?`);
    if (!ok) return;

    try {
      setDeletingId(id);

      await axios.delete(`${API_BASE}/tpm/${id}`, {
        headers: { ...(authHeaders?.() ?? {}) },
      });

      setTpms((prev) => prev.filter((x) => (x?.id ?? x?.tpm_id ?? x?.pk) !== id));
      await refreshTpms();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się usunąć wpisu TPM.";
      setDeleteError(String(msg));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="border rounded-xl border-blue-500 mt-12 p-4">
        <section className="text-white">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-3xl text-cyan-400 font-bold">Zgłoszenia TPM:</h2>

            {isAdmin && logged && (
              <button
                type="button"
                onClick={openAdd}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
                title="Dodaj wpis TPM"
                aria-label="Dodaj wpis TPM"
              >
                ＋
              </button>
            )}
          </div>

          {loadingTpms && <p>Ładowanie danych…</p>}
          {tpmError && <p className="text-red-400">{tpmError}</p>}
          {deleteError && <p className="text-red-400">{deleteError}</p>}

          {!loadingTpms && !tpmError && sortedTpms.length === 0 && (
            <p className="opacity-80">Brak wyników TPM dla tej formy.</p>
          )}

          {!loadingTpms && !tpmError && sortedTpms.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-center px-4 py-3 font-semibold">ID</th>
                      <th className="text-center px-4 py-3 font-semibold">Opis zgłoszenia</th>
                      <th className="text-center px-4 py-3 font-semibold">Czas reakcji</th>
                      <th className="text-center px-4 py-3 font-semibold">Status</th>
                      <th className="text-center px-4 py-3 font-semibold">Utworzono</th>
                      <th className="text-center px-4 py-3 font-semibold">Foto 1</th>
                      <th className="text-center px-4 py-3 font-semibold">Foto 2</th>

                      {isAdmin && logged && (
                        <th className="text-center px-4 py-3 font-semibold">Akcje</th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="text-center">
                    {visibleTpms.map((m, index) => {
                      const id = pickFirst(m, ["id", "pk", "tpm_id"], index + 1);

                      const opis = pickFirst(
                        m,
                        ["opis_zgloszenia", "opis", "description", "title", "subject", "note"],
                        ""
                      );

                      const status = pickFirst(m, ["status", "state", "status_code"], null);
                      const badge = statusBadge(status);

                      const trt = pickFirst(m, ["tpm_time_type", "czas_reakcji", "time_type"], null);
                      const created = pickFirst(m, ["created", "created_at", "timestamp"], null);
                      const photo1 = normalizeMediaUrl(API_BASE, m?.extra_photo_1);
                      const photo2 = normalizeMediaUrl(API_BASE, m?.extra_photo_2);

                      const isDeletingThis =
                        deletingId !== null && String(deletingId) === String(id);

                      return (
                        <tr key={String(id)} className="border-t border-white/10 hover:bg-white/5">
                          <td className="px-4 py-3 align-middle whitespace-nowrap">{String(id)}</td>

                          <td className="px-4 py-3 align-middle">
                            <div className="whitespace-pre-wrap break-words text-center">
                              {opis || "-"}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            {timeLabel(trt)}
                          </td>

                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center w-10 h-8 rounded-lg font-bold ${badge.cls}`}
                              title={
                                STATUS_OPTIONS.find((o) => o.value === Number(status))?.label ?? ""
                              }
                            >
                              {badge.text}
                            </span>
                          </td>

                          <td className="px-4 py-3 align-middle whitespace-nowrap">
                            {formatDateOnly(created)}
                          </td>

                          <td className="px-4 py-3 align-middle">
                            <div className="flex justify-center">
                              {photo1 ? (
                                <a href={photo1} target="_blank" rel="noreferrer">
                                  <img
                                    src={photo1}
                                    alt="TPM foto 1"
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
                                    alt="TPM foto 2"
                                    className="w-12 h-12 object-cover rounded-lg border border-white/10"
                                  />
                                </a>
                              ) : (
                                <span className="opacity-60">-</span>
                              )}
                            </div>
                          </td>

                          {isAdmin && logged && (
                            <td className="px-4 py-3 align-middle whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                                  title="Edytuj wpis"
                                  aria-label="Edytuj wpis"
                                  onClick={() => openEdit(m)}
                                >
                                  ✎
                                </button>

                                <button
                                  type="button"
                                  className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 disabled:opacity-50"
                                  title="Usuń wpis"
                                  aria-label="Usuń wpis"
                                  onClick={() => deleteTpm(m)}
                                  disabled={isDeletingThis}
                                >
                                  {isDeletingThis ? "…" : "🗑️"}
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

              {sortedTpms.length > 10 && (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
                    onClick={() => setShowAll((p) => !p)}
                  >
                    {showAll ? "Pokaż mniej" : `Pokaż wszystkie (${sortedTpms.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* MODAL: DODAJ */}
      {isAdmin && logged && isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAdd();
          }}
        >
          <div className="w-full max-w-3xl rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-cyan-400">Nowy wpis TPM</h3>
              <button
                type="button"
                onClick={closeAdd}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                disabled={savingAdd}
              >
                ✕
              </button>
            </div>

            {addError && <div className="mb-3 text-red-400 text-sm">{addError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LEWA 2/3 */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm opacity-80 mb-1">Opis zgłoszenia</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={addDraft.opis_zgloszenia}
                    onChange={(e) =>
                      setAddDraft((p) => ({ ...p, opis_zgloszenia: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm opacity-80 mb-1">Czas reakcji</label>
                    <select
                      className="w-full rounded-xl p-3 border border-white/10 bg-white text-slate-900"
                      value={addDraft.tpm_time_type}
                      onChange={(e) =>
                        setAddDraft((p) => ({ ...p, tpm_time_type: e.target.value }))
                      }
                    >
                      {TIME_OPTIONS.map((o) => (
                        <option key={o.value} value={String(o.value)}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm opacity-80 mb-1">Status</label>
                    <select
                      className="w-full rounded-xl p-3 border border-white/10 bg-white text-slate-900"
                      value={addDraft.status}
                      onChange={(e) => setAddDraft((p) => ({ ...p, status: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={String(o.value)}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm opacity-80 mb-1">Changed</label>
                  <input
                    type="date"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={addDraft.changed}
                    onChange={(e) => setAddDraft((p) => ({ ...p, changed: e.target.value }))}
                  />
                </div>
              </div>

              {/* PRAWA 1/3: zdjęcia */}
              <div className="md:col-span-1">
                <div className="rounded-xl border border-white/10 p-4 bg-slate-800">
                  <div className="font-semibold mb-3">Zdjęcia</div>

                  {/* PHOTO 1 */}
                  <div className="mb-4">
                    <div className="text-sm opacity-80 mb-2">Zdjęcie 1</div>
                    <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                      {addPreview1 ? (
                        <img src={addPreview1} alt="Podgląd 1" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-xs opacity-60">Brak</div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setAddPhoto1(file);

                          if (addPreview1?.startsWith("blob:")) URL.revokeObjectURL(addPreview1);

                          if (file) setAddPreview1(URL.createObjectURL(file));
                          else setAddPreview1("");
                        }}
                      />
                    </div>
                    {addPhoto1 && (
                      <button
                        type="button"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                        onClick={() => {
                          setAddPhoto1(null);
                          if (addPreview1?.startsWith("blob:")) URL.revokeObjectURL(addPreview1);
                          setAddPreview1("");
                        }}
                      >
                        Cofnij wybór
                      </button>
                    )}
                  </div>

                  {/* PHOTO 2 */}
                  <div>
                    <div className="text-sm opacity-80 mb-2">Zdjęcie 2</div>
                    <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                      {addPreview2 ? (
                        <img src={addPreview2} alt="Podgląd 2" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-xs opacity-60">Brak</div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setAddPhoto2(file);

                          if (addPreview2?.startsWith("blob:")) URL.revokeObjectURL(addPreview2);

                          if (file) setAddPreview2(URL.createObjectURL(file));
                          else setAddPreview2("");
                        }}
                      />
                    </div>
                    {addPhoto2 && (
                      <button
                        type="button"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                        onClick={() => {
                          setAddPhoto2(null);
                          if (addPreview2?.startsWith("blob:")) URL.revokeObjectURL(addPreview2);
                          setAddPreview2("");
                        }}
                      >
                        Cofnij wybór
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeAdd}
                disabled={savingAdd}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={saveAdd}
                disabled={savingAdd}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
              >
                {savingAdd ? "Zapisuję…" : "Dodaj wpis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDYTUJ */}
      {isAdmin && logged && isEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div className="w-full max-w-3xl rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-cyan-400">
                Edycja wpisu TPM (ID: {String(editId)})
              </h3>
              <button
                type="button"
                onClick={closeEdit}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                disabled={savingEdit}
              >
                ✕
              </button>
            </div>

            {editError && <div className="mb-3 text-red-400 text-sm">{editError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LEWA 2/3 */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-sm opacity-80 mb-1">Opis zgłoszenia</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={editDraft.opis_zgloszenia}
                    onChange={(e) =>
                      setEditDraft((p) => ({ ...p, opis_zgloszenia: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm opacity-80 mb-1">Czas reakcji</label>
                    <select
                      className="w-full rounded-xl p-3 border border-white/10 bg-white text-slate-900"
                      value={editDraft.tpm_time_type}
                      onChange={(e) =>
                        setEditDraft((p) => ({ ...p, tpm_time_type: e.target.value }))
                      }
                    >
                      {TIME_OPTIONS.map((o) => (
                        <option key={o.value} value={String(o.value)}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm opacity-80 mb-1">Status</label>
                    <select
                      className="w-full rounded-xl p-3 border border-white/10 bg-white text-slate-900"
                      value={editDraft.status}
                      onChange={(e) => setEditDraft((p) => ({ ...p, status: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={String(o.value)}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm opacity-80 mb-1">Changed</label>
                  <input
                    type="date"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={editDraft.changed}
                    onChange={(e) => setEditDraft((p) => ({ ...p, changed: e.target.value }))}
                  />
                </div>
              </div>

              {/* PRAWA 1/3: zdjęcia */}
              <div className="md:col-span-1">
                <div className="rounded-xl border border-white/10 p-4 bg-slate-800">
                  <div className="font-semibold mb-3">Zdjęcia</div>

                  {/* PHOTO 1 */}
                  <div className="mb-4">
                    <div className="text-sm opacity-80 mb-2">Zdjęcie 1</div>
                    <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                      {editPreview1 ? (
                        <img
                          src={editPreview1}
                          alt="Podgląd 1"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs opacity-60">Brak</div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setEditPhoto1(file);

                          if (editPreview1?.startsWith("blob:")) URL.revokeObjectURL(editPreview1);

                          if (file) setEditPreview1(URL.createObjectURL(file));
                          // jeśli user wyczyści wybór w input (rzadkie) -> wracamy do pustego
                          else setEditPreview1("");
                        }}
                      />
                    </div>
                    {editPhoto1 && (
                      <button
                        type="button"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                        onClick={() => {
                          setEditPhoto1(null);
                          if (editPreview1?.startsWith("blob:")) URL.revokeObjectURL(editPreview1);
                          // wróć do zdjęcia z backendu, jeśli było (nie mamy już row, więc zostaw aktualny preview jeśli to url http)
                          setEditPreview1((p) => (p?.startsWith("http") ? p : ""));
                        }}
                      >
                        Cofnij wybór
                      </button>
                    )}
                  </div>

                  {/* PHOTO 2 */}
                  <div>
                    <div className="text-sm opacity-80 mb-2">Zdjęcie 2</div>
                    <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                      {editPreview2 ? (
                        <img
                          src={editPreview2}
                          alt="Podgląd 2"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-xs opacity-60">Brak</div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setEditPhoto2(file);

                          if (editPreview2?.startsWith("blob:")) URL.revokeObjectURL(editPreview2);

                          if (file) setEditPreview2(URL.createObjectURL(file));
                          else setEditPreview2("");
                        }}
                      />
                    </div>
                    {editPhoto2 && (
                      <button
                        type="button"
                        className="mt-2 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                        onClick={() => {
                          setEditPhoto2(null);
                          if (editPreview2?.startsWith("blob:")) URL.revokeObjectURL(editPreview2);
                          setEditPreview2((p) => (p?.startsWith("http") ? p : ""));
                        }}
                      >
                        Cofnij wybór
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
              >
                {savingEdit ? "Zapisuję…" : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
