// DeleteMouldModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

// budowanie src dla zdjęć (ścieżka /media/... albo pełny URL)
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

export default function DeleteMouldModal({
  open,
  API_BASE,
  authHeaders, // funkcja zwracająca nagłówki auth (Bearer)
  onClose,
  onDeleted, // callback po usunięciu (np. refresh listy)
}) {
  const [mouldNumber, setMouldNumber] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [preview, setPreview] = useState(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const mnUp = useMemo(() => mouldNumber.trim().toUpperCase(), [mouldNumber]);
  const confirmOk = useMemo(() => confirmText.trim().toUpperCase() === mnUp && mnUp.length > 0, [confirmText, mnUp]);

  useEffect(() => {
    if (!open) return;
    setMouldNumber("");
    setConfirmText("");
    setPreview(null);
    setPreviewError(null);
    setDeleteError(null);
    setDeleting(false);
    setPreviewLoading(false);
  }, [open]);

  // podgląd formy po numerze (z debounce)
  useEffect(() => {
    if (!open) return;

    const q = mnUp;
    setPreview(null);
    setPreviewError(null);

    if (!q) return;

    const t = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        setPreviewError(null);

        const base = String(API_BASE || "").replace(/\/+$/, "");
        const res = await axios.get(`${base}/moulds/${encodeURIComponent(q)}`, {
          headers: { ...(authHeaders?.() ?? {}) },
        });

        setPreview(res.data || null);
      } catch (e) {
        setPreview(null);
        const msg = e?.response?.data?.detail || "Nie znaleziono formy lub błąd pobierania.";
        setPreviewError(String(msg));
      } finally {
        setPreviewLoading(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [open, mnUp, API_BASE, authHeaders]);

  const close = () => {
    if (deleting) return;
    onClose?.();
  };

  const doDelete = async () => {
    const q = mnUp;
    if (!q || !confirmOk) return;

    try {
      setDeleting(true);
      setDeleteError(null);

      const base = String(API_BASE || "").replace(/\/+$/, "");
      await axios.delete(`${base}/moulds/${encodeURIComponent(q)}`, {
        headers: { ...(authHeaders?.() ?? {}) },
      });

      onDeleted?.(q);
      close();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        (e?.response?.status === 409
          ? "Nie można usunąć (powiązane rekordy)."
          : "Nie udało się usunąć formy.");
      setDeleteError(String(msg));
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  const productPhoto = buildMediaSrc(API_BASE, preview?.product_photo);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="min-h-full flex items-start justify-center py-6">
        <div className="w-full max-w-4xl rounded-2xl bg-slate-800 border border-white/10 shadow-2xl text-white max-h-[90vh] flex flex-col">
          {/* header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-slate-800 z-10">
            <div>
              <h3 className="text-xl font-bold text-red-300">Usuń formę</h3>
              <div className="text-xs opacity-70 mt-1">Tylko superadmin. Operacja nieodwracalna.</div>
            </div>

            <button
              type="button"
              onClick={close}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
              disabled={deleting}
            >
              ✕
            </button>
          </div>

          {/* body */}
          <div className="p-5 overflow-y-auto">
            {deleteError && <div className="mb-3 text-red-300 text-sm">{deleteError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* left */}
              <div className="rounded-2xl border border-white/10 p-4 bg-black/10">
                <div className="text-sm font-semibold mb-2">1) Wpisz numer formy do usunięcia</div>

                <input
                  className="w-full rounded-xl p-3 bg-white text-black border border-white/10"
                  placeholder="np. F-1234"
                  value={mouldNumber}
                  onChange={(e) => setMouldNumber(e.target.value)}
                  disabled={deleting}
                />

                <div className="mt-4 text-sm font-semibold mb-2">2) Potwierdź (przepisz dokładnie numer)</div>
                <input
                  className={`w-full rounded-xl p-3 bg-white text-black border ${
                    confirmText.length === 0
                      ? "border-white/10"
                      : confirmOk
                      ? "border-green-500"
                      : "border-red-500"
                  }`}
                  placeholder={mnUp ? `Wpisz: ${mnUp}` : "Najpierw wpisz numer formy"}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={!mnUp || deleting}
                />

                <div className="mt-3 text-xs opacity-70">
                  Usunięcie może się nie udać, jeśli forma ma powiązane rekordy (TPM/książka/przezbrojenia) i baza blokuje FK.
                </div>
              </div>

              {/* right preview */}
              <div className="rounded-2xl border border-white/10 p-4 bg-black/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">Podgląd</div>
                  {previewLoading && <div className="text-xs opacity-70">Ładowanie…</div>}
                </div>

                {!mnUp && <div className="text-sm opacity-70">Wpisz numer, aby zobaczyć podgląd.</div>}

                {mnUp && previewError && <div className="text-sm text-red-300">{previewError}</div>}

                {mnUp && !previewError && preview && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="opacity-80">Numer</div>
                      <div className="font-semibold">{preview.mould_number}</div>

                      <div className="opacity-80">Produkt</div>
                      <div className="font-semibold">{preview.product || "-"}</div>

                      <div className="opacity-80">Firma</div>
                      <div className="font-semibold">{preview.company || "-"}</div>

                      <div className="opacity-80">Gniazda</div>
                      <div className="font-semibold">{preview.num_of_cavities ?? "-"}</div>

                      <div className="opacity-80">Resurs</div>
                      <div className="font-semibold">{preview.to_maint_cycles ?? "-"}</div>

                      <div className="opacity-80">Cykle</div>
                      <div className="font-semibold">{preview.total_cycles ?? "-"}</div>
                    </div>

                    <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
                      <div className="text-xs px-3 py-2 border-b border-white/10 opacity-80">Zdjęcie produktu</div>
                      <div className="w-full aspect-square flex items-center justify-center">
                        {productPhoto ? (
                          <img src={productPhoto} alt="product" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-sm opacity-60">Brak zdjęcia</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
              Anuluj
            </button>

            <button
              type="button"
              onClick={doDelete}
              disabled={deleting || !confirmOk || !preview}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 disabled:opacity-50 text-black font-semibold"
              title={!preview ? "Najpierw wybierz istniejącą formę" : "Usuń formę"}
            >
              {deleting ? "Usuwam…" : "Usuń formę"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
