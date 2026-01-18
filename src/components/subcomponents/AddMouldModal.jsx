import React, { useMemo, useState } from "react";
import axios from "axios";

// enums z backendu
const PLACE_OPTIONS = [
  { value: 0, label: "PRODUKCJA" },
  { value: 1, label: "NARZĘDZIOWNIA" },
  { value: 2, label: "KOOPERACJA" },
  { value: 3, label: "MAGAZYN FORM" },
];

const STATUS_OPTIONS = [
  { value: 0, label: "PRODUKCYJNA" },
  { value: 1, label: "TPM" },
  { value: 2, label: "AWARIA" },
  { value: 3, label: "MODYFIKACJA" },
  { value: 4, label: "PRZEZBRAJANA" },
  { value: 5, label: "W PRZEGLĄDZIE" },
];

const emptyDraft = () => ({
  mould_number: "",
  product: "",
  released: "", // YYYY-MM-DD
  company: "Lamela",
  czy_przezbrajalna: false,

  num_of_cavities: "",
  tool_weight: "",

  total_cycles: 0,
  to_maint_cycles: 0,
  from_maint_cycles: 0,

  place: 0,
  status: 0,

  notes: "",

  // pliki
  mould_photo: null,
  product_photo: null,
  hot_system_photo: null,
  extra_photo_1: null,
  extra_photo_2: null,
  extra_photo_3: null,
  extra_photo_4: null,
  extra_photo_5: null,
});

export default function AddMouldModal({
  open,
  canEdit,
  API_BASE,
  authHeaders,
  onClose,
  onCreated,
}) {
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  // reset draft przy otwarciu
  React.useEffect(() => {
    if (open) {
      setDraft(emptyDraft());
      setErrMsg(null);
      setSaving(false);
    }
  }, [open]);

  const fileFields = useMemo(
    () => [
      "product_photo",
      "mould_photo",
      "hot_system_photo",
      "extra_photo_1",
      "extra_photo_2",
      "extra_photo_3",
      "extra_photo_4",
      "extra_photo_5",
    ],
    []
  );

  const close = () => {
    if (saving) return;
    onClose?.();
  };

  const save = async () => {
  if (!canEdit) return;

  const mn = String(draft.mould_number || "").trim();
  const prod = String(draft.product || "").trim();
  if (!mn || !prod) {
    setErrMsg("Uzupełnij wymagane pola: numer formy i produkt.");
    return;
  }

  try {
    setSaving(true);
    setErrMsg(null);

    const fd = new FormData();

    // wymagane
    fd.append("mould_number", mn);
    fd.append("product", prod);

    // opcjonalne
    fd.append("company", String(draft.company || "Lamela").trim());
    fd.append("czy_przezbrajalna", draft.czy_przezbrajalna ? "true" : "false");

    if (String(draft.released || "").trim()) fd.append("released", draft.released);

    fd.append("num_of_cavities", String(draft.num_of_cavities ?? ""));
    fd.append("tool_weight", String(draft.tool_weight ?? ""));

    fd.append("total_cycles", String(Number(draft.total_cycles ?? 0)));
    fd.append("to_maint_cycles", String(Number(draft.to_maint_cycles ?? 0)));
    fd.append("from_maint_cycles", String(Number(draft.from_maint_cycles ?? 0)));

    fd.append("place", String(Number(draft.place ?? 0)));
    fd.append("status", String(Number(draft.status ?? 0)));

    fd.append("notes", String(draft.notes ?? ""));

    // pliki
    for (const k of fileFields) {
      const f = draft[k];
      if (f instanceof File) {
        fd.append(k, f, f.name);
      }
    }

    // DEBUG (zostaw na chwilę)
    for (const [k, v] of fd.entries()) console.log("FD:", k, v);

    // ✅ bezpieczne budowanie URL (żeby nie było // albo /moulds/moulds)
    const base = String(API_BASE || "").replace(/\/+$/, "");
    const url = `${base}/moulds/`;

    await axios.post(url, fd, {
      headers: {
        // ✅ tak jak w MouldDetails_BasicInfo — wymuszamy multipart
        "Content-Type": "multipart/form-data",
        ...(authHeaders?.() ?? {}),
      },
    });

    onCreated?.();
    close();
  } catch (e) {
    console.error(e);
    const msg = e?.response?.data?.detail || e?.message || "Nie udało się dodać nowej formy.";
    setErrMsg(String(msg));
  } finally {
    setSaving(false);
  }
};


  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="min-h-full flex items-start justify-center py-6">
        <div className="w-full max-w-5xl rounded-2xl bg-slate-800 border border-white/10 shadow-2xl text-white max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-slate-800 z-10">
            <h3 className="text-xl font-bold text-cyan-400">Dodaj nową formę</h3>
            <button
              type="button"
              onClick={close}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
              disabled={saving}
            >
              ✕
            </button>
          </div>

          <div className="p-5 overflow-y-auto">
            {errMsg && <p className="text-red-400 mb-3">{errMsg}</p>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm opacity-80 mb-1">Numer formy *</label>
                <input
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.mould_number}
                  onChange={(e) => setDraft((p) => ({ ...p, mould_number: e.target.value }))}
                  placeholder="np. F-1234"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm opacity-80 mb-1">Produkt *</label>
                <input
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.product}
                  onChange={(e) => setDraft((p) => ({ ...p, product: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">Firma</label>
                <input
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.company}
                  onChange={(e) => setDraft((p) => ({ ...p, company: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">Released</label>
                <input
                  type="date"
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.released}
                  onChange={(e) => setDraft((p) => ({ ...p, released: e.target.value }))}
                />
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={draft.czy_przezbrajalna}
                    onChange={(e) => setDraft((p) => ({ ...p, czy_przezbrajalna: e.target.checked }))}
                  />
                  <span className="opacity-90">Czy przezbrajalna</span>
                </label>
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">Num of cavities</label>
                <input
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.num_of_cavities}
                  onChange={(e) => setDraft((p) => ({ ...p, num_of_cavities: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">Tool weight</label>
                <input
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.tool_weight}
                  onChange={(e) => setDraft((p) => ({ ...p, tool_weight: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">Total cycles</label>
                <input
                  type="number"
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.total_cycles}
                  onChange={(e) => setDraft((p) => ({ ...p, total_cycles: Number(e.target.value || 0) }))}
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">To maint cycles</label>
                <input
                  type="number"
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.to_maint_cycles}
                  onChange={(e) => setDraft((p) => ({ ...p, to_maint_cycles: Number(e.target.value || 0) }))}
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">From maint cycles</label>
                <input
                  type="number"
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.from_maint_cycles}
                  onChange={(e) => setDraft((p) => ({ ...p, from_maint_cycles: Number(e.target.value || 0) }))}
                />
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">Place</label>
                <select
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.place}
                  onChange={(e) => setDraft((p) => ({ ...p, place: Number(e.target.value) }))}
                >
                  {PLACE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm opacity-80 mb-1">Status</label>
                <select
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  value={draft.status}
                  onChange={(e) => setDraft((p) => ({ ...p, status: Number(e.target.value) }))}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm opacity-80 mb-1">Notatki</label>
                <textarea
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10 min-h-[110px]"
                  value={draft.notes}
                  onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="md:col-span-3">
                <div className="text-sm font-semibold opacity-90 mb-2">Zdjęcia (opcjonalnie)</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {fileFields.map((k) => (
                    <div key={k}>
                      <label className="block text-sm opacity-80 mb-1">{k}</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                        onChange={(e) => setDraft((p) => ({ ...p, [k]: e.target.files?.[0] ?? null }))}
                      />
                    </div>
                  ))}
                </div>

                {/* jeśli kiedyś będziesz chciał obsłużyć *_path z backendu:
                    dodaj inputy tekstowe mould_photo_path itd. */}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
            >
              {saving ? "Zapisuję…" : "Dodaj"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
