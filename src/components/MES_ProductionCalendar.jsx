import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft, GripVertical, Save } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

const orderLabel = (order) => {
  if (!order) return "Brak zlecenia";
  const team = order.team?.trim() || "-";
  const product = order.product_name?.trim() || "-";
  return `${order.order_number} | ${team} | ${product}`;
};

const statusLabel = (op) => {
  if (op.is_done) return "Zakończona";
  if (op.is_started) return "W trakcie";
  if (op.is_released) return "Zwolniona";
  return "Oczekuje";
};

const QUEUE_POSITIONS = [1, 2, 3, 4, 5, 6];

export default function MES_ProductionCalendar() {
  const navigate = useNavigate();
  const dragRef = useRef(null);

  const [workstations, setWorkstations] = useState([]);
  const [operations, setOperations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [hideDone, setHideDone] = useState(true);
  const [message, setMessage] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("access_token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const headers = authHeaders();
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE}/production/workstations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/operations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/tasks`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/orders`, { headers }).then((r) => r.json()),
    ])
      .then(([wsRaw, opsRaw, tasksRaw, ordersRaw]) => {
        setWorkstations(normalizeList(wsRaw));
        setOperations(normalizeList(opsRaw));
        setTasks(normalizeList(tasksRaw));
        setOrders(normalizeList(ordersRaw));
      })
      .catch(() => {
        setWorkstations([]);
        setOperations([]);
        setMessage("Nie udało się pobrać kalendarza produkcji.");
      })
      .finally(() => setLoading(false));
  }, []);

  const taskMap = useMemo(
    () => Object.fromEntries(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  const orderMap = useMemo(
    () => Object.fromEntries(orders.map((order) => [order.id, order])),
    [orders],
  );

  const enrichedOperations = useMemo(
    () =>
      operations.map((op) => {
        const task = taskMap[op.task_id];
        const order = task ? orderMap[task.order_id] : null;
        return { ...op, task, order };
      }),
    [operations, taskMap, orderMap],
  );

  const operationsByWorkstation = useMemo(() => {
    const grouped = new Map();
    workstations.forEach((ws) => grouped.set(ws.id, []));

    enrichedOperations.forEach((op) => {
      if (!op.workstation_id) return;
      if (hideDone && op.is_done) return;
      if (!grouped.has(op.workstation_id)) grouped.set(op.workstation_id, []);
      grouped.get(op.workstation_id).push(op);
    });

    grouped.forEach((items) => {
      items.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
    });

    return grouped;
  }, [workstations, enrichedOperations, hideDone]);

  const sortedWorkstations = useMemo(
    () => [...workstations].sort((a, b) => a.name.localeCompare(b.name)),
    [workstations],
  );

  const maxOperationCount = useMemo(() => {
    let max = QUEUE_POSITIONS.length;
    operationsByWorkstation.forEach((items) => {
      max = Math.max(max, items.length);
    });
    return max;
  }, [operationsByWorkstation]);

  const reorderWithinWorkstation = (workstationId, fromIndex, toIndex) => {
    const visibleRow = operationsByWorkstation.get(workstationId) || [];
    const targetIndex = Math.min(Math.max(toIndex, 0), visibleRow.length - 1);
    if (fromIndex === targetIndex || !visibleRow[fromIndex] || targetIndex < 0) return;

    const visibleIds = new Set(visibleRow.map((op) => op.id));
    const reorderedVisible = [...visibleRow];
    const [dragged] = reorderedVisible.splice(fromIndex, 1);
    reorderedVisible.splice(targetIndex, 0, dragged);

    setOperations((prev) => {
      const replacements = new Map(reorderedVisible.map((op, index) => [op.id, index + 1]));
      return prev.map((op) => {
        if (op.workstation_id !== workstationId || !visibleIds.has(op.id)) return op;
        return { ...op, sort_order: replacements.get(op.id) };
      });
    });
    setOrderChanged(true);
    setMessage("");
  };

  const moveOperationToPosition = (workstationId, operationId, position) => {
    const visibleRow = operationsByWorkstation.get(workstationId) || [];
    const fromIndex = visibleRow.findIndex((op) => op.id === operationId);
    const targetIndex = Math.min(position - 1, visibleRow.length - 1);
    reorderWithinWorkstation(workstationId, fromIndex, targetIndex);
  };

  const handleDragStart = (workstationId, index) => {
    dragRef.current = { workstationId, index };
  };

  const handleDrop = (workstationId, index) => {
    const source = dragRef.current;
    dragRef.current = null;
    if (!source || source.workstationId !== workstationId) return;
    reorderWithinWorkstation(workstationId, source.index, index);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    setMessage("");

    const items = enrichedOperations
      .filter((op) => op.workstation_id)
      .sort((a, b) => {
        if (a.workstation_id !== b.workstation_id) return a.workstation_id - b.workstation_id;
        return (a.sort_order ?? 999) - (b.sort_order ?? 999);
      })
      .map((op, index) => ({ id: op.id, sort_order: index + 1 }));

    try {
      const res = await fetch(`${API_BASE}/production/operations/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Save failed");
      setOrderChanged(false);
      setMessage("Zapisano kolejność operacji.");
    } catch {
      setMessage("Nie udało się zapisać kolejności operacji.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2rem)] w-full flex-col px-4 pb-6 pt-14 sm:px-6">
      <MES_UserBar />
      <div className="mx-auto flex w-full max-w-[1600px] flex-col">
        <button
          onClick={() => navigate("/mes")}
          className="mb-4 flex items-center gap-1 self-start text-sm text-slate-400 transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Powrót
        </button>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kalendarz produkcji</h1>
            <p className="mt-1 text-sm text-slate-400">
              {sortedWorkstations.length} stanowisk · {enrichedOperations.length} operacji
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => setHideDone(e.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
              Ukryj zakończone
            </label>
            <button
              onClick={handleSaveOrder}
              disabled={!orderChanged || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Zapisywanie..." : "Zapisz kolejność"}
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
            {message}
          </div>
        )}

        {loading ? (
          <p className="text-center text-slate-400">Ładowanie...</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="min-w-full table-fixed text-sm">
              <thead className="bg-slate-900/70 text-slate-300">
                <tr>
                  <th className="sticky left-0 z-10 w-56 bg-slate-900/95 px-3 py-3 text-left font-medium">
                    Stanowisko
                  </th>
                  {Array.from({ length: maxOperationCount }, (_, index) => (
                    <th key={index} className="w-60 px-3 py-3 text-left font-medium">
                      Zadanie {index + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {sortedWorkstations.map((ws) => {
                  const rowOperations = operationsByWorkstation.get(ws.id) || [];
                  return (
                    <tr key={ws.id} className="align-top">
                      <th className="sticky left-0 z-10 bg-slate-800 px-3 py-3 text-left font-semibold text-slate-100">
                        <button
                          onClick={() => navigate(`/mes/production/machine/${ws.id}`)}
                          className="text-left transition hover:text-blue-300"
                        >
                          {ws.name}
                        </button>
                        <div className="mt-1 text-xs font-normal text-slate-500">
                          {rowOperations.length} operacji
                        </div>
                      </th>
                      {Array.from({ length: maxOperationCount }, (_, index) => {
                        const op = rowOperations[index];
                        return (
                          <td
                            key={`${ws.id}-${index}`}
                            className="h-36 w-60 max-w-60 border-l border-slate-700/50 px-3 py-3"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(ws.id, index)}
                          >
                            {op ? (
                              <div
                                draggable
                                onDragStart={() => handleDragStart(ws.id, index)}
                                onDragEnd={() => {
                                  dragRef.current = null;
                                }}
                                className="flex h-full min-h-28 max-w-[216px] cursor-grab flex-col rounded-lg border border-slate-600 bg-slate-900/70 p-3 transition hover:border-blue-500 active:cursor-grabbing"
                              >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <div className="min-w-0 max-w-[168px]">
                                    <div className="truncate text-xs text-blue-300">
                                      Operacja {op.operation_no ?? "-"}
                                    </div>
                                    <div className="line-clamp-2 font-medium text-slate-400">
                                      {op.description || "Bez opisu"}
                                    </div>
                                  </div>
                                  <GripVertical className="h-4 w-4 shrink-0 text-slate-500" />
                                </div>
                                <div className="space-y-1 text-xs text-slate-400">
                                  <div className="max-w-[184px] whitespace-normal break-words font-medium leading-snug text-slate-100">
                                    {orderLabel(op.order)}
                                  </div>
                                  <div className="truncate">
                                    {op.task?.detail_number || "-"} · {op.task?.detail_name || "-"}
                                  </div>
                                  <div className="text-slate-500">{statusLabel(op)}</div>
                                </div>
                                <div className="mt-auto grid grid-cols-6 gap-1 pt-2">
                                  {QUEUE_POSITIONS.map((position) => (
                                    <button
                                      key={position}
                                      type="button"
                                      onClick={() => moveOperationToPosition(ws.id, op.id, position)}
                                      disabled={rowOperations.findIndex((item) => item.id === op.id) === position - 1}
                                      title={`Ustaw jako ${position}. w kolejce`}
                                      className="h-7 rounded-md border border-slate-600 text-xs text-slate-300 transition hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-100 disabled:cursor-not-allowed disabled:border-blue-500/40 disabled:bg-blue-500/20 disabled:text-blue-100"
                                    >
                                      {position}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="h-full min-h-24 rounded-lg border border-dashed border-slate-700 bg-slate-900/30" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
