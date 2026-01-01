// MouldDetails_Notes.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function MouldDetails_Notes({
  API_BASE,
  mouldData,
  logged,
  isAdmin,
  authHeaders,
  onMouldUpdated,
}) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState(null);

  useEffect(() => {
    // gdy zmienia się mouldData, a nie jesteśmy w edycji - odśwież draft
    if (!isEditingNotes) {
      setNotesDraft(mouldData?.notes ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mouldData?.notes]);

  const startEditNotes = () => {
    if (!isAdmin) return; // ✅ tylko admin
    setNotesError(null);
    setNotesDraft(mouldData?.notes ?? "");
    setIsEditingNotes(true);
  };

  const cancelEditNotes = () => {
    setNotesError(null);
    setIsEditingNotes(false);
    setNotesDraft(mouldData?.notes ?? "");
  };

  const saveNotes = async () => {
    if (!isAdmin) return; // ✅ tylko admin
    const mouldNumber = mouldData?.mould_number;
    if (!mouldNumber) return;

    try {
      setSavingNotes(true);
      setNotesError(null);

      const fd = new FormData();
      fd.append("mould_number", mouldNumber);
      fd.append("notes", notesDraft);

      const res = await axios.put(`${API_BASE}/moulds/`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(authHeaders?.() ?? {}),
        },
      });

      const merged = { ...(mouldData ?? {}), ...res.data };
      onMouldUpdated?.(merged);
      setIsEditingNotes(false);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się zapisać notatek.";
      setNotesError(String(msg));
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="border rounded-xl border-blue-500 mt-12 p-4">
      <div className="flex items-center gap-3">
        <h3 className="text-3xl text-cyan-400 font-bold mb-4">Notatki:</h3>

        {/* ✅ tylko admin */}
        {isAdmin && !isEditingNotes && (
          <button
            type="button"
            onClick={startEditNotes}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            title="Edytuj notatki"
            aria-label="Edytuj notatki"
          >
            ✎
          </button>
        )}
      </div>

      {!isEditingNotes ? (
        <div className="mt-2 whitespace-pre-wrap break-words text-white">
          {mouldData?.notes?.trim() ? mouldData.notes : "-"}
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            className="w-full min-h-[120px] rounded-xl p-3 bg-white/5 border border-white/10 text-white"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Wpisz notatki…"
          />

          {notesError && <div className="mt-2 text-red-400 text-sm">{notesError}</div>}

          {/* ✅ tylko admin (ale i tak tu jesteśmy tylko jak admin kliknął) */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={saveNotes}
              disabled={savingNotes}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
            >
              {savingNotes ? "Zapisuję…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={cancelEditNotes}
              disabled={savingNotes}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* (opcjonalnie) info dla nie-admina */}
      {!isAdmin && logged && (
        <div className="mt-3 text-xs opacity-70">
          Brak uprawnień do edycji notatek (wymagany administrator).
        </div>
      )}
    </div>
  );
}
