// MouldDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config/api.js";

import MouldDetails_BasicInfo from "./subcomponents/MouldDetails_BasicInfo.jsx";
import MouldDetails_Notes from "./subcomponents/MouldDetails_Notes.jsx";
import MouldDetails_Tpm from "./subcomponents/MouldDetails_Tpm.jsx";
import MouldsDetails_Book from "./subcomponents/MouldsDetails_Book.jsx";

const isLoggedIn = () => Boolean(localStorage.getItem("access_token"));
const authHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// JWT role -> admin?
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

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

// budowanie src dla zdjęć (ścieżka /media/... albo pełny URL)
const buildMediaSrc = (maybePath) => {
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

export default function MouldDetails() {
  const { mould_number } = useParams(); // /moulds/:mould_number
  const location = useLocation();
  const navigate = useNavigate();

  const mouldFromNav = location.state?.mould;

  // lokalny stan formy
  const [mouldData, setMouldData] = useState(mouldFromNav ?? null);

  // UI auth
  const [logged, setLogged] = useState(isLoggedIn());
  const [isAdmin, setIsAdmin] = useState(isAdminFromToken());

  useEffect(() => {
    const syncAuth = () => {
      setLogged(isLoggedIn());
      setIsAdmin(isAdminFromToken());
    };

    // odśwież przy wejściu
    syncAuth();

    // storage event (inne zakładki/okna)
    window.addEventListener("storage", syncAuth);

    // jeśli w tej samej karcie ustawiasz tokeny bez reloadu,
    // to w miejscach logowania wywołaj: window.dispatchEvent(new Event("storage"))
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const imageSrc = useMemo(
    () => buildMediaSrc(mouldData?.product_photo) || "/media/default.jpeg",
    [mouldData?.product_photo]
  );

  const handleMouldUpdated = (updated) => {
    setMouldData(updated ?? null);
    if (updated) {
      navigate(location.pathname, { replace: true, state: { mould: updated } });
    }
  };

  // Fetch świeżej formy po wejściu/refresh (GET /moulds/?search=...)
  useEffect(() => {
    const num = mould_number || mouldFromNav?.mould_number;
    if (!num) return;

    const controller = new AbortController();

    const fetchMould = async () => {
      try {
        const res = await axios.get(`${API_BASE}/moulds/`, {
          params: { search: num, limit: 1000 },
          signal: controller.signal,
        });

        const list = normalizeList(res.data);
        const found =
          list.find(
            (x) =>
              String(x?.mould_number ?? "").toUpperCase() === String(num).toUpperCase()
          ) ?? null;

        if (found) {
          handleMouldUpdated(found);
        }
      } catch (err) {
        if (
          axios.isCancel?.(err) ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        )
          return;
        console.error(err);
      }
    };

    fetchMould();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mould_number]);

  if (!mouldData) return <p>Brak danych formy.</p>;

  return (
    <>
      <div className="p-10">
        <div className="p-2">
          <Link
            to="/"
            className="px-4 py-2 bg-blue-500 rounded-lg text-white font-semibold hover:scale-105"
          >
            ← Powrót
          </Link>
        </div>

        <section>
          <div className="p-10 text-white text-center">
            <h1 className="text-4xl text-cyan-400 font-bold mb-4">
              {mouldData.mould_number}
            </h1>
            <p className="text-xl">{mouldData.product}</p>
          </div>

          {/* 2/3 tekst + 1/3 zdjęcie */}
          <div className="flex items-baseline justify-center">
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
              {/* 2/3 */}
              <div className="lg:col-span-2">
                <MouldDetails_BasicInfo
                  API_BASE={API_BASE}
                  mouldData={mouldData}
                  logged={logged}
                  isAdmin={isAdmin}
                  authHeaders={authHeaders}
                  imageSrc={imageSrc}
                  onMouldUpdated={handleMouldUpdated}
                />

                <MouldDetails_Notes
                  API_BASE={API_BASE}
                  mouldData={mouldData}
                  logged={logged}
                  isAdmin={isAdmin}
                  authHeaders={authHeaders}
                  onMouldUpdated={handleMouldUpdated}
                />

                <MouldDetails_Tpm
                 API_BASE={API_BASE}
                 logged={logged}
                 isAdmin={isAdmin}
                 authHeaders={authHeaders}
                 mouldId={mouldData?.id}
                 mouldNumber={mouldData?.mould_number}
                 />
              </div>

              {/* 1/3 */}
              <div className="lg:col-span-1">
                <img
                  src={imageSrc}
                  alt="Zdjęcie produktu"
                  className="mt-4 rounded-2xl w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* BOOK */}
        <MouldsDetails_Book
          API_BASE={API_BASE}
          mouldId={mouldData?.id}
          mouldNumber={mouldData?.mould_number}
          logged={logged}
          isAdmin={isAdmin}
          authHeaders={authHeaders}
        />
      </div>
    </>
  );
}
