import React from "react";
import MouldSelect from "./MouldSelect";

export default function AddChangeoverModal({
  isOpen,
  onClose,
  onSave,
  saving,
  error,
  draft,
  setDraft,
  moulds,
  labelMould,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-white/10 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-cyan-300">Dodaj przezbrojenie</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {error && <p className="mb-3 text-red-300">{error}</p>}

        <div className="grid gap-3">
          <MouldSelect
            label="Z jakiej formy"
            value={draft.from_mould_id}
            onChange={(v) => setDraft((d) => ({ ...d, from_mould_id: v }))}
            moulds={moulds}
            labelMould={labelMould}
          />

          <MouldSelect
            label="Na jaką formę"
            value={draft.to_mould_id}
            onChange={(v) => setDraft((d) => ({ ...d, to_mould_id: v }))}
            moulds={moulds}
            labelMould={labelMould}
          />

          <label className="grid gap-1 text-sm">
            <span className="opacity-80">Dostępna od</span>
            <input
              type="datetime-local"
              className="rounded-lg bg-white text-slate-900 border border-slate-300 px-3 py-2"
              value={draft.available_date}
              onChange={(e) => setDraft((d) => ({ ...d, available_date: e.target.value }))}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="opacity-80">Potrzebna na</span>
            <input
              type="datetime-local"
              className="rounded-lg bg-white text-slate-900 border border-slate-300 px-3 py-2"
              value={draft.needed_date}
              onChange={(e) => setDraft((d) => ({ ...d, needed_date: e.target.value }))}
            />
          </label>

          <label className="flex items-center gap-2 text-sm mt-1">
            <input
              type="checkbox"
              checked={Boolean(draft.czy_wykonano)}
              onChange={(e) => setDraft((d) => ({ ...d, czy_wykonano: e.target.checked }))}
            />
            <span>Wykonano</span>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-semibold disabled:opacity-50"
          >
            {saving ? "Zapisywanie…" : "Zapisz"}
          </button>
        </div>
      </div>
    </div>
  );
}
