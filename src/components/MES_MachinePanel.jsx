import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft } from "lucide-react";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

// No-timer statuses by status_no (koniec operacji, koniec zmiany, zmiana zlecenia)
const NO_TIMER_NOS = new Set([5, 6, 7]);

// Build Tailwind classes from a color name (e.g. "green", "red", "slate")
function buildColorClasses(colorName) {
  const c = colorName || "blue";
  return {
    btnClass: `bg-${c}-600/50 hover:bg-${c}-500/70 border border-${c}-600`,
    statusBg: `bg-${c}-600/20 border-${c}-500`,
    textColor: `text-${c}-400`,
    ringClass: `ring-${c}-400 ring-offset-slate-900`,
  };
}

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

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hh = Math.floor(totalSec / 3600).toString().padStart(2, "0");
  const mm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const ss = (totalSec % 60).toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function MES_MachinePanel() {
  const { machineId, operationId } = useParams();
  const navigate = useNavigate();

  const [operation, setOperation] = useState(null);
  const [task, setTask] = useState(null);
  const [order, setOrder] = useState(null);
  const [workstation, setWorkstation] = useState(null);
  const [machineStatuses, setMachineStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status & timers
  const [activeStatusId, setActiveStatusId] = useState(null);
  const [operationElapsed, setOperationElapsed] = useState(0);
  const [statusElapsed, setStatusElapsed] = useState(0);

  const operationStartRef = useRef(null);
  const statusStartRef = useRef(null);
  const accumulatedRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/production/operations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/tasks`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/orders`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/workstations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/machine-statuses`, { headers }).then((r) => r.json()),
    ])
      .then(([opsRaw, tasksRaw, ordersRaw, wsRaw, statusesRaw]) => {
        const ops = normalizeList(opsRaw);
        const tasks = normalizeList(tasksRaw);
        const orders = normalizeList(ordersRaw);
        const workstations = normalizeList(wsRaw);
        const statuses = normalizeList(statusesRaw);
        setMachineStatuses(statuses);

        const op = ops.find((o) => String(o.id) === operationId);
        if (op) {
          setOperation(op);
          // Initialize timers from DB values
          const savedTotal = (op.duration_total_min ?? 0) * 60000;
          const savedShift = (op.duration_shift_min ?? 0) * 60000;
          accumulatedRef.current = savedTotal;
          setOperationElapsed(savedTotal);
          setStatusElapsed(savedShift);
          const t = tasks.find((x) => x.id === op.task_id);
          if (t) {
            setTask(t);
            const ord = orders.find((x) => x.id === t.order_id);
            if (ord) setOrder(ord);
          }
          const ws = workstations.find((w) => w.id === op.workstation_id);
          if (ws) {
            setWorkstation(ws);
            if (ws.status_id) setActiveStatusId(ws.status_id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [operationId]);

  // Build buttons from fetched statuses
  const statusButtons = useMemo(
    () =>
      machineStatuses
        .slice()
        .sort((a, b) => (a.status_no ?? 0) - (b.status_no ?? 0))
        .map((s) => {
          const { btnClass, statusBg, textColor, ringClass } = buildColorClasses(s.color);
          return {
            id: s.id,
            statusNo: s.status_no,
            label: s.name,
            color: btnClass,
            statusBg,
            textColor,
            ringClass,
            hasTimer: !NO_TIMER_NOS.has(s.status_no),
          };
        }),
    [machineStatuses],
  );

  const statusMetaById = useMemo(
    () => Object.fromEntries(statusButtons.map((b) => [b.id, b])),
    [statusButtons],
  );

  // Timer tick
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      if (operationStartRef.current != null) {
        setOperationElapsed(accumulatedRef.current + (now - operationStartRef.current));
      }
      if (statusStartRef.current != null) {
        setStatusElapsed(now - statusStartRef.current);
      }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, []);

  // Periodic DB sync every 10 minutes
  useEffect(() => {
    if (!operation) return;
    const token = localStorage.getItem("access_token");
    const interval = setInterval(() => {
      if (operationStartRef.current == null) return; // timer not running
      fetch(`${API_BASE}/production/operations/${operation.id}/recalculate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [operation]);

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

  const updateWorkstationStatus = useCallback(async (btn) => {
    if (!workstation) return;
    const token = localStorage.getItem("access_token");
    const parsedUserId = getUserId();

    const putPayload = {
      name: workstation.name,
      cost_center: workstation.cost_center || null,
      status_id: btn.id,
      current_task_id: btn.hasTimer ? (operation?.task_id ?? null) : null,
      user_id: parsedUserId,
    };

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    try {
      await fetch(`${API_BASE}/production/workstations/${workstation.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(putPayload),
      });
      setWorkstation((prev) => ({ ...prev, ...putPayload }));

      // Create operation log
      if (operation) {
        await fetch(`${API_BASE}/production/logs`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            operation_id: operation.id,
            status_id: btn.id,
            workstation_id: workstation.id,
            user_id: parsedUserId,
            note: btn.label,
          }),
        });
      }
    } catch (err) {
      console.error("Failed to update workstation status:", err);
    }
  }, [workstation, operation, getUserId]);

  const handleStatusClick = useCallback((btn) => {
    if (btn.hasTimer) {
      if (operationStartRef.current != null) {
        accumulatedRef.current += Date.now() - operationStartRef.current;
      }
      operationStartRef.current = Date.now();
      statusStartRef.current = Date.now();
      setStatusElapsed(0);
    } else {
      if (operationStartRef.current != null) {
        accumulatedRef.current += Date.now() - operationStartRef.current;
        setOperationElapsed(accumulatedRef.current);
      }
      operationStartRef.current = null;
      statusStartRef.current = null;
      setStatusElapsed(0);
    }
    setActiveStatusId(btn.id);
    updateWorkstationStatus(btn);
  }, [updateWorkstationStatus]);

  const activeBtn = activeStatusId ? statusMetaById[activeStatusId] : null;

  const orderLabel = order
    ? `${order.order_number} | ${order.team?.trim() || "—"} | ${order.product_name?.trim() || "—"}`
    : "—";

  const infoRows = [
    { label: "Zlecenie", value: orderLabel },
    { label: "Wyrób", value: order?.product_name?.trim() || "—" },
    { label: "Zespół", value: order?.team?.trim() || "—" },
    { label: "Nr detalu", value: task?.detail_number || "—" },
    { label: "Detal", value: task?.detail_name || "—" },
    { label: "Nr operacji", value: operation?.operation_no || "—" },
    { label: "Stanowisko", value: workstation?.name || "—" },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] p-6">
      <button
        onClick={() => navigate(`/mes/production/machine/${machineId}`)}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4 self-start"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót do operacji
      </button>
      <h1 className="text-2xl font-bold mb-6 text-center">Panel maszyny</h1>

      {loading ? (
        <p className="text-slate-400 text-center">Ładowanie…</p>
      ) : !operation ? (
        <p className="text-slate-400 text-center">Nie znaleziono operacji.</p>
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

            {/* RIGHT: status + buttons + opis */}
            <div className="space-y-5">
              {/* Status stanowiska */}
              <div className={`rounded-2xl border p-5 transition-colors ${
                activeBtn ? `${activeBtn.statusBg}` : "border-white/10 bg-white/5"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">Status stanowiska:</span>
                  <span className={`text-lg font-semibold ${
                    activeBtn ? activeBtn.textColor : "text-slate-400"
                  }`}>
                    {activeBtn ? activeBtn.label : "Brak"}
                  </span>
                </div>
              </div>

              {/* Action buttons — generated from machine_statuses */}
              <div className="grid grid-cols-2 gap-3">
                {statusButtons.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => handleStatusClick(btn)}
                    className={`${btn.color} rounded-xl px-4 py-3 text-sm font-medium transition
                      ${activeStatusId === btn.id ? `ring-2 ring-offset-2 ${btn.ringClass}` : ""}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Opis operacji */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-bold mb-2">Opis operacji:</h3>
                <p className="text-slate-300 whitespace-pre-line text-base">
                  {operation.description || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* ===== Timers (bottom, two columns) ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <h3 className="text-lg font-bold mb-3">Czas operacji:</h3>
              <span className="text-4xl font-mono font-bold tracking-wider text-emerald-400">
                {formatTime(operationElapsed)}
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
