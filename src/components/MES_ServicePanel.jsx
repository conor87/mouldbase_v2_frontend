import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft } from "lucide-react";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

// Hardcoded service statuses
const SERVICE_STATUSES = [
  { id: 2, label: "Modyfikacja",            color: "blue",    hasTimer: true },
  { id: 3, label: "Przegląd / Remont",      color: "emerald",  hasTimer: true },
  { id: 4, label: "Przygot. do z kooper.",  color: "emerald",  hasTimer: true },
  { id: 5, label: "Fakturowanie",           color: "cyan",  hasTimer: true },
  { id: 6, label: "Naprawa TPM",            color: "yellow",    hasTimer: true },
  { id: 7, label: "Spawanie",               color: "slate", hasTimer: true },
  { id: 8, label: "Koniec działań",         color: "slate",   hasTimer: false },
];

const AWARIA_STATUSES = [
  { id: 101, label: "Układ grzania",              color: "red", hasTimer: true },
  { id: 102, label: "Pow. formujące",             color: "red", hasTimer: true },
  { id: 103, label: "Obce ciało w ukł. dolot.",   color: "red", hasTimer: true },
  { id: 104, label: "Układ chłodzenia",           color: "red", hasTimer: true },
  { id: 105, label: "Układ powietrzny",           color: "red", hasTimer: true },
  { id: 106, label: "Układ hydrauliczny",         color: "red", hasTimer: true },
  { id: 107, label: "Układ mechaniczny",          color: "red", hasTimer: true },
  { id: 108, label: "Pow. zamykania i odpowietrz.", color: "red", hasTimer: true },
];

// Build Tailwind classes from a color name
// Safelist hint for Tailwind (ensures dynamic classes are generated):
// bg-green-600/50 hover:bg-green-500/70 border-green-600 bg-green-600/20 border-green-500 text-green-400 ring-green-400
// bg-red-600/50 hover:bg-red-500/70 border-red-600 bg-red-600/20 border-red-500 text-red-400 ring-red-400
// bg-yellow-600/50 hover:bg-yellow-500/70 border-yellow-600 bg-yellow-600/20 border-yellow-500 text-yellow-400 ring-yellow-400
// bg-slate-600/50 hover:bg-slate-500/70 border-slate-600 bg-slate-600/20 border-slate-500 text-slate-400 ring-slate-400
// bg-purple-600/50 hover:bg-purple-500/70 border-purple-600 bg-purple-600/20 border-purple-500 text-purple-400 ring-purple-400
// bg-blue-600/50 hover:bg-blue-500/70 border-blue-600 bg-blue-600/20 border-blue-500 text-blue-400 ring-blue-400
// bg-orange-600/50 hover:bg-orange-500/70 border-orange-600 bg-orange-600/20 border-orange-500 text-orange-400 ring-orange-400
// bg-cyan-600/50 hover:bg-cyan-500/70 border-cyan-600 bg-cyan-600/20 border-cyan-500 text-cyan-400 ring-cyan-400
// bg-emerald-600/50 hover:bg-emerald-500/70 border-emerald-600 bg-emerald-600/20 border-emerald-500 text-emerald-400 ring-emerald-400
function buildColorClasses(colorName) {
  const c = colorName || "blue";
  return {
    btnClass: `bg-${c}-600/50 hover:bg-${c}-500/70 border border-${c}-600`,
    statusBg: `bg-${c}-600/20 border-${c}-500`,
    textColor: `text-${c}-400`,
    ringClass: `ring-${c}-400 ring-offset-slate-900`,
  };
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hh = Math.floor(totalSec / 3600).toString().padStart(2, "0");
  const mm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const ss = (totalSec % 60).toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function MES_ServicePanel() {
  const { workstationId, mouldNumber } = useParams();
  const navigate = useNavigate();

  const [workstation, setWorkstation] = useState(null);
  const [mould, setMould] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeStatusId, setActiveStatusId] = useState(null);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [statusElapsed, setStatusElapsed] = useState(0);


  const totalStartRef = useRef(null);
  const statusStartRef = useRef(null);
  const accumulatedRef = useRef(0);
  const timerRef = useRef(null);

  const statusButtons = useMemo(
    () =>
      SERVICE_STATUSES.map((s) => {
        const { btnClass, statusBg, textColor, ringClass } = buildColorClasses(s.color);
        return { ...s, btnClass, statusBg, textColor, ringClass };
      }),
    [],
  );

  const awariaButtons = useMemo(
    () =>
      AWARIA_STATUSES.map((s) => {
        const { btnClass, statusBg, textColor, ringClass } = buildColorClasses(s.color);
        return { ...s, btnClass, statusBg, textColor, ringClass };
      }),
    [],
  );

  const allButtonsById = useMemo(
    () => Object.fromEntries([...statusButtons, ...awariaButtons].map((b) => [b.id, b])),
    [statusButtons, awariaButtons],
  );

  // Fetch workstation + mould
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/service/workstations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/moulds`, { headers }).then((r) => r.json()),
    ])
      .then(([wsRaw, mouldsRaw]) => {
        const wsList = normalizeList(wsRaw);
        const mouldsList = normalizeList(mouldsRaw);
        const ws = wsList.find((w) => String(w.id) === workstationId) ?? null;
        setWorkstation(ws);
        setMould(mouldsList.find((m) => m.mould_number === mouldNumber) ?? null);
        // Restore active status from workstation
        if (ws?.status_changeovers) {
          const match = [...SERVICE_STATUSES, ...AWARIA_STATUSES].find((s) => s.label === ws.status_changeovers);
          if (match) {
            setActiveStatusId(match.id);

          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workstationId, mouldNumber]);

  // Save current mould to workstation on entry
  useEffect(() => {
    if (!workstation || !mouldNumber) return;
    if (workstation.st === mouldNumber) return;
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/service/workstations/${workstation.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ st: mouldNumber }),
    }).catch(() => {});
  }, [workstation, mouldNumber]);

  // Timer tick
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      if (totalStartRef.current != null) {
        setTotalElapsed(accumulatedRef.current + (now - totalStartRef.current));
      }
      if (statusStartRef.current != null) {
        setStatusElapsed(now - statusStartRef.current);
      }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, []);

  const updateWorkstationStatus = useCallback(
    async (statusLabel) => {
      if (!workstation) return;
      const token = localStorage.getItem("access_token");
      try {
        await fetch(`${API_BASE}/service/workstations/${workstation.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status_changeovers: statusLabel }),
        });
      } catch (err) {
        console.error("Failed to update service workstation status:", err);
      }
    },
    [workstation],
  );

  const createServiceLog = useCallback(
    async (statusLabel) => {
      const token = localStorage.getItem("access_token");
      const operator = localStorage.getItem("username") || null;
      const payload = {
        operator,
        created_at: new Date().toISOString(),
        status_service: statusLabel,
        mes_activ_service_id: workstation?.aktualne_zlecenie_serwisowe_id || null,
        mes_activ_changeover_id: workstation?.aktualne_przezbrojenie_id || null,
        status_changeover: null,
      };
      try {
        await fetch(`${API_BASE}/service/logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Failed to create service log:", err);
      }
    },
    [workstation],
  );

  const handleStatusClick = useCallback(
    (btn) => {
      if (btn.hasTimer) {
        if (totalStartRef.current != null) {
          accumulatedRef.current += Date.now() - totalStartRef.current;
        }
        totalStartRef.current = Date.now();
        statusStartRef.current = Date.now();
        setStatusElapsed(0);
      } else {
        // "Koniec działań" — stop timers, clear mould, go back
        if (totalStartRef.current != null) {
          accumulatedRef.current += Date.now() - totalStartRef.current;
          setTotalElapsed(accumulatedRef.current);
        }
        totalStartRef.current = null;
        statusStartRef.current = null;
        setStatusElapsed(0);
        createServiceLog(btn.label);
        updateWorkstationStatus(btn.label).then(() => {
          // Clear current mould from workstation
          const token = localStorage.getItem("access_token");
          fetch(`${API_BASE}/service/workstations/${workstation.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ st: null }),
          }).finally(() => {
            navigate(`/mes/service/workstation/${workstationId}`);
          });
        });
        return;
      }
      setActiveStatusId(btn.id);
      updateWorkstationStatus(btn.label);
      createServiceLog(btn.label);
    },
    [updateWorkstationStatus, createServiceLog],
  );

  const activeBtn = activeStatusId ? allButtonsById[activeStatusId] : null;

  const infoRows = [
    { label: "Stanowisko", value: workstation?.nazwa_stanowiska || "—" },
    { label: "Nr formy", value: mould?.mould_number || "—" },
    { label: "Wyrób", value: mould?.product || "—" },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] p-6">
      <button
        onClick={() => navigate(`/mes/service/workstation/${workstationId}`)}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4 self-start"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót
      </button>
      <h1 className="text-2xl font-bold mb-6 text-center">Panel serwisowy</h1>

      {loading ? (
        <p className="text-slate-400 text-center">Ładowanie…</p>
      ) : !workstation ? (
        <p className="text-slate-400 text-center">Nie znaleziono stanowiska.</p>
      ) : (
        <>
          {/* ===== Two-column layout ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: info fields */}
            <div className="flex flex-col gap-3">
              {infoRows.map((r) => (
                <div key={r.label} className="grid grid-cols-[140px_1fr] rounded-xl overflow-hidden border border-white/10">
                  <div className="bg-white/10 px-4 py-2.5 flex items-center">
                    <span className="text-slate-300 font-medium whitespace-nowrap text-sm">
                      {r.label}:
                    </span>
                  </div>
                  <div className="bg-white/5 px-4 py-2.5 flex items-center">
                    <span className="font-semibold">{r.value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: status + buttons */}
            <div className="space-y-5">
              {/* Active status display */}
              <div className={`rounded-2xl border p-5 transition-colors ${
                activeBtn ? `${activeBtn.statusBg}` : "border-white/10 bg-white/5"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">Status:</span>
                  <span className={`text-lg font-semibold ${
                    activeBtn ? activeBtn.textColor : "text-slate-400"
                  }`}>
                    {activeBtn ? activeBtn.label : "Brak"}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Usunięcie awarii — dropdown */}
                <select
                  value={awariaButtons.some((b) => b.id === activeStatusId) ? activeStatusId : ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (!id) return;
                    const btn = awariaButtons.find((b) => b.id === id);
                    if (btn) handleStatusClick(btn);
                  }}
                  className={`rounded-xl border border-red-600 bg-red-600/50 px-4 py-3 text-sm font-medium transition cursor-pointer
                    [&>option]:bg-slate-800 [&>option]:text-red-400
                    ${awariaButtons.some((b) => b.id === activeStatusId)
                      ? "ring-2 ring-offset-2 ring-red-400 ring-offset-slate-900 text-white"
                      : "text-white hover:bg-red-500/70"}`}
                >
                  <option value="">Usunięcie awarii…</option>
                  {awariaButtons.map((btn) => (
                    <option key={btn.id} value={btn.id}>{btn.label}</option>
                  ))}
                </select>

                {/* Regular statuses */}
                {statusButtons.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => handleStatusClick(btn)}
                    disabled={activeStatusId === btn.id}
                    className={`${btn.btnClass} rounded-xl px-4 py-3 text-sm font-medium transition
                      ${activeStatusId === btn.id ? `ring-2 ring-offset-2 ${btn.ringClass} cursor-default` : ""}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ===== Timers ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <h3 className="text-lg font-bold mb-3">Czas całkowity:</h3>
              <span className="text-4xl font-mono font-bold tracking-wider text-emerald-400">
                {formatTime(totalElapsed)}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <h3 className="text-lg font-bold mb-3">Czas statusu:</h3>
              <span className="text-4xl font-mono font-bold tracking-wider text-sky-400">
                {formatTime(statusElapsed)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
