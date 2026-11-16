import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft, ClipboardList, X } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";
import MES_MachineTabs from "./MES_MachineTabs.jsx";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

// No-timer statuses by status_no (koniec operacji, koniec zmiany, zmiana zlecenia, przerwij pracę)
const NO_TIMER_NOS = new Set([5, 6, 7, 8]);

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
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
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
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportShift, setReportShift] = useState(null);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [reportAction, setReportAction] = useState(null);

  // Status & timers
  const [activeStatusId, setActiveStatusId] = useState(null);
  const [tabsRefresh, setTabsRefresh] = useState(0);
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

    const isRelease = btn.statusNo === 6 || btn.statusNo === 8; // Koniec zmiany / Przerwij pracę
    const putPayload = {
      name: workstation.name,
      cost_center: workstation.cost_center || null,
      status_id: isRelease ? null : btn.id,
      current_task_id: btn.hasTimer ? (operation?.task_id ?? null) : null,
      current_operation_id: btn.hasTimer ? (operation?.id ?? null) : null,
      user_id: isRelease ? null : parsedUserId,
    };

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    try {
      // Create operation log first (before releasing the machine)
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
            created_at: (() => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; })(),
          }),
        });
      }

      // Update workstation (clears user_id on end-shift / stop-work)
      await fetch(`${API_BASE}/production/workstations/${workstation.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(putPayload),
      });
      setWorkstation((prev) => ({ ...prev, ...putPayload }));
    } catch (err) {
      console.error("Failed to update workstation status:", err);
    }
  }, [workstation, operation, getUserId]);

  const handleTakeover = useCallback(async () => {
    if (!workstation) return;
    const token = localStorage.getItem("access_token");
    const parsedUserId = getUserId();
    if (!token || !parsedUserId) return;

    if (workstation.user_id != null && Number(workstation.user_id) !== parsedUserId) {
      const confirmed = window.confirm(
        "Ta maszyna jest przypisana do innego operatora. Przejęcie maszyny odblokuje ją dla Ciebie i odbierze dostęp poprzedniemu operatorowi. Czy na pewno przejąć maszynę?"
      );
      if (!confirmed) return;
    }

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    try {
      if (operation) {
        await fetch(`${API_BASE}/production/logs`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            operation_id: operation.id,
            status_id: workstation.status_id || null,
            workstation_id: workstation.id,
            user_id: parsedUserId,
            note: "Przejęcie maszyny",
            created_at: (() => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; })(),
          }),
        });
      }

      const res = await fetch(`${API_BASE}/production/workstations/${workstation.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ user_id: parsedUserId }),
      });
      if (!res.ok) throw new Error("Takeover failed");
      const updated = await res.json();
      setWorkstation(updated);
      setTabsRefresh((n) => n + 1);
    } catch (err) {
      console.error("Failed to take over machine:", err);
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
    updateWorkstationStatus(btn).then(() => {
      setTabsRefresh((n) => n + 1);
      if (btn.statusNo === 6 || btn.statusNo === 8) navigate("/mes");
      if (btn.statusNo === 7) navigate(`/mes/production/machine/${machineId}`);
    });
  }, [updateWorkstationStatus, navigate]);

  const activeBtn = activeStatusId ? statusMetaById[activeStatusId] : null;
  const isMyMachine = workstation && workstation.user_id != null && Number(workstation.user_id) === getUserId();

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

  const openReport = async () => {
    setReportOpen(true);
    setReportLoading(true);
    setReportError("");
    setReportShift(null);
    try {
      const res = await fetch(`${API_BASE}/machine-shift-reports/current`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Nie udało się pobrać zleceń bieżącej zmiany.");
      setReportShift(await res.json());
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const saveReportChoice = async (orderId, choice) => {
    setSavingOrderId(orderId);
    setReportError("");
    try {
      const res = await fetch(`${API_BASE}/machine-shift-reports/current`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          remaining_hours: choice === "+" ? null : choice,
          is_completed: choice === "+",
        }),
      });
      if (!res.ok) throw new Error("Nie udało się zapisać raportu.");
      setReportShift((prev) => ({
        ...prev,
        orders: prev.orders.map((item) => item.order_id === orderId
          ? { ...item, remaining_hours: choice === "+" ? null : choice, is_completed: choice === "+" }
          : item),
      }));
    } catch (err) {
      setReportError(err.message);
    } finally {
      setSavingOrderId(null);
    }
  };

  const confirmReport = async () => {
    setReportAction("confirm");
    setReportError("");
    try {
      const res = await fetch(`${API_BASE}/machine-shift-reports/current/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Nie udało się zatwierdzić raportu.");
      }
      setReportShift(await res.json());
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportAction(null);
    }
  };

  const editReport = async () => {
    setReportAction("edit");
    setReportError("");
    try {
      const res = await fetch(`${API_BASE}/machine-shift-reports/current/unconfirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Nie udało się odblokować raportu.");
      }
      setReportShift(await res.json());
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportAction(null);
    }
  };

  const reportConfirmed = reportShift?.orders.some((item) => item.czy_zatwierdzony) ?? false;
  const reportComplete = reportShift?.orders.length > 0
    && reportShift.orders.every((item) => item.is_completed || item.remaining_hours != null);

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] p-6 pt-14">
      <MES_UserBar />
      <button
        onClick={() => navigate(`/mes/production/machine/${machineId}`)}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4 self-start"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót do operacji
      </button>
      <MES_MachineTabs activeMachineId={machineId} refreshKey={tabsRefresh} />
      <div className="mb-6 flex items-center justify-center gap-3">
        <h1 className="text-2xl font-bold">Panel maszyny</h1>
        <button type="button" onClick={openReport} title="Raport bieżącej zmiany" aria-label="Raport"
          className="rounded-lg border border-cyan-500/50 p-2 text-cyan-300 hover:bg-cyan-500/20">
          <ClipboardList className="h-5 w-5" />
        </button>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Raport bieżącej zmiany">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Raport bieżącej zmiany</h2>
              <button type="button" onClick={() => setReportOpen(false)} aria-label="Zamknij raport" className="rounded p-1 hover:bg-slate-700"><X /></button>
            </div>
            {reportLoading && <p className="text-slate-300">Ładowanie zleceń…</p>}
            {reportError && <p className="mb-3 text-red-300" role="alert">{reportError}</p>}
            {!reportLoading && reportShift && (
              <>
                <p className="mb-4 text-sm text-slate-300">Od wejścia do pracy: {reportShift.shift_started_at ? new Date(reportShift.shift_started_at).toLocaleString("pl-PL") : "brak aktywnej sesji MES"}</p>
                <p className="mb-4 text-sm text-slate-300">Wybierz 1–8 godzin potrzebnych na następnej zmianie lub +, jeśli zlecenie zostanie wykonane.</p>
                {reportShift.orders.length === 0 && <p className="text-slate-300">Brak wykonywanych zleceń na tej zmianie.</p>}
                <div className="space-y-3">
                  {reportShift.orders.map((item) => (
                    <div key={item.order_id} className="rounded-xl border border-slate-600 bg-slate-900/50 p-4">
                      <div className="mb-1 text-sm font-medium text-cyan-300">Stanowisko: {item.workstation_names || "—"}</div>
                      <div className="mb-3 font-semibold">{item.order_number} | {item.team || "—"} | {item.product_name || "—"}</div>
                      <div className="flex flex-wrap gap-2" aria-label={`Pozostały czas dla ${item.order_number}`}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, "+"].map((choice) => {
                          const selected = choice === "+" ? item.is_completed : item.remaining_hours === choice;
                          return <button key={choice} type="button" disabled={savingOrderId !== null || reportAction !== null || reportConfirmed}
                            onClick={() => saveReportChoice(item.order_id, choice)}
                            title={choice === "+" ? "Zlecenie zostanie wykonane" : `Pozostało ${choice} godzin na następnej zmianie`}
                            aria-pressed={selected}
                            className={`min-w-10 rounded-lg border px-3 py-2 font-bold transition disabled:opacity-50 ${selected ? "border-cyan-400 bg-cyan-500/30 text-white" : "border-slate-600 hover:bg-slate-700"}`}>{choice}</button>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {reportConfirmed ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-green-200">Raport zatwierdzony.</p>
                    <button type="button" onClick={editReport} disabled={reportAction !== null}
                      className="rounded-lg border border-amber-500/50 px-4 py-2.5 font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50">
                      {reportAction === "edit" ? "Odblokowywanie…" : "Edytuj raport"}
                    </button>
                  </div>
                ) : reportShift.orders.length > 0 && (
                  <button type="button" onClick={confirmReport}
                    disabled={!reportComplete || savingOrderId !== null || reportAction !== null}
                    className="mt-5 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50">
                    {reportAction === "confirm" ? "Zatwierdzanie…" : "Zatwierdź raport"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-center">Ładowanie…</p>
      ) : !operation ? (
        <p className="text-slate-400 text-center">Nie znaleziono operacji.</p>
      ) : (
        <>
          {/* ===== Two-column layout ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {!isMyMachine && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300 text-center space-y-3">
                  <div>Podgląd — maszyna przypisana do innego operatora</div>
                  <button
                    onClick={handleTakeover}
                    className="px-3 py-1.5 rounded-lg bg-yellow-600/30 hover:bg-yellow-500/40 border border-yellow-500/40 text-yellow-100 transition"
                  >
                    Przejmij od poprzedniego
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {statusButtons.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => isMyMachine && handleStatusClick(btn)}
                    disabled={!isMyMachine}
                    className={`${btn.color} rounded-xl px-4 py-3 text-sm font-medium transition
                      ${activeStatusId === btn.id ? `ring-2 ring-offset-2 ${btn.ringClass}` : ""}
                      ${!isMyMachine ? "opacity-50 cursor-not-allowed" : ""}`}
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
