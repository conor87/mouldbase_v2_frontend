import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config/api.js";
import { getCurrentUser } from "../auth.js";
import { ChevronDown, ChevronRight, Search, Loader2 } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

const collator = new Intl.Collator("pl", {
  numeric: true,
  sensitivity: "base",
});

const sortByDetailNumber = (items) =>
  [...items].sort((a, b) =>
    collator.compare(String(a.detail_number ?? ""), String(b.detail_number ?? ""))
  );

const sortByOperationNo = (items) =>
  [...items].sort((a, b) => (Number(a.operation_no) || 0) - (Number(b.operation_no) || 0));

function statusLabel(op) {
  if (op.is_done) return { text: "Zakończone", cls: "bg-emerald-500/90 text-white" };
  if (op.is_started) return { text: "W toku", cls: "bg-amber-400 text-slate-900" };
  if (op.is_released) return { text: "Zwolnione", cls: "bg-blue-400/80 text-white" };
  return { text: "Oczekuje", cls: "bg-slate-600 text-slate-200" };
}

function progressValue(op) {
  return op.is_done ? 100 : 0;
}

function TaskRow({ task, workstationMap, canToggleDone, onOperationDoneChange }) {
  const [expanded, setExpanded] = useState(false);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingOperationId, setSavingOperationId] = useState(null);
  const loaded = useRef(false);

  const toggle = async () => {
    if (!expanded && !loaded.current) {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/production/operations`, {
          headers: getAuthHeaders(),
          params: { task_id: task.id },
        });
        setOperations(sortByOperationNo(normalizeList(res.data)));
        loaded.current = true;
      } catch (err) {
        console.error("Error fetching operations:", err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded((prev) => !prev);
  };

  const toggleOperationDone = async (op) => {
    if (!canToggleDone) return;
    setSavingOperationId(op.id);
    try {
      const res = await axios.put(
        `${API_BASE}/production/operations/${op.id}`,
        { is_done: !op.is_done },
        { headers: getAuthHeaders() }
      );
      setOperations((prev) =>
        prev.map((item) => (item.id === op.id ? { ...item, ...res.data } : item))
      );
      onOperationDoneChange?.(task.id, res.data);
    } catch (err) {
      console.error("Error updating operation status:", err);
    } finally {
      setSavingOperationId(null);
    }
  };

  const pct = operations.length
    ? Math.round(
        (operations.filter((o) => o.is_done).length / operations.length) * 100
      )
    : 0;

  return (
    <div className="mb-3">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-white/5 border border-white/10
                   hover:bg-white/10 transition text-left cursor-pointer group"
      >
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-blue-400 shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-400 shrink-0 transition" />
        )}
        <span className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: task.is_done ? "#10b981" : "#3b82f6" }}
        />
        <span className="font-medium text-slate-100">
          {task.detail_number} &mdash; {task.detail_name}
        </span>
        {loaded.current && (
          <span className="ml-auto text-xs text-slate-400">{pct}%</span>
        )}
        {loading && <Loader2 className="w-4 h-4 ml-auto animate-spin text-blue-400" />}
      </button>

      {expanded && (
        <div className="mt-2 ml-4 overflow-x-auto">
          {operations.length === 0 && !loading ? (
            <p className="text-sm text-slate-500 py-3 px-4">Brak operacji</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-700/80 text-slate-200">
                  <th className="px-4 py-2.5 text-left rounded-tl-lg font-semibold">Nr operacji</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Opis operacji</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Stanowisko</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Status</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Zakończone</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Postęp</th>
                  <th className="px-4 py-2.5 text-center rounded-tr-lg font-semibold">Czas [min]</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, idx) => {
                  const st = statusLabel(op);
                  const pv = progressValue(op);
                  const wsName = workstationMap[op.workstation_id] ?? "—";
                  return (
                    <tr
                      key={op.id}
                      className={`border-b border-white/5 ${
                        idx % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.05]"
                      } hover:bg-white/10 transition`}
                    >
                      <td className="px-4 py-3 text-center font-mono text-slate-200">
                        {op.operation_no}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{op.description}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 rounded-md bg-slate-700 text-slate-200 text-xs font-medium">
                          {wsName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                          {st.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleOperationDone(op)}
                          disabled={!canToggleDone || savingOperationId === op.id}
                          aria-pressed={op.is_done}
                          title={
                            canToggleDone
                              ? op.is_done ? "Ustaw jako niezakończone" : "Ustaw jako zakończone"
                              : "Tylko admindn i superadmin"
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            op.is_done ? "bg-emerald-600" : "bg-slate-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                              op.is_done ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pv}%`,
                                backgroundColor: pv === 100 ? "#10b981" : "#3b82f6",
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{pv}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300 font-mono text-xs">
                        {op.duration_total_min ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersTree() {
  const currentUser = getCurrentUser();
  const canToggleDone = ["admindn", "superadmin"].includes(currentUser?.role);
  const [query, setQuery] = useState("");
  const [allOrders, setAllOrders] = useState([]);
  const [openOnly, setOpenOnly] = useState(true);
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedActiveOrderId, setSelectedActiveOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [operationsByTaskId, setOperationsByTaskId] = useState({});
  const [workstationMap, setWorkstationMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingActiveOrders, setLoadingActiveOrders] = useState(false);
  const [savingOrderDone, setSavingOrderDone] = useState(false);
  const [searched, setSearched] = useState(false);

  const orderOptionLabel = (order) => {
    const team = order?.team?.trim() || "—";
    const product = order?.product_name?.trim() || "—";
    return `${order?.order_number || "—"} | ${team} | ${product}`;
  };

  const activeOrderById = useMemo(() => {
    const map = new Map();
    activeOrders.forEach((order) => map.set(String(order.id), order));
    return map;
  }, [activeOrders]);

  const orders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allOrders.filter((order) => {
      const matchesQuery =
        !normalizedQuery ||
        order.team?.toLowerCase().includes(normalizedQuery) ||
        order.product_name?.toLowerCase().includes(normalizedQuery);
      const matchesOpen = !openOnly || !order.is_done;
      return matchesQuery && matchesOpen;
    });
  }, [allOrders, openOnly, query]);

  const selectedOrderOperations = useMemo(
    () => Object.values(operationsByTaskId).flat(),
    [operationsByTaskId]
  );

  const canCloseSelectedOrder =
    tasks.length > 0 &&
    tasks.every((task) => operationsByTaskId[task.id]) &&
    selectedOrderOperations.length > 0 &&
    selectedOrderOperations.every((op) => op.is_done);

  const fetchWorkstations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/production/workstations`, {
        headers: getAuthHeaders(),
      });
      const list = normalizeList(res.data);
      const map = {};
      list.forEach((ws) => {
        map[ws.id] = ws.name;
      });
      return map;
    } catch {
      return {};
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    setSelectedOrder(null);
    setTasks([]);
    setOperationsByTaskId({});
    try {
      const res = await axios.get(`${API_BASE}/production/orders`, {
        headers: getAuthHeaders(),
      });
      setAllOrders(normalizeList(res.data));
    } catch (err) {
      console.error("Error fetching orders:", err);
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      setLoadingActiveOrders(true);
      const res = await axios.get(`${API_BASE}/production/orders`, {
        headers: getAuthHeaders(),
      });
      const active = normalizeList(res.data)
        .filter((order) => !order.is_done)
        .sort((a, b) => String(a.order_number || "").localeCompare(String(b.order_number || ""), "pl"));
      setActiveOrders(active);
    } catch (err) {
      console.error("Error fetching active orders:", err);
      setActiveOrders([]);
    } finally {
      setLoadingActiveOrders(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
  }, []);

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setSelectedActiveOrderId(String(order.id));
    setOperationsByTaskId({});
    setLoading(true);
    try {
      const [tasksRes, wsMap] = await Promise.all([
        axios.get(`${API_BASE}/production/tasks`, {
          headers: getAuthHeaders(),
          params: { order_id: order.id },
        }),
        Object.keys(workstationMap).length === 0
          ? fetchWorkstations()
          : Promise.resolve(workstationMap),
      ]);
      const nextTasks = sortByDetailNumber(normalizeList(tasksRes.data));
      setTasks(nextTasks);
      const operationsResults = await Promise.all(
        nextTasks.map(async (task) => {
          const res = await axios.get(`${API_BASE}/production/operations`, {
            headers: getAuthHeaders(),
            params: { task_id: task.id },
          });
          return [task.id, sortByOperationNo(normalizeList(res.data))];
        })
      );
      setOperationsByTaskId(Object.fromEntries(operationsResults));
      if (Object.keys(workstationMap).length === 0) setWorkstationMap(wsMap);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActiveOrderChange = (value) => {
    setSelectedActiveOrderId(value);
    const order = activeOrderById.get(String(value));
    if (order) {
      setSearched(false);
      setAllOrders([]);
      setQuery("");
      handleSelectOrder(order);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleOperationDoneChange = (taskId, updatedOperation) => {
    setOperationsByTaskId((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] || []).map((op) =>
        op.id === updatedOperation.id ? { ...op, ...updatedOperation } : op
      ),
    }));
  };

  const handleToggleSelectedOrderDone = async () => {
    if (!selectedOrder || savingOrderDone) return;
    const newDone = !selectedOrder.is_done;
    if (newDone && !canCloseSelectedOrder) return;
    setSavingOrderDone(true);
    try {
      const res = await axios.put(
        `${API_BASE}/production/orders/${selectedOrder.id}`,
        { is_done: newDone },
        { headers: getAuthHeaders() }
      );
      const updatedOrder = { ...selectedOrder, ...res.data };
      setSelectedOrder(updatedOrder);
      setAllOrders((prev) =>
        prev.map((order) => (order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order))
      );
      await fetchActiveOrders();
    } catch (err) {
      console.error("Error updating order status:", err);
    } finally {
      setSavingOrderDone(false);
    }
  };

  return (
    <div className="min-h-screen p-6 pt-16 max-w-6xl mx-auto">
      <MES_UserBar left={128} />
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Drzewo zleceń</h1>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="mb-2 block text-sm font-semibold text-slate-200">
          Aktywne zlecenie
        </label>
        <select
          value={selectedActiveOrderId}
          onChange={(e) => handleActiveOrderChange(e.target.value)}
          disabled={loadingActiveOrders || activeOrders.length === 0}
          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-60"
        >
          <option value="">
            {loadingActiveOrders ? "Ładowanie aktywnych zleceń..." : "Wybierz aktywne zlecenie"}
          </option>
          {activeOrders.map((order) => (
            <option key={order.id} value={order.id}>
              {orderOptionLabel(order)}
            </option>
          ))}
        </select>
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-400 md:grid-cols-3">
          <span>Numer zamówienia</span>
          <span>Zespół</span>
          <span>Nazwa wyrobu</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zespół lub nazwa wyrobu..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                       text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/60
                       focus:ring-1 focus:ring-blue-500/30 transition"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200">
          <span>Otwarte</span>
          <button
            type="button"
            role="switch"
            aria-checked={openOnly}
            aria-label="Pokaż tylko otwarte zlecenia"
            onClick={() => setOpenOnly((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              openOnly ? "bg-blue-600" : "bg-slate-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                openOnly ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500
                     text-white font-medium rounded-xl transition cursor-pointer disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          {loading && !selectedOrder ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          Wykonaj
        </button>
      </div>

      {/* Orders list */}
      {searched && !selectedOrder && (
        <div className="mb-6">
          {orders.length === 0 && !loading ? (
            <p className="text-slate-500 text-sm">
              {query.trim()
                ? `Brak wyników dla zespołu lub nazwy wyrobu "${query}"`
                : openOnly
                  ? "Brak otwartych zleceń"
                  : "Brak zleceń"}
            </p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className="w-full flex items-center justify-between px-5 py-3 rounded-xl
                             bg-white/5 border border-white/10 hover:bg-white/10 transition
                             text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-blue-400">
                      {order.order_number}
                    </span>
                    {order.product_name && (
                      <span className="text-slate-400">&mdash; {order.product_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {order.team && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {order.team}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        order.is_done
                          ? "bg-emerald-500/90 text-white"
                          : "bg-amber-400 text-slate-900"
                      }`}
                    >
                      {order.is_done ? "Zakończone" : "W realizacji"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected order header + back */}
      {selectedOrder && (
        <div className="mb-6">
          <button
            onClick={() => {
              setSelectedOrder(null);
              setTasks([]);
              setOperationsByTaskId({});
            }}
            className="text-sm text-blue-400 hover:text-blue-300 mb-3 flex items-center gap-1 transition cursor-pointer"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Wróć do wyników
          </button>
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="font-mono font-bold text-blue-400 text-lg">
              {selectedOrder.order_number}
            </span>
            {selectedOrder.product_name && (
              <span className="text-slate-300">&mdash; {selectedOrder.product_name}</span>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={selectedOrder.is_done}
              aria-label="Zamknij zlecenie"
              title={
                selectedOrder.is_done
                  ? "Otwórz zlecenie ponownie"
                  : canCloseSelectedOrder
                    ? "Zamknij zlecenie"
                    : "Zlecenie można zamknąć dopiero po zamknięciu wszystkich operacji"
              }
              onClick={handleToggleSelectedOrderDone}
              disabled={
                savingOrderDone ||
                loading ||
                (!selectedOrder.is_done && !canCloseSelectedOrder)
              }
              className={`ml-auto relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selectedOrder.is_done ? "bg-emerald-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  selectedOrder.is_done ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                selectedOrder.is_done
                  ? "bg-emerald-500/90 text-white"
                  : "bg-amber-400 text-slate-900"
              }`}
            >
              {selectedOrder.is_done ? "Zakończone" : "W realizacji"}
            </span>
          </div>
        </div>
      )}

      {/* Tasks tree */}
      {selectedOrder && (
        <div>
          {loading && tasks.length === 0 ? (
            <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Ładowanie zleceń...</span>
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              Brak zleceń dla tego zamówienia
            </p>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                workstationMap={workstationMap}
                canToggleDone={canToggleDone}
                onOperationDoneChange={handleOperationDoneChange}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
