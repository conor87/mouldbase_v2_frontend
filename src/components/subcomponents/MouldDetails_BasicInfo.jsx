// MouldDetails_BasicInfo.jsx
import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";

const QR_PUBLIC_ORIGIN = "http://10.10.77.75:5173";

// do input[type="date"] => "YYYY-MM-DD"
const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

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

export default function MouldDetails_BasicInfo({
  API_BASE,
  mouldData,
  logged,
  isAdmin,
  authHeaders,
  imageSrc,
  onMouldUpdated,
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingMould, setSavingMould] = useState(false);
  const [mouldEditError, setMouldEditError] = useState(null);

  const [mouldDraft, setMouldDraft] = useState({
    mould_number: "",
    company: "",
    tool_weight: "",
    product: "",
    total_cycles: "",
    released: "",
    to_maint_cycles: "",
    num_of_cavities: "",
    from_maint_cycles: "",
  });

  const [productPhotoFile, setProductPhotoFile] = useState(null);
  const [productPhotoPreview, setProductPhotoPreview] = useState("");
  const [mouldPhotoFile, setMouldPhotoFile] = useState(null);
  const [mouldPhotoPreview, setMouldPhotoPreview] = useState("");
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDescription, setQrDescription] = useState("");
  const qrCanvasRef = useRef(null);

  const serverPreviewFallback = useMemo(() => {
    return imageSrc || buildMediaSrc(API_BASE, mouldData?.product_photo) || "/media/default.png";
  }, [API_BASE, imageSrc, mouldData?.product_photo]);

  const serverMouldPreviewFallback = useMemo(() => {
    return buildMediaSrc(API_BASE, mouldData?.mould_photo) || "/media/default.png";
  }, [API_BASE, mouldData?.mould_photo]);

  const mouldDetailsUrl = useMemo(() => {
    const number = mouldData?.mould_number ? encodeURIComponent(mouldData.mould_number) : "";
    return `${QR_PUBLIC_ORIGIN}/moulds/${number}`;
  }, [mouldData?.mould_number]);

  const openQrModal = () => {
    const defaultDescription = [
      mouldData?.mould_number,
      mouldData?.product,
    ].filter(Boolean).join(" - ");
    setQrDescription(defaultDescription);
    setIsQrModalOpen(true);
  };

  const closeQrModal = () => {
    setIsQrModalOpen(false);
  };

  const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    let line = "";
    let currentY = y;

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    });

    if (line) ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
  };

  const downloadQr = () => {
    const sourceCanvas = qrCanvasRef.current;
    if (!sourceCanvas) return;

    const canvas = document.createElement("canvas");
    canvas.width = 560;
    canvas.height = qrDescription.trim() ? 700 : 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 28px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Forma ${mouldData?.mould_number || ""}`, canvas.width / 2, 54);

    let y = 94;
    if (qrDescription.trim()) {
      ctx.font = "400 18px Arial, sans-serif";
      y = drawWrappedText(ctx, qrDescription.trim(), canvas.width / 2, y, 480, 26);
      y += 12;
    }

    const qrSize = 360;
    const qrX = (canvas.width - qrSize) / 2;
    ctx.drawImage(sourceCanvas, qrX, y, qrSize, qrSize);

    ctx.font = "400 16px Arial, sans-serif";
    ctx.fillStyle = "#334155";
    drawWrappedText(ctx, mouldDetailsUrl, canvas.width / 2, y + qrSize + 38, 480, 22);

    const link = document.createElement("a");
    link.download = `qr-${String(mouldData?.mould_number || "forma").replace(/[^\w.-]+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const setDraftField = (key, value) => {
    setMouldDraft((prev) => ({ ...prev, [key]: value }));
  };

  const openEditModal = () => {
    if (!isAdmin) return; // ✅ tylko admin
    if (!mouldData) return;

    setMouldEditError(null);

    setMouldDraft({
      mould_number: mouldData.mould_number ?? "",
      company: mouldData.company ?? "",
      tool_weight: mouldData.tool_weight ?? "",
      product: mouldData.product ?? "",
      total_cycles:
        mouldData.total_cycles !== undefined && mouldData.total_cycles !== null
          ? String(mouldData.total_cycles)
          : "",
      released: toDateInputValue(mouldData.released),
      to_maint_cycles:
        mouldData.to_maint_cycles !== undefined && mouldData.to_maint_cycles !== null
          ? String(mouldData.to_maint_cycles)
          : "",
      num_of_cavities: mouldData.num_of_cavities ?? "",
      from_maint_cycles:
        mouldData.from_maint_cycles !== undefined && mouldData.from_maint_cycles !== null
          ? String(mouldData.from_maint_cycles)
          : "",
    });

    setProductPhotoFile(null);
    setProductPhotoPreview(serverPreviewFallback);
    setMouldPhotoFile(null);
    setMouldPhotoPreview(serverMouldPreviewFallback);

    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (savingMould) return;

    if (productPhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(productPhotoPreview);
    }
    setProductPhotoPreview("");
    setProductPhotoFile(null);
    if (mouldPhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(mouldPhotoPreview);
    }
    setMouldPhotoPreview("");
    setMouldPhotoFile(null);

    setIsEditModalOpen(false);
    setMouldEditError(null);
  };

  const saveMouldFields = async () => {
    if (!isAdmin) return; // ✅ tylko admin
    const currentNumber = mouldData?.mould_number;
    if (!currentNumber) return;
    const nextNumber = String(mouldDraft.mould_number ?? "").trim();
    if (!nextNumber) {
      setMouldEditError("Numer formy jest wymagany.");
      return;
    }

    try {
      setSavingMould(true);
      setMouldEditError(null);

      const fd = new FormData();
      fd.append("new_mould_number", nextNumber);

      fd.append("company", mouldDraft.company ?? "");
      fd.append("tool_weight", mouldDraft.tool_weight ?? "");
      fd.append("product", mouldDraft.product ?? "");
      fd.append("num_of_cavities", mouldDraft.num_of_cavities ?? "");
      fd.append("released", mouldDraft.released ?? "");

      const maybeAppendInt = (name, value) => {
        const v = String(value ?? "").trim();
        if (v === "") return;
        fd.append(name, v);
      };

      maybeAppendInt("total_cycles", mouldDraft.total_cycles);
      maybeAppendInt("to_maint_cycles", mouldDraft.to_maint_cycles);
      maybeAppendInt("from_maint_cycles", mouldDraft.from_maint_cycles);

      if (productPhotoFile) {
        fd.append("product_photo", productPhotoFile);
      }

      if (mouldPhotoFile) {
        fd.append("mould_photo", mouldPhotoFile);
      }


        const res = await axios.put(`${API_BASE.replace(/\/+$/, "")}/moulds/${encodeURIComponent(currentNumber)}`, fd, {
        headers: {
            ...(authHeaders?.() ?? {}),
            // NIE ustawiaj Content-Type ręcznie przy FormData
        },
        });


      const merged = { ...(mouldData ?? {}), ...res.data, mould_number: nextNumber };
      onMouldUpdated?.(merged);

      if (productPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(productPhotoPreview);
      }
      setProductPhotoPreview("");
      setProductPhotoFile(null);
      if (mouldPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(mouldPhotoPreview);
      }
      setMouldPhotoPreview("");
      setMouldPhotoFile(null);

      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || "Nie udało się zapisać danych.";
      setMouldEditError(String(msg));
    } finally {
      setSavingMould(false);
    }
  };

  return (
    <>
      <div className="border rounded-xl border-blue-500 p-4">
        <h3 className="text-3xl text-cyan-400 font-bold mb-4 flex items-center gap-3">
          Podstawowe informacje:
          <button
            type="button"
            onClick={openQrModal}
            className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500 text-blue-200 hover:bg-blue-500/30 text-sm"
            title="Wygeneruj kod QR do szczegółów formy"
            aria-label="Wygeneruj kod QR do szczegółów formy"
          >
            QR
          </button>
          {/* ✅ tylko admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={openEditModal}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
              title="Edytuj dane formy"
              aria-label="Edytuj dane formy"
            >
              ✎
            </button>
          )}
        </h3>

        <div className="w-full grid grid-cols-2 gap-4 text-xl mt-2">
          <div>
            <span className="text-blue-400">
              Firma:{" "}
            </span>
            <span className="text-gray-200">
              {mouldData.company}
            </span>
          </div>

          <div>
            <span className="text-blue-400">
              Waga formy:{" "}
            </span>
            <span className="text-gray-200">
              {mouldData.tool_weight}
            </span>
          </div>

          <div>
            <span className="text-blue-400">
              Produkt:{" "}
            </span>
            <span className="text-gray-200">
              {mouldData.product}
            </span>
          </div>

          <div>
            <span className="text-blue-400">
              Całkowita ilość cykli:{" "}
            </span>
            <span className="text-gray-200">
              {mouldData.total_cycles}
            </span>
          </div>

          <div>
            <span className="text-blue-400">
              Oddana do produkcji:{" "}
            </span>
            <span className="text-gray-200">
              {String(mouldData.released)}
            </span>
          </div>

          <div>
            <span className="text-blue-400">
              Resurs:{" "}
            </span>
            <span className="text-gray-200">
              {mouldData.to_maint_cycles}
            </span>
          </div>

          <div>
            <span className="text-blue-400">
              Liczba gniazd:{" "}
            </span>
            <span className="text-gray-200">
              {mouldData.num_of_cavities}
            </span>
          </div>

          <div>
            <span className="text-blue-400">
              Ilość cykli od przeglądu:{" "}
            </span>
            <span className="text-gray-200">
              {mouldData.from_maint_cycles}
            </span>
          </div>
        </div>

        {!isAdmin && logged && (
          <div className="mt-3 text-xs opacity-70">
            Brak uprawnień do edycji danych formy (wymagany administrator).
          </div>
        )}
      </div>

      {isQrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeQrModal();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-cyan-400">Kod QR formy</h3>
              <button
                type="button"
                onClick={closeQrModal}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                aria-label="Zamknij"
              >
                x
              </button>
            </div>

            <label className="block text-sm text-slate-300 mb-2">
              Mały opis
            </label>
            <input
              value={qrDescription}
              onChange={(e) => setQrDescription(e.target.value)}
              className="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
              placeholder="Np. numer formy, wyrób, lokalizacja"
            />

            <div className="mt-4 rounded-xl bg-white p-5 text-slate-900 flex flex-col items-center">
              <div className="text-lg font-bold mb-1 text-center">
                {mouldData?.mould_number}
              </div>
              {qrDescription.trim() && (
                <div className="text-sm text-slate-600 mb-4 text-center max-w-sm">
                  {qrDescription.trim()}
                </div>
              )}
              <QRCodeCanvas
                ref={qrCanvasRef}
                value={mouldDetailsUrl}
                size={220}
                level="M"
                includeMargin
              />
              <div className="mt-3 text-xs text-slate-500 break-all text-center">
                {mouldDetailsUrl}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeQrModal}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20"
              >
                Zamknij
              </button>
              <button
                type="button"
                onClick={downloadQr}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
              >
                Pobierz PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDYCJI FORMY (tylko admin) */}
      {isAdmin && isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div className="w-full max-w-7xl max-h-[85vh] rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-5 text-white flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-cyan-400">Edycja danych formy</h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                disabled={savingMould}
              >
                ✕
              </button>
            </div>

            {mouldEditError && <div className="mb-3 text-red-400 text-sm">{mouldEditError}</div>}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LEWA: 2/3 */}
              <div className="md:col-span-2">
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-full text-sm">
                    <tbody>
                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 w-1/2 font-semibold">Numer formy</td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full rounded-lg p-2 bg-white/5 border border-white/10"
                            value={mouldDraft.mould_number}
                            onChange={(e) => setDraftField("mould_number", e.target.value)}
                          />
                        </td>
                      </tr>

                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 w-1/2 font-semibold">Firma</td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full rounded-lg p-2 bg-white/5 border border-white/10"
                            value={mouldDraft.company}
                            onChange={(e) => setDraftField("company", e.target.value)}
                          />
                        </td>
                      </tr>

                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold">Waga formy</td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full rounded-lg p-2 bg-white/5 border border-white/10"
                            value={mouldDraft.tool_weight}
                            onChange={(e) => setDraftField("tool_weight", e.target.value)}
                          />
                        </td>
                      </tr>

                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold">Produkt</td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full rounded-lg p-2 bg-white/5 border border-white/10"
                            value={mouldDraft.product}
                            onChange={(e) => setDraftField("product", e.target.value)}
                          />
                        </td>
                      </tr>

                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold">Całkowita ilość cykli</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            className="w-full rounded-lg p-2 bg-white/5 border border-white/10"
                            value={mouldDraft.total_cycles}
                            onChange={(e) => setDraftField("total_cycles", e.target.value)}
                          />
                          <div className="text-xs opacity-70 mt-1">
                            Jeśli zostawisz puste, nie zmieni się.
                          </div>
                        </td>
                      </tr>

                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold">Oddana do produkcji</td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            className="w-full rounded-lg p-2 bg-white/5 border border-white/10"
                            value={mouldDraft.released}
                            onChange={(e) => setDraftField("released", e.target.value)}
                          />
                          <div className="text-xs opacity-70 mt-1">
                            Wyczyść aby ustawić pustą datę.
                          </div>
                        </td>
                      </tr>

                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold">Resurs</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            className="w-full rounded-lg p-2 bg-white/5 border border-white/10"
                            value={mouldDraft.to_maint_cycles}
                            onChange={(e) => setDraftField("to_maint_cycles", e.target.value)}
                          />
                          <div className="text-xs opacity-70 mt-1">
                            Jeśli zostawisz puste, nie zmieni się.
                          </div>
                        </td>
                      </tr>

                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold">Liczba gniazd</td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full rounded-lg p-2 bg-white/5 border border-white/10"
                            value={mouldDraft.num_of_cavities}
                            onChange={(e) => setDraftField("num_of_cavities", e.target.value)}
                          />
                        </td>
                      </tr>

                      <tr className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold">Ilość cykli od przeglądu</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            className="w-full rounded-lg p-2 bg-white/5 border border-white/10"
                            value={mouldDraft.from_maint_cycles}
                            onChange={(e) => setDraftField("from_maint_cycles", e.target.value)}
                          />
                          <div className="text-xs opacity-70 mt-1">
                            Jeśli zostawisz puste, nie zmieni się.
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PRAWA: 1/3 zdjęcie */}
              <div className="md:col-span-1">
                <div className="rounded-xl border border-white/10 p-4 bg-slate-800">
                  <div className="font-semibold mb-3">Zdjęcie produktu</div>

                  <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                    <img
                      src={productPhotoPreview || serverPreviewFallback}
                      alt="Podgląd zdjęcia produktu"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="mt-3">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setProductPhotoFile(file);

                          if (productPhotoPreview?.startsWith("blob:")) {
                            URL.revokeObjectURL(productPhotoPreview);
                          }

                          if (file) {
                            setProductPhotoPreview(URL.createObjectURL(file));
                          } else {
                            setProductPhotoPreview(serverPreviewFallback);
                          }
                        }}
                      />
                    </div>

                    <div className="text-xs opacity-70 mt-2">
                      Wybierz nowe zdjęcie, aby podmienić. Zapisze się po kliknięciu „Zapisz”.
                    </div>

                    {productPhotoFile && (
                      <button
                        type="button"
                        className="mt-3 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                        onClick={() => {
                          setProductPhotoFile(null);
                          if (productPhotoPreview?.startsWith("blob:")) {
                            URL.revokeObjectURL(productPhotoPreview);
                          }
                          setProductPhotoPreview(serverPreviewFallback);
                        }}
                      >
                        Cofnij wybór
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 p-4 bg-slate-800 mt-4">
                  <div className="font-semibold mb-3">Zdjęcie formy</div>

                  <div className="w-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/20 flex items-center justify-center">
                    <img
                      src={mouldPhotoPreview || serverMouldPreviewFallback}
                      alt="Podgląd zdjęcia formy"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="mt-3">
                    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-white file:hover:bg-white/30"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setMouldPhotoFile(file);

                          if (mouldPhotoPreview?.startsWith("blob:")) {
                            URL.revokeObjectURL(mouldPhotoPreview);
                          }

                          if (file) {
                            setMouldPhotoPreview(URL.createObjectURL(file));
                          } else {
                            setMouldPhotoPreview(serverMouldPreviewFallback);
                          }
                        }}
                      />
                    </div>

                    <div className="text-xs opacity-70 mt-2">
                      Wybierz nowe zdjęcie, aby podmienić. Zapisze się po kliknięciu -Zapisz-.
                    </div>

                    {mouldPhotoFile && (
                      <button
                        type="button"
                        className="mt-3 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                        onClick={() => {
                          setMouldPhotoFile(null);
                          if (mouldPhotoPreview?.startsWith("blob:")) {
                            URL.revokeObjectURL(mouldPhotoPreview);
                          }
                          setMouldPhotoPreview(serverMouldPreviewFallback);
                        }}
                      >
                        Cofnij wyb??r
                      </button>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingMould}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={saveMouldFields}
                disabled={savingMould}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-semibold"
              >
                {savingMould ? "Zapisuję…" : "Zapisz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
