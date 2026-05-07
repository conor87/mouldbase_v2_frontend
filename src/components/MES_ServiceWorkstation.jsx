import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft, Wrench, Settings, LogOut } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";

export default function MES_ServiceWorkstation() {
  const { workstationId } = useParams();
  const navigate = useNavigate();

  const [workstation, setWorkstation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myOtherWorkstation, setMyOtherWorkstation] = useState(null);
  const [mode, setMode] = useState(null); // null | "serwisowanie" | "przezbrajanie"
  const [moulds, setMoulds] = useState([]);
  const [mouldsLoading, setMouldsLoading] = useState(false);
  const [mouldSearch, setMouldSearch] = useState("");
  const [changeovers, setChangeovers] = useState([]);
  const [changeoversLoading, setChangeoversLoading] = useState(false);
  const [changeoverSearch, setChangeoverSearch] = useState("");

  const getUserId = useCallback(() => {
    let userId = localStorage.getItem("user_id");
    if (!userId) {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const decoded = JSON.parse(atob(token.split(".")[1]));
          userId = decoded.id ?? decoded.user_id ?? decoded.sub ?? null;
        } catch { /* ignore */ }
      }
    }
    return userId ? parseInt(userId, 10) : null;
  }, []);

  const fetchWorkstation = useCallback(() => {
    const token = localStorage.getItem("access_token");
    const userId = getUserId();
    fetch(`${API_BASE}/service/workstations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results ?? data.data ?? [];
        const ws = list.find((w) => String(w.id) === workstationId);
        setWorkstation(ws ?? null);
        const other = list.find(
          (w) => w.user_id === userId && String(w.id) !== workstationId
        );
        setMyOtherWorkstation(other ?? null);
      })
      .catch(() => setWorkstation(null))
      .finally(() => setLoading(false));
  }, [workstationId, getUserId]);

  useEffect(() => {
    fetchWorkstation();
  }, [fetchWorkstation]);

  const handleSelectPrzezbrajanie = () => {
    setMode("przezbrajanie");
    setChangeoversLoading(true);
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/changeovers/`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/moulds`, { headers }).then((r) => r.json()),
    ])
      .then(([chRaw, mouldsRaw]) => {
        const chList = Array.isArray(chRaw) ? chRaw : chRaw.results ?? chRaw.data ?? [];
        const mList = Array.isArray(mouldsRaw) ? mouldsRaw : mouldsRaw.results ?? mouldsRaw.data ?? [];
        setChangeovers(chList.filter((c) => !c.czy_wykonano));
        setMoulds(mList);
      })
      .catch(() => setChangeovers([]))
      .finally(() => setChangeoversLoading(false));
  };

  const handleSelectSerwisowanie = () => {
    setMode("serwisowanie");
    setMouldsLoading(true);
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/moulds`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results ?? data.data ?? [];
        setMoulds(list);
      })
      .catch(() => setMoulds([]))
      .finally(() => setMouldsLoading(false));
  };

  const handleTakeover = () => {
    if (workstation?.user_id != null && Number(workstation.user_id) !== getUserId()) {
      const confirmed = window.confirm(
        "To stanowisko jest przypisane do innego pracownika. Przejęcie stanowiska odblokuje je dla Ciebie i odbierze dostęp poprzedniemu operatorowi. Czy na pewno przejąć stanowisko?"
      );
      if (!confirmed) return;
    }

    const token = localStorage.getItem("access_token");
    const userId = getUserId();
    if (!userId) return;

    fetch(`${API_BASE}/service/workstations/${workstationId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Takeover failed");
        return r.json();
      })
      .then((updated) => {
        setWorkstation(updated);
        // Log takeover
        const operator = localStorage.getItem("username") || null;
        const now = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; })();
        fetch(`${API_BASE}/service/logs`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            operator,
            created_at: now,
            status_service: "Przejęcie stanowiska",
            mes_activ_service_id: updated.aktualne_zlecenie_serwisowe_id || null,
            mes_activ_changeover_id: updated.aktualne_przezbrojenie_id || null,
            status_changeover: null,
          }),
        }).catch(() => {});
      })
      .catch(() => alert("Nie udało się przejąć stanowiska."));
  };

  const handleRelease = () => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/service/workstations/${workstationId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: null, status_changeovers: null, st: null }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Release failed");
        return r.json();
      })
      .then(() => navigate("/mes/service"))
      .catch(() => alert("Nie udało się zwolnić stanowiska."));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-6">
        <p className="text-slate-400">Ładowanie…</p>
      </div>
    );
  }

  if (!workstation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-6">
        <p className="text-slate-400">Nie znaleziono stanowiska.</p>
        <button
          onClick={() => navigate("/mes/service")}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mt-4"
        >
          <ChevronLeft className="w-4 h-4" /> Powrót
        </button>
      </div>
    );
  }

  const currentUserId = getUserId();
  const isUnassigned = workstation.user_id === null || workstation.user_id === undefined;
  const isOwnedByMe = workstation.user_id === currentUserId;
  const isOwnedByOther = !isUnassigned && !isOwnedByMe;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-6 pt-14">
      <MES_UserBar />
      <button
        onClick={() => navigate("/mes/service")}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót
      </button>

      <h1 className="text-2xl font-bold mb-6">{workstation.nazwa_stanowiska}</h1>

      {isUnassigned && !myOtherWorkstation && (
        <button
          onClick={handleTakeover}
          className="rounded-2xl border border-blue-500 bg-blue-600/20 px-8 py-4 text-lg font-semibold
                     text-blue-400 hover:bg-blue-600/40 transition cursor-pointer"
        >
          Przejmij stanowisko
        </button>
      )}

      {isUnassigned && myOtherWorkstation && (
        <p className="text-amber-400 text-lg text-center">
          Masz już przejęte stanowisko:{" "}
          <span className="font-semibold">{myOtherWorkstation.nazwa_stanowiska}</span>
        </p>
      )}

      {isOwnedByMe && !mode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
          <button
            onClick={handleSelectPrzezbrajanie}
            className="rounded-2xl border border-yellow-500 bg-yellow-600/20 p-8 text-center
                       hover:bg-yellow-600/40 transition cursor-pointer flex flex-col items-center gap-3"
          >
            <Settings className="w-10 h-10 text-yellow-400" />
            <span className="text-lg font-semibold text-yellow-400">Wybierz przezbrajanie</span>
          </button>

          <button
            onClick={handleSelectSerwisowanie}
            className="rounded-2xl border border-emerald-500 bg-emerald-600/20 p-8 text-center
                       hover:bg-emerald-600/40 transition cursor-pointer flex flex-col items-center gap-3"
          >
            <Wrench className="w-10 h-10 text-emerald-400" />
            <span className="text-lg font-semibold text-emerald-400">Wybierz serwisowanie</span>
          </button>

          <button
            onClick={handleRelease}
            className="rounded-2xl border border-red-500 bg-red-600/20 p-8 text-center
                       hover:bg-red-600/40 transition cursor-pointer flex flex-col items-center gap-3 sm:col-span-2"
          >
            <LogOut className="w-10 h-10 text-red-400" />
            <span className="text-lg font-semibold text-red-400">Zwolnij stanowisko</span>
          </button>
        </div>
      )}

      {isOwnedByMe && mode === "przezbrajanie" && (
        <div className="flex flex-col items-center w-full max-w-3xl mt-2">
          <input
            type="text"
            value={changeoverSearch}
            onChange={(e) => setChangeoverSearch(e.target.value)}
            placeholder="Szukaj przezbrojenia…"
            className="w-full mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3
                       text-white placeholder-slate-500 outline-none focus:border-yellow-500 transition"
          />

          {(() => {
            const mouldMap = Object.fromEntries(moulds.map((m) => [String(m.id), m]));
            const term = changeoverSearch.toLowerCase();
            const filtered = changeovers.filter((c) => {
              const from = mouldMap[String(c.from_mould_id)];
              const to = mouldMap[String(c.to_mould_id)];
              const fromLabel = from ? `${from.mould_number} ${from.product ?? ""}` : "";
              const toLabel = to ? `${to.mould_number} ${to.product ?? ""}` : "";
              return fromLabel.toLowerCase().includes(term) || toLabel.toLowerCase().includes(term);
            });
            return changeoversLoading ? (
              <p className="text-slate-400">Ładowanie przezbrojeń…</p>
            ) : filtered.length === 0 ? (
              <p className="text-slate-400">Brak przezbrojeń.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-sm">
                    <th className="py-3 px-4">Z formy</th>
                    <th className="py-3 px-4">Na formę</th>
                    <th className="py-3 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const from = mouldMap[String(c.from_mould_id)];
                    const to = mouldMap[String(c.to_mould_id)];
                    return (
                      <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4">
                          <span className="font-mono">{from?.mould_number ?? "—"}</span>
                          {from?.product && <span className="text-slate-400 text-sm ml-2">{from.product}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono">{to?.mould_number ?? "—"}</span>
                          {to?.product && <span className="text-slate-400 text-sm ml-2">{to.product}</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => navigate(`/mes/service/workstation/${workstationId}/changeover/${c.id}`)}
                            className="rounded-lg border border-yellow-500 bg-yellow-600/20 px-4 py-1.5
                                       text-sm font-semibold text-yellow-400 hover:bg-yellow-600/40 transition"
                          >
                            Wykonaj
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {isOwnedByMe && mode === "serwisowanie" && (
        <div className="flex flex-col items-center w-full max-w-3xl mt-2">
          <input
            type="text"
            value={mouldSearch}
            onChange={(e) => setMouldSearch(e.target.value)}
            placeholder="Szukaj formy…"
            className="w-full mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3
                       text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
          />

          {(() => {
            const term = mouldSearch.toLowerCase();
            const filtered = moulds.filter(
              (m) =>
                (m.mould_number ?? "").toLowerCase().includes(term) ||
                (m.product ?? "").toLowerCase().includes(term)
            );
            return mouldsLoading ? (
              <p className="text-slate-400">Ładowanie form…</p>
            ) : filtered.length === 0 ? (
              <p className="text-slate-400">Brak form.</p>
            ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-sm">
                  <th className="py-3 px-4">Nr formy</th>
                  <th className="py-3 px-4">Nazwa wyrobu</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id ?? m.mould_number} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 font-mono">{m.mould_number}</td>
                    <td className="py-3 px-4">{m.product}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/mes/service/workstation/${workstationId}/panel/${m.mould_number}`)}
                        className="rounded-lg border border-emerald-500 bg-emerald-600/20 px-4 py-1.5
                                         text-sm font-semibold text-emerald-400 hover:bg-emerald-600/40 transition">
                        Wykonaj
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            );
          })()}
        </div>
      )}

      {isOwnedByOther && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-slate-400 text-lg">
            To stanowisko jest zajęte przez innego użytkownika.
          </p>
          {!myOtherWorkstation ? (
            <button
              onClick={handleTakeover}
              className="rounded-2xl border border-amber-500 bg-amber-600/20 px-8 py-4 text-lg font-semibold
                         text-amber-300 hover:bg-amber-600/40 transition cursor-pointer"
            >
              Przejmij od poprzedniego pracownika
            </button>
          ) : (
            <p className="text-amber-400 text-center">
              Masz już przejęte stanowisko:{" "}
              <span className="font-semibold">{myOtherWorkstation.nazwa_stanowiska}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
