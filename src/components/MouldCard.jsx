import React, { useMemo } from "react";
import SafeImg from "./SafeImg.jsx";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";

export default function MouldCard({ mould }) {
  const { id, mould_number, product, product_photo } = mould || {};
  const navigate = useNavigate();

  const handleOpen = (m) => {
    navigate(`/moulds/${m.mould_number}`, { state: { mould: m } });
  };

  const imageSrc = useMemo(() => {
    const file = product_photo ?? "";

    if (!file) return "/media/default.png";
    if (file.startsWith("http://") || file.startsWith("https://")) return file;

    if (file.startsWith("/media/")) {
      try {
        const apiUrl = new URL(API_BASE);
        return `${apiUrl.origin}${file}`;
      } catch {
        return file;
      }
    }

    return `${API_BASE}/${file.replace(/^\//, "")}`;
  }, [product_photo]);

  const percent = useMemo(() => {
    const from = Number(mould?.from_maint_cycles ?? 0);
    const to = Number(mould?.to_maint_cycles ?? 0);
    if (!to || to <= 0) return 0;
    return Math.round((from / to) * 100);
  }, [mould?.from_maint_cycles, mould?.to_maint_cycles]);

  const percentBadgeClass =
    percent > 100
      ? "bg-gradient-to-b from-red-500 to-rose-500"
      : percent > 80
      ? "bg-gradient-to-b from-yellow-600 to-amber-500"
      : "bg-gradient-to-b from-blue-500 to-cyan-500";

  // ✅ czy są otwarte TPM (backend powinien zwrócić has_open_tpm)
  const hasOpenTpm = Boolean(mould?.has_open_tpm);

  return (
    <div className="section-center featured-center">
      <div
        key={mould_number}
        className="relative bg-slate-800/50 backdrop-blur-sm border rounded-xl sm:rounded-2xl p-6 sm:p-8 hover:scale-105 transition-all duration-300 overflow-visible group flex flex-col h-full border-blue-500 shadow-2xl shadow-blue-500/20"
      >
        {/* Firma */}
        <div className="absolute -top-2 sm:-top-3 left-1/4 transform -translate-x-1/2 z-10">
          <div className="flex items-center space-x-1 px-4 py-1 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full text-sm font-semibold shadow-lg">
            <span>{mould?.company ?? "-"}</span>
          </div>
        </div>

        {/* Procent */}
        <div className="absolute -top-2 sm:-top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div
            className={`flex items-center space-x-1 px-4 py-1 rounded-full text-sm font-semibold shadow-lg ${percentBadgeClass}`}
          >
            <span>{percent}%</span>
          </div>
        </div>

        {/* ✅ TPM badge (tylko gdy są otwarte) */}
        {hasOpenTpm && (
          <div className="absolute -top-2 sm:-top-3 left-3/4 transform -translate-x-1/2 z-10">
            <div className="flex items-center space-x-1 px-4 py-1 rounded-full text-sm font-semibold shadow-lg bg-gradient-to-b from-red-500 to-orange-500">
              <span>TPM</span>
            </div>
          </div>
        )}

        {/* Obrazek */}
        <div className="flex max-w-sm mx-auto items-baseline justify-center">
          <SafeImg
            src={imageSrc}
            alt={product || mould_number || `mould-${id}`}
            className="rounded-3xl"
          />
        </div>

        <div>
          <div className="text-center">
            <h3 className="text-3xl sm:text-2xl lg:text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent pt-3">
              {mould_number}
            </h3>
            <p className="text-xl sm:text-xl lg:text-lg font-bold mb-2">{product}</p>

            <section className="pb-4">
              <div className="flex items-baseline justify-center">
                <div className="w-full grid grid-cols-2 gap-4">
                  {/* <div className="pt-4 pb-4">Gniazd: {mould?.num_of_cavities ?? "-"}</div>
                  <div className="pt-4 pb-4">Waga formy: {mould?.tool_weight ?? "-"}</div> */}
                  {/* <div>Status: {mould?.status ?? "-"}</div>
                  <div>Pobyt: {mould?.place ?? "-"}</div> */}
                </div>
              </div>
            </section>

            <button
              onClick={() => handleOpen(mould)}
              className="w-full py-3 rounded-lg font-semibold bg-gradient-to-b from-blue-500 to-cyan-500 mt-auto hover:scale-105"
            >
              Szczegóły
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
