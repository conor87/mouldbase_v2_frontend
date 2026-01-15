// MouldsDetails_Book.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

// --- helpery ---
const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const pickFirst = (obj, keys, fallback = "") => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return fallback;
};

const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("pl-PL");
};

const TPM_TYPE_OPTIONS = [
  { value: 0, label: "AWARIA" },
  { value: 1, label: "USUNIĘCIE AWARII" },
  { value: 2, label: "TPM" },
  { value: 3, label: "NAPRAWA TPM" },
  { value: 4, label: "PRZEGLĄD" },
  { value: 5, label: "REMONT" },
  { value: 6, label: "MODYFIKACJA" },
  { value: 7, label: "PRZEZBROJENIE" },
];

const tpmTypeLabel = (value) => {
  const found = TPM_TYPE_OPTIONS.find((opt) => String(opt.value) === String(value));
  return found?.label ?? String(value ?? "-");
};

const resolveTpmType = (row) => {
  const primary = pickFirst(row, ["tpm_type"], null);
  const fallback = pickFirst(row, ["tpm_time_type", "type"], null);
  const primaryNum = Number(primary);
  const fallbackNum = Number(fallback);

  if (!Number.isNaN(primaryNum) && primaryNum !== 0) return primary;
  if (!Number.isNaN(fallbackNum) && fallbackNum !== 0) return fallback;

  if (primary !== null && primary !== undefined && String(primary).trim() !== "") return primary;
  if (fallback !== null && fallback !== undefined && String(fallback).trim() !== "")
    return fallback;

  return "";
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

export default function MouldsDetails_Book({
  API_BASE,
  mouldId,
  mouldNumber,
  logged,
  isAdmin, // ✅
  authHeaders, // () => ({ Authorization: ... })
}) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- BOOK: dodawanie wpisu ---
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [savingBook, setSavingBook] = useState(false);
  const [bookError, setBookError] = useState(null);
  const [bookDraft, setBookDraft] = useState({
    opis_zgloszenia: "",
    created: "",
    czas_trwania: "0",
    czas_wylaczenia: "0",
    tpm_type: "0",
  });

  // --- BOOK: edycja wpisu ---
  const [isBookEditModalOpen, setIsBookEditModalOpen] = useState(false);
  const [savingBookEdit, setSavingBookEdit] = useState(false);
  const [bookEditError, setBookEditError] = useState(null);
  const [bookEditId, setBookEditId] = useState(null);
  const [bookEditDraft, setBookEditDraft] = useState({
    opis_zgloszenia: "",
    created: "",
    czas_trwania: "0",
    czas_wylaczenia: "0",
    tpm_type: "0",
  });

  // --- DELETE ---
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const sortedBooks = useMemo(() => {
    return [...books].sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }, [books]);

  // --- fetch list ---
  const refreshBooks = async () => {
    if (!mouldNumber) return;
    const res = await axios.get(`${API_BASE}/book/`, {
      params: { search: mouldNumber },
    });
    setBooks(normalizeList(res.data));
  };

  useEffect(() => {
    if (!mouldNumber) return;

    const controller = new AbortController();

    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_BASE}/book/`, {
          params: { search: mouldNumber },
          signal: controller.signal,
        });
        setBooks(normalizeList(res.data));
      } catch (err) {
        if (
          axios.isCancel?.(err) ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        )
          return;
        console.error(err);
        setError("Nie udało się pobrać danych Book.");
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
    return () => controller.abort();
  }, [API_BASE, mouldNumber]);

  // --- MODAL: dodawanie ---
  const openBookModal = () => {
    if (!isAdmin) return;
    setBookError(null);
    setBookDraft({
      opis_zgloszenia: "",
      created: todayInputValue(),
      czas_trwania: "0",
      czas_wylaczenia: "0",
      tpm_type: "0",
    });
    setIsBookModalOpen(true);
  };

  const closeBookModal = () => {
    if (savingBook) return;
    setIsBookModalOpen(false);
    setBookError(null);
  };

  const saveBookEntry = async () => {
    if (!isAdmin) return;

    if (!mouldId) {
      setBookError("Brak mould_id (mouldData.id).");
      return;
    }

    try {
      setSavingBook(true);
      setBookError(null);

      const fd = new FormData();
      fd.append("mould_id", String(mouldId));
      fd.append("opis_zgloszenia", bookDraft.opis_zgloszenia ?? "");
      if (bookDraft.created) {
        fd.append("created", bookDraft.created);
      }

      fd.append("czas_trwania", String(parseInt(bookDraft.czas_trwania || "0", 10) || 0));
      fd.append(
        "czas_wylaczenia",
        String(parseInt(bookDraft.czas_wylaczenia || "0", 10) || 0)
      );

      fd.append("tpm_type", String(parseInt(bookDraft.tpm_type || "0", 10) || 0));

      await axios.post(`${API_BASE}/book/`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(authHeaders?.() ?? {}),
        },
      });

      await refreshBooks();
      closeBookModal();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się dodać wpisu do książki.";
      setBookError(String(msg));
    } finally {
      setSavingBook(false);
    }
  };

  // --- MODAL: edycja ---
  const openBookEditModal = async (row) => {
    if (!isAdmin) return;

    const id = row?.id ?? row?.book_id ?? row?.pk;
    if (!id) return;

    try {
      setBookEditError(null);
      setBookEditId(id);

      const res = await axios.get(`${API_BASE}/book/${id}`, {
        headers: { ...(authHeaders?.() ?? {}) },
      });

      const entry = res.data || {};
      const tpmTypeValue = resolveTpmType(entry) || 0;

      setBookEditDraft({
        opis_zgloszenia: entry.opis_zgloszenia ?? "",
        created: toDateInputValue(entry.created),
        czas_trwania: String(entry.czas_trwania ?? 0),
        czas_wylaczenia: String(entry.czas_wylaczenia ?? 0),
        tpm_type: String(tpmTypeValue ?? 0),
      });

      setIsBookEditModalOpen(true);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail || "Nie udało się pobrać danych wpisu do edycji.";
      setBookEditError(String(msg));
    }
  };

  const closeBookEditModal = () => {
    if (savingBookEdit) return;
    setBookEditId(null);
    setBookEditError(null);
    setIsBookEditModalOpen(false);
  };

  const saveBookEdit = async () => {
    if (!isAdmin) return;
    if (!bookEditId) return;

    try {
      setSavingBookEdit(true);
      setBookEditError(null);

      const fd = new FormData();
      fd.append("opis_zgloszenia", bookEditDraft.opis_zgloszenia ?? "");
      if (bookEditDraft.created) {
        fd.append("created", bookEditDraft.created);
      }
      fd.append("czas_trwania", String(parseInt(bookEditDraft.czas_trwania || "0", 10) || 0));
      fd.append(
        "czas_wylaczenia",
        String(parseInt(bookEditDraft.czas_wylaczenia || "0", 10) || 0)
      );
      fd.append("tpm_type", String(parseInt(bookEditDraft.tpm_type || "0", 10) || 0));

      await axios.put(`${API_BASE}/book/${bookEditId}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(authHeaders?.() ?? {}),
        },
      });

      await refreshBooks();
      closeBookEditModal();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się zapisać edycji wpisu.";
      setBookEditError(String(msg));
    } finally {
      setSavingBookEdit(false);
    }
  };

  // --- DELETE ---
  const deleteBookEntry = async (row) => {
    if (!isAdmin) return;

    const id = row?.id ?? row?.book_id ?? row?.pk;
    if (!id) return;

    setDeleteError(null);

    const ok = window.confirm(`Usunąć wpis książki serwisowej (ID: ${id})?`);
    if (!ok) return;

    try {
      setDeletingId(id);

      await axios.delete(`${API_BASE}/book/${id}`, {
        headers: { ...(authHeaders?.() ?? {}) },
      });

      setBooks((prev) => prev.filter((x) => (x?.id ?? x?.book_id ?? x?.pk) !== id));
      await refreshBooks();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się usunąć wpisu.";
      setDeleteError(String(msg));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <section className="p-4 text-white">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-3xl text-cyan-400 font-bold">Wpisy książki serwisowej:</h2>

          {/* ✅ tylko admin */}
          {isAdmin && logged && (
            <button
              type="button"
              onClick={openBookModal}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
              title="Dodaj wpis"
              aria-label="Dodaj wpis"
            >
              ＋
            </button>
          )}
        </div>

        {loading && <p>Ładowanie danych…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {deleteError && <p className="text-red-400">{deleteError}</p>}

        {!loading && !error && sortedBooks.length === 0 && (
          <p className="opacity-80">Brak wyników Book dla tej formy.</p>
        )}

        {!loading && !error && sortedBooks.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-center px-4 py-3 font-semibold">ID</th>
                  <th className="text-center px-4 py-3 font-semibold">Created</th>
                  <th className="text-center px-4 py-3 font-semibold">Opis zgłoszenia</th>
                  <th className="text-center px-4 py-3 font-semibold">Typ</th>
                  <th className="text-center px-4 py-3 font-semibold">Czas trwania</th>
                  <th className="text-center px-4 py-3 font-semibold">Czas wyłączenia</th>

                  {isAdmin && <th className="text-center px-4 py-3 font-semibold">Akcje</th>}
                </tr>
              </thead>

              <tbody className="text-center">
                {sortedBooks.map((b, index) => {
                  const id = pickFirst(b, ["id", "pk", "book_id"], index + 1);

                  const created = formatDateOnly(
                    pickFirst(b, ["created", "created_at", "date", "timestamp"], "")
                  );

                  const opis = pickFirst(
                    b,
                    ["opis_zgloszenia", "opis", "description", "title", "subject", "note"],
                    ""
                  );

                  const czas_trwania = pickFirst(
                    b,
                    ["czas_trwania", "duration", "duration_minutes", "time_duration"],
                    ""
                  );

                  const czas_wylaczenia = pickFirst(
                    b,
                    ["czas_wylaczenia", "duration", "duration_minutes", "time_duration"],
                    ""
                  );

                  const tpmType = resolveTpmType(b);

                  const isDeletingThis = deletingId !== null && String(deletingId) === String(id);

                  return (
                    <tr key={String(id)} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 align-top whitespace-nowrap">{String(id)}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">{created || "-"}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="whitespace-pre-wrap break-words">{opis || "-"}</div>
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {tpmTypeLabel(tpmType)}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">{czas_trwania || "-"}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">{czas_wylaczenia || "-"}</td>

                      {isAdmin && (
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                              title="Edytuj wpis"
                              aria-label="Edytuj wpis"
                              onClick={() => openBookEditModal(b)}
                            >
                              ✎
                            </button>

                            <button
                              type="button"
                              className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 disabled:opacity-50"
                              title="Usuń wpis"
                              aria-label="Usuń wpis"
                              onClick={() => deleteBookEntry(b)}
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
        )}
      </section>

      {/* MODAL: DODAJ WPIS (bez zdjęć i bez sv/ido/status) */}
      {isAdmin && isBookModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeBookModal();
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-cyan-400">Nowy wpis książki serwisowej</h3>
              <button
                type="button"
                onClick={closeBookModal}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                disabled={savingBook}
              >
                ✕
              </button>
            </div>

            {bookError && <div className="mb-3 text-red-400 text-sm">{bookError}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm opacity-80 mb-1">Opis zgłoszenia</label>
                <textarea
                  className="w-full min-h-[120px] rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                  value={bookDraft.opis_zgloszenia}
                  onChange={(e) => setBookDraft((p) => ({ ...p, opis_zgloszenia: e.target.value }))}
                  placeholder="Wpisz opis…"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm opacity-80 mb-1">Data</label>
                  <input
                    type="date"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={bookDraft.created}
                    onChange={(e) => setBookDraft((p) => ({ ...p, created: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm opacity-80 mb-1">Czas trwania</label>
                  <input
                    type="number"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={bookDraft.czas_trwania}
                    onChange={(e) => setBookDraft((p) => ({ ...p, czas_trwania: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm opacity-80 mb-1">Czas wyłączenia</label>
                  <input
                    type="number"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={bookDraft.czas_wylaczenia}
                    onChange={(e) =>
                      setBookDraft((p) => ({ ...p, czas_wylaczenia: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">TPM type</label>
                <select
                  className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                  value={bookDraft.tpm_type}
                  onChange={(e) => setBookDraft((p) => ({ ...p, tpm_type: e.target.value }))}
                >
                  {TPM_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={String(opt.value)} style={{ color: "#000" }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeBookModal}
                disabled={savingBook}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={saveBookEntry}
                disabled={savingBook}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
              >
                {savingBook ? "Zapisuję…" : "Dodaj wpis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDYTUJ WPIS (bez zdjęć i bez sv/ido/status) */}
      {isAdmin && isBookEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeBookEditModal();
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-cyan-400">
                Edycja wpisu książki (ID: {String(bookEditId)})
              </h3>
              <button
                type="button"
                onClick={closeBookEditModal}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                disabled={savingBookEdit}
              >
                ✕
              </button>
            </div>

            {bookEditError && <div className="mb-3 text-red-400 text-sm">{bookEditError}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm opacity-80 mb-1">Opis zgłoszenia</label>
                <textarea
                  className="w-full min-h-[120px] rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                  value={bookEditDraft.opis_zgloszenia}
                  onChange={(e) =>
                    setBookEditDraft((p) => ({ ...p, opis_zgloszenia: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm opacity-80 mb-1">Data</label>
                  <input
                    type="date"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={bookEditDraft.created}
                    onChange={(e) =>
                      setBookEditDraft((p) => ({ ...p, created: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm opacity-80 mb-1">Czas trwania</label>
                  <input
                    type="number"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={bookEditDraft.czas_trwania}
                    onChange={(e) =>
                      setBookEditDraft((p) => ({ ...p, czas_trwania: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm opacity-80 mb-1">Czas wyłączenia</label>
                  <input
                    type="number"
                    className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                    value={bookEditDraft.czas_wylaczenia}
                    onChange={(e) =>
                      setBookEditDraft((p) => ({ ...p, czas_wylaczenia: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">TPM type</label>
                <select
                  className="w-full rounded-xl p-3 bg-white/5 border border-white/10 text-white"
                  value={bookEditDraft.tpm_type}
                  onChange={(e) =>
                    setBookEditDraft((p) => ({ ...p, tpm_type: e.target.value }))
                  }
                >
                  {TPM_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeBookEditModal}
                disabled={savingBookEdit}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={saveBookEdit}
                disabled={savingBookEdit}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
              >
                {savingBookEdit ? "Zapisuję…" : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
