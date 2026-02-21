import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft, GripVertical, Search } from "lucide-react";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

export default function MES_Operations() {
  const { machineId } = useParams();
  const navigate = useNavigate();

  const [operations, setOperations] = useState([]);
  const [machineName, setMachineName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [hideDone, setHideDone] = useState(true);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const authHeaders = () => {
    const token = localStorage.getItem("access_token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const headers = authHeaders();

    Promise.all([
      fetch(`${API_BASE}/production/operations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/tasks`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/orders`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/workstations`, { headers }).then((r) => r.json()),
    ])
      .then(([opsRaw, tasksRaw, ordersRaw, wsRaw]) => {
        const ops = normalizeList(opsRaw);
        const tasks = normalizeList(tasksRaw);
        const orders = normalizeList(ordersRaw);
        const workstations = normalizeList(wsRaw);

        const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));
        const orderMap = Object.fromEntries(orders.map((o) => [o.id, o]));

        const ws = workstations.find((w) => String(w.id) === machineId);
        if (ws) setMachineName(ws.name);

        const filtered = ops
          .filter((op) => String(op.workstation_id) === machineId)
          .map((op) => {
            const task = taskMap[op.task_id];
            const order = task ? orderMap[task.order_id] : null;
            return { ...op, task, order };
          });

        filtered.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
        setOperations(filtered);
      })
      .catch(() => setOperations([]))
      .finally(() => setLoading(false));
  }, [machineId]);

  const orderSelectOptions = useMemo(() => {
    const seen = new Map();
    operations.forEach((op) => {
      if (op.order && !seen.has(op.order.id)) {
        const team = op.order.team?.trim() || "—";
        const product = op.order.product_name?.trim() || "—";
        seen.set(op.order.id, `${op.order.order_number} | ${team} | ${product}`);
      }
    });
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [operations]);

  const filteredOperations = useMemo(() => {
    let list = operations;
    if (hideDone) {
      list = list.filter((op) => !op.is_done);
    }
    if (selectedOrderId) {
      const ordId = Number(selectedOrderId);
      list = list.filter((op) => op.order?.id === ordId);
    }
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((op) => {
      const fields = [
        op.description,
        String(op.operation_no ?? ""),
        op.order?.order_number,
        op.order?.team,
        op.order?.product_name,
        op.task?.detail_name,
        op.task?.detail_number,
      ]
        .filter(Boolean)
        .map((v) => v.toLowerCase());
      return fields.some((v) => v.includes(term));
    });
  }, [operations, search, selectedOrderId, hideDone]);

  const handleDragStart = (index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const reordered = [...operations];
    const [dragged] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, dragged);

    setOperations(reordered);
    setOrderChanged(true);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    const items = operations.map((op, index) => ({
      id: op.id,
      sort_order: index + 1,
    }));

    try {
      await fetch(`${API_BASE}/production/operations/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ items }),
      });
      setOrderChanged(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    navigate("/mes/production");
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] p-6 max-w-7xl mx-auto w-full">
      <button
        onClick={goBack}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót
      </button>
      <h1 className="text-2xl font-bold mb-6 text-center">
        Operacje{machineName ? ` — ${machineName}` : ""}
      </h1>

      {loading ? (
        <p className="text-slate-400">Ładowanie…</p>
      ) : operations.length === 0 ? (
        <p className="text-slate-400">Brak operacji dla tej maszyny.</p>
      ) : (
        <>
          <div className="flex gap-3 mb-4 w-full max-w-2xl mx-auto items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Szukaj operacji..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm"
              />
            </div>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm flex-1"
            >
              <option value="">Wszystkie zlecenia</option>
              {orderSelectOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap cursor-pointer">
              <button
                type="button"
                onClick={() => setHideDone((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  hideDone ? "bg-blue-600" : "bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    hideDone ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              Ukryj zakończone
            </label>
          </div>
          {orderChanged && (
            <button
              onClick={handleSaveOrder}
              disabled={saving}
              className="mb-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm"
            >
              {saving ? "Zapisywanie…" : "Zapisz kolejność"}
            </button>
          )}
          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/60 text-slate-300">
                <tr>
                  <th className="px-2 py-2 w-8"></th>
                  <th className="px-3 py-2 text-left font-medium">Nr operacji</th>
                  <th className="px-3 py-2 text-left font-medium">Opis</th>
                  <th className="px-3 py-2 text-left font-medium">Zlecenie</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredOperations.map((op, index) => (
                  <tr
                    key={op.id}
                    className="hover:bg-white/5 transition"
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <td
                      className="px-2 py-2 text-slate-500 cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={() => handleDragStart(index)}
                    >
                      <GripVertical className="w-4 h-4" />
                    </td>
                    <td className="px-3 py-2">{op.operation_no}</td>
                    <td className="px-3 py-2">{op.description}</td>
                    <td className="px-3 py-2">{op.order
                      ? `${op.order.order_number} | ${op.order.team?.trim() || "—"} | ${op.order.product_name?.trim() || "—"}`
                      : "—"}</td>
                    <td className="px-3 py-2">
                      {op.is_done ? (
                        <span className="text-green-400">Zakończona</span>
                      ) : op.is_started ? (
                        <span className="text-yellow-400">W trakcie</span>
                      ) : op.is_released ? (
                        <span className="text-blue-400">Zwolniona</span>
                      ) : (
                        <span className="text-slate-400">Oczekuje</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() =>
                          navigate(`/mes/production/machine/${machineId}/panel/${op.id}`)
                        }
                        className="px-3 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 transition"
                      >
                        Wykonaj
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
