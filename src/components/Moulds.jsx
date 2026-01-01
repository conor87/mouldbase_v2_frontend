// Moulds.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Navbar from "./Navbar.jsx";
import MouldCard from "./MouldCard.jsx";
import { useNavigate } from "react-router-dom";

import AddMouldModal from "./subcomponents/AddMouldModal.jsx";       // <- dopasuj ścieżkę jeśli trzeba
import DeleteMouldModal from "./subcomponents/DeleteMouldModal.jsx"; // <- nowy plik

const API_BASE = "http://localhost:8000";

// ===== JWT helpers =====
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

export default function Moulds() {
  const navigate = useNavigate();

  // auth
  const token = localStorage.getItem("access_token");
  const logged = Boolean(token);
  const isAdmin = isAdminFromToken();
  const isSuperAdmin = isSuperAdminFromToken();
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  // UI + dane
  const pageSize = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [moulds, setMoulds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // modale
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchMoulds = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/moulds`);
      setMoulds(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać danych form.");
      setMoulds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoulds();
  }, []);

  const companies = useMemo(() => {
    return ["all", ...new Set((moulds || []).map((m) => m.company).filter(Boolean))];
  }, [moulds]);

  const calcPercent = (m) => {
    const from = Number(m?.from_maint_cycles ?? 0);
    const to = Number(m?.to_maint_cycles ?? 0);
    if (!to || to <= 0) return -1;
    return (from / to) * 100;
  };

  const filteredAndSorted = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = (moulds || []).filter((mould) => {
      const matchesSearch =
        !term ||
        mould.product?.toLowerCase().includes(term) ||
        mould.mould_number?.toLowerCase().includes(term);

      const matchesCompany = companyFilter === "all" || mould.company === companyFilter;
      return matchesSearch && matchesCompany;
    });

    return [...filtered].sort((a, b) => calcPercent(b) - calcPercent(a));
  }, [moulds, searchTerm, companyFilter]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const currentMoulds = filteredAndSorted.slice(startIndex, startIndex + pageSize);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCompanyChange = (value) => {
    setCompanyFilter(value);
    setCurrentPage(1);
  };

  const paginationItems = useMemo(() => {
    const delta = 3;
    const pagesSet = new Set([1, totalPages]);

    for (let p = safePage - delta; p <= safePage + delta; p++) {
      if (p >= 1 && p <= totalPages) pagesSet.add(p);
    }

    const pages = Array.from(pagesSet).sort((a, b) => a - b);

    const items = [];
    let prev = null;
    for (const p of pages) {
      if (prev !== null && p - prev > 1) items.push("...");
      items.push(p);
      prev = p;
    }
    return items;
  }, [safePage, totalPages]);

  return (
    <>
      <Navbar />

      {/* MODALE */}
      {logged && isAdmin && (
        <AddMouldModal
          open={isAddOpen}
          canEdit={isAdmin}
          API_BASE={API_BASE}
          authHeaders={authHeaders}
          onClose={() => setIsAddOpen(false)}
          onCreated={async () => {
            await fetchMoulds();
          }}
        />
      )}

      {logged && isSuperAdmin && (
        <DeleteMouldModal
          open={isDeleteOpen}
          API_BASE={API_BASE}
          authHeaders={authHeaders}
          onClose={() => setIsDeleteOpen(false)}
          onDeleted={async () => {
            await fetchMoulds();
          }}
        />
      )}

      <section id="pricing" className="py-16 sm:py-20 px-10 sm:px-6 lg:px-8 relative">
        <div className="max-w-full mx-auto lg:mx-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-5xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-b from-white to-gray-300 bg-clip-text text-transparent">
                Formy wtryskowe{" "}
              </span>
              <span className="bg-gradient-to-b from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                i rozdmuchowe
              </span>
            </h2>
            <p className="text-gray-400 text-base text-xl sm:text-lg max-w-2xl mx-auto">
              Dane firmy Lamela Sp. z o.o.
            </p>
          </div>

          {loading && <div className="text-center text-gray-400 py-10">Ładowanie danych form...</div>}
          {error && !loading && <div className="text-center text-red-400 py-10">{error}</div>}

          {!loading && !error && (
            <>
              <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* LEWA: wyszukiwarka + przyciski */}
                <div className="w-full sm:w-[520px] flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder="Szukaj po nazwie produktu lub numerze formy..."
                        className="w-full px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      />
                    </div>

                    {/* ✅ PRZYCISK PRZEZBROJEŃ przeniesiony obok wyszukiwarki */}
                    <button
                      onClick={() => navigate("/changeovers")}
                      className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-700 text-gray-300 hover:border-slate-500 bg-white/5 hover:bg-white/10"
                      title="Przejdź do listy przezbrojeń"
                    >
                      Przezbrojenia
                    </button>

                    {/* ✅ DODAJ tylko admin/superadmin */}
                    {logged && isAdmin && (
                      <button
                        onClick={() => setIsAddOpen(true)}
                        className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-700 text-gray-300 hover:border-slate-500 bg-white/5 hover:bg-white/10"
                        title="Dodaj nową formę"
                      >
                        Dodaj formę
                      </button>
                    )}

                    {/* ✅ USUŃ tylko superadmin */}
                    {logged && isSuperAdmin && (
                      <button
                        onClick={() => setIsDeleteOpen(true)}
                        className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-red-700 text-red-200 hover:border-red-500 bg-red-500/10 hover:bg-red-500/20"
                        title="Usuń formę (tylko superadmin)"
                      >
                        Usuń formę
                      </button>
                    )}
                  </div>

                  {!logged && (
                    <div className="text-xs opacity-70">
                      Zaloguj się, aby zobaczyć przyciski administracyjne.
                    </div>
                  )}
                </div>

                {/* PRAWA: filtry + licznik */}
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                    {companies.map((c) => (
                      <button
                        key={c}
                        onClick={() => handleCompanyChange(c)}
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition ${
                          companyFilter === c
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "border-slate-700 text-gray-300 hover:border-slate-500"
                        }`}
                      >
                        {c === "all" ? "Wszystkie" : c}
                      </button>
                    ))}
                  </div>

                  <div className="text-sm text-gray-400">
                    Widoczne:{" "}
                    <span className="font-semibold text-blue-400">{filteredAndSorted.length}</span>{" "}
                    form
                  </div>
                </div>
              </div>

              {currentMoulds.length === 0 ? (
                <div className="text-center text-gray-400 py-16">
                  Brak wyników dla:{" "}
                  <span className="font-semibold text-blue-400">{searchTerm || "(pusty filtr)"}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-6">
                  {currentMoulds.map((m, index) => (
                    <MouldCard key={m.id ?? m.mould_number ?? `mould-${index}`} mould={m} />
                  ))}
                </div>
              )}

              {filteredAndSorted.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => goToPage(safePage - 1)}
                    disabled={safePage === 1}
                    className="px-3 py-2 border border-slate-700 rounded-lg disabled:opacity-40 hover:border-slate-500"
                  >
                    ◀
                  </button>

                  {paginationItems.map((item, idx) =>
                    item === "..." ? (
                      <span key={`dots-${idx}`} className="px-3 py-2 text-gray-400 select-none">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item)}
                        className={`px-3 py-2 rounded-lg border ${
                          safePage === item
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "border-slate-700 hover:border-slate-500"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => goToPage(safePage + 1)}
                    disabled={safePage === totalPages}
                    className="px-3 py-2 border border-slate-700 rounded-lg disabled:opacity-40 hover:border-slate-500"
                  >
                    ▶
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
