import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hh = Math.floor(totalSec / 3600).toString().padStart(2, "0");
  const mm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const ss = (totalSec % 60).toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pl-PL", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function MES_ChangeoverPanel() {
  const { workstationId, changeoverId } = useParams();
  const navigate = useNavigate();

  const [workstation, setWorkstation] = useState(null);
  const [changeover, setChangeover] = useState(null);
  const [fromMould, setFromMould] = useState(null);
  const [toMould, setToMould] = useState(null);
  const [loading, setLoading] = useState(true);

  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch data
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/service/workstations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/changeovers/${changeoverId}`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/moulds`, { headers }).then((r) => r.json()),
    ])
      .then(([wsRaw, ch, mouldsRaw]) => {
        const wsList = normalizeList(wsRaw);
        const mouldsList = normalizeList(mouldsRaw);
        setWorkstation(wsList.find((w) => String(w.id) === workstationId) ?? null);
        setChangeover(ch);
        setFromMould(mouldsList.find((m) => m.id === ch.from_mould_id) ?? null);
        setToMould(mouldsList.find((m) => m.id === ch.to_mould_id) ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workstationId, changeoverId]);

  // Save changeover info to workstation on entry
  useEffect(() => {
    if (!workstation || !toMould) return;
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/service/workstations/${workstation.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        st: toMould.mould_number,
        aktualny_typ_zlecenia: "przezbrajanie",
        aktualne_przezbrojenie_id: parseInt(changeoverId, 10),
      }),
    }).catch(() => {});
  }, [workstation, toMould, changeoverId]);

  // Timer tick
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (startRef.current != null) {
        setElapsed(Date.now() - startRef.current);
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
        console.error("Failed to update workstation status:", err);
      }
    },
    [workstation],
  );

  const createServiceLog = useCallback(
    async (statusChangeover) => {
      const token = localStorage.getItem("access_token");
      const operator = localStorage.getItem("username") || null;
      const payload = {
        operator,
        created_at: (() => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; })(),
        status_service: null,
        mes_activ_service_id: workstation?.aktualne_zlecenie_serwisowe_id || null,
        mes_activ_changeover_id: parseInt(changeoverId, 10) || null,
        status_changeover: statusChangeover,
        mould_number: toMould?.mould_number || null,
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
    [workstation, changeoverId, toMould],
  );

  const handleStart = () => {
    if (!workstation) return;
    setStarted(true);
    startRef.current = Date.now();
    setElapsed(0);
    updateWorkstationStatus("Przezbrajanie");
    createServiceLog("Przezbrajanie");
  };

  const handlePause = () => {
    startRef.current = null;
    setStarted(false);
    if (!workstation) { navigate(`/mes/service/workstation/${workstationId}`); return; }
    updateWorkstationStatus("Przerwane przezbrajanie");
    createServiceLog("Przerwane przezbrajanie");
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/service/workstations/${workstation.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ st: null, aktualny_typ_zlecenia: null, aktualne_przezbrojenie_id: null, status_changeovers: null }),
    }).finally(() => {
      navigate(`/mes/service/workstation/${workstationId}`);
    });
  };

  const handleFinish = async () => {
    startRef.current = null;
    setStarted(false);
    if (!workstation) { navigate(`/mes/service/workstation/${workstationId}`); return; }
    createServiceLog("Koniec przezbrojenia");
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API_BASE}/changeovers/${changeoverId}/complete`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Nie udało się oznaczyć przezbrojenia jako wykonane.");
      }
    } catch (err) {
      console.error(err);
    }
    // Clear workstation
    try {
      await fetch(`${API_BASE}/service/workstations/${workstation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ st: null, aktualny_typ_zlecenia: null, aktualne_przezbrojenie_id: null, status_changeovers: null }),
      });
    } catch { /* ignore */ }
    navigate(`/mes/service/workstation/${workstationId}`);
  };

  const infoRowsLeft = [
    { label: "Stanowisko", value: workstation?.nazwa_stanowiska || "—" },
    { label: "Z formy", value: fromMould ? `${fromMould.mould_number} — ${fromMould.product || ""}` : "—" },
    { label: "Na formę", value: toMould ? `${toMould.mould_number} — ${toMould.product || ""}` : "—" },
  ];

  const infoRowsRight = [
    { label: "Dostępne od", value: formatDate(changeover?.available_date) },
    { label: "Potrzebne na", value: formatDate(changeover?.needed_date) },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] p-6 pt-14">
      <MES_UserBar />
      <button
        onClick={() => navigate(`/mes/service/workstation/${workstationId}`)}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4 self-start"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót
      </button>
      <h1 className="text-2xl font-bold mb-6 text-center">Panel przezbrajania</h1>

      {loading ? (
        <p className="text-slate-400 text-center">Ładowanie…</p>
      ) : !changeover ? (
        <p className="text-slate-400 text-center">Nie znaleziono przezbrojenia.</p>
      ) : (
        <>
          {/* Info fields — two columns */}
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3 mb-8">
            <div className="flex flex-col gap-3">
              {infoRowsLeft.map((r) => (
                <div key={r.label} className="grid grid-cols-[140px_1fr] rounded-xl overflow-hidden border border-white/10">
                  <div className="bg-white/10 px-4 py-2.5 flex items-center">
                    <span className="text-slate-300 font-medium whitespace-nowrap text-sm">{r.label}:</span>
                  </div>
                  <div className="bg-white/5 px-4 py-2.5 flex items-center">
                    <span className="font-semibold">{r.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {infoRowsRight.map((r) => (
                <div key={r.label} className="grid grid-cols-[140px_1fr] rounded-xl overflow-hidden border border-white/10">
                  <div className="bg-white/10 px-4 py-2.5 flex items-center">
                    <span className="text-slate-300 font-medium whitespace-nowrap text-sm">{r.label}:</span>
                  </div>
                  <div className="bg-white/5 px-4 py-2.5 flex items-center">
                    <span className="font-semibold">{r.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="max-w-md mx-auto w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center mb-8">
            <h3 className="text-lg font-bold mb-3">Czas przezbrajania:</h3>
            <span className="text-4xl font-mono font-bold tracking-wider text-yellow-400">
              {formatTime(elapsed)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="max-w-2xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={handleStart}
              disabled={started}
              className={`rounded-xl border border-green-500 bg-green-600/20 px-6 py-4 text-lg font-semibold
                         text-green-400 transition
                ${started ? "ring-2 ring-offset-2 ring-green-400 ring-offset-slate-900 cursor-default" : "hover:bg-green-600/40 cursor-pointer"}`}
            >
              Start
            </button>

            <button
              onClick={handlePause}
              className="rounded-xl border border-orange-500 bg-orange-600/20 px-6 py-4 text-lg font-semibold
                         text-orange-400 hover:bg-orange-600/40 transition cursor-pointer"
            >
              Przerwij przezbrojenie
            </button>

            <button
              onClick={handleFinish}
              className="rounded-xl border border-blue-500 bg-blue-600/20 px-6 py-4 text-lg font-semibold
                         text-blue-400 hover:bg-blue-600/40 transition cursor-pointer"
            >
              Koniec przezb.
            </button>
          </div>
        </>
      )}
    </div>
  );
}
