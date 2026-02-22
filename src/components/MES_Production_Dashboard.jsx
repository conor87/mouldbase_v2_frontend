import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft } from "lucide-react";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

// Build Tailwind classes from a color name (e.g. "green", "red", "slate")
function buildColorClasses(colorName) {
  const c = colorName || "slate";
  return {
    bg: `bg-${c}-600/20`,
    border: `border-${c}-500`,
    text: `text-${c}-400`,
    dot: `bg-${c}-500`,
  };
}

// Safelist hint for Tailwind (ensures dynamic classes are generated):
// bg-green-600/20 border-green-500 text-green-400 bg-green-500
// bg-red-600/20 border-red-500 text-red-400 bg-red-500
// bg-yellow-600/20 border-yellow-500 text-yellow-400 bg-yellow-500
// bg-slate-600/20 border-slate-500 text-slate-400 bg-slate-500
// bg-purple-600/20 border-purple-500 text-purple-400 bg-purple-500
// bg-blue-600/20 border-blue-500 text-blue-400 bg-blue-500
// bg-orange-600/20 border-orange-500 text-orange-400 bg-orange-500
// bg-cyan-600/20 border-cyan-500 text-cyan-400 bg-cyan-500
// bg-emerald-600/20 border-emerald-500 text-emerald-400 bg-emerald-500

export default function MES_Production_Dashboard() {
  const navigate = useNavigate();

  const [workstations, setWorkstations] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [machineGroups, setMachineGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/production/workstations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/machine-statuses`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/tasks`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/orders`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/machine-groups`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/users`, { headers }).then((r) => r.json()),
    ])
      .then(([wsRaw, statusesRaw, tasksRaw, ordersRaw, groupsRaw, usersRaw]) => {
        setWorkstations(normalizeList(wsRaw));
        setStatuses(normalizeList(statusesRaw));
        setTasks(normalizeList(tasksRaw));
        setOrders(normalizeList(ordersRaw));
        setMachineGroups(normalizeList(groupsRaw));
        setUsers(normalizeList(usersRaw));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusMap = useMemo(
    () => Object.fromEntries(statuses.map((s) => [s.id, s])),
    [statuses],
  );

  const taskMap = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t])),
    [tasks],
  );

  const orderMap = useMemo(
    () => Object.fromEntries(orders.map((o) => [o.id, o])),
    [orders],
  );

  const groupMap = useMemo(
    () => Object.fromEntries(machineGroups.map((g) => [g.id, g])),
    [machineGroups],
  );

  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  const filteredWorkstations = useMemo(() => {
    let list = workstations;
    if (selectedGroupId) {
      const gid = Number(selectedGroupId);
      list = list.filter((ws) => ws.machine_group_id === gid);
    }
    return list;
  }, [workstations, selectedGroupId]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <button
        onClick={() => navigate("/mes")}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4 self-start"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót
      </button>
      <h1 className="text-2xl font-bold mb-6 text-center">Dashboard produkcji</h1>

      {/* Filter bar */}
      <div className="flex justify-center mb-6">
        <select
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm min-w-[220px]"
        >
          <option value="">Wszystkie grupy maszyn</option>
          {machineGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center">Ładowanie…</p>
      ) : filteredWorkstations.length === 0 ? (
        <p className="text-slate-400 text-center">Brak maszyn.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWorkstations.map((ws) => {
            const status = ws.status_id ? statusMap[ws.status_id] : null;
            const task = ws.current_task_id ? taskMap[ws.current_task_id] : null;
            const order = task?.order_id ? orderMap[task.order_id] : null;
            const group = ws.machine_group_id ? groupMap[ws.machine_group_id] : null;
            const colors = buildColorClasses(status?.color);

            return (
              <div
                key={ws.id}
                className={`rounded-2xl border p-4 transition-colors ${colors.bg} ${colors.border}`}
              >
                {/* Machine name — link to machine panel or operations list */}
                <h2
                  className="text-lg font-bold mb-2 cursor-pointer hover:text-blue-400 transition"
                  onClick={() =>
                    ws.current_operation_id
                      ? navigate(`/mes/production/machine/${ws.id}/panel/${ws.current_operation_id}`)
                      : navigate(`/mes/production/machine/${ws.id}`)
                  }
                >
                  {ws.name}
                </h2>

                {/* Group name */}
                {group && (
                  <p className="text-xs text-slate-500 -mt-1 mb-2">{group.name}</p>
                )}

                {/* Status badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    {status?.name || "Brak statusu"}
                  </span>
                </div>

                {/* Order info */}
                {order ? (
                  <div className="text-sm space-y-0.5 mb-2">
                    <p className="text-slate-300">
                      <span className="text-slate-500">Zlecenie:</span>{" "}
                      {order.order_number}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Zespół:</span>{" "}
                      {order.team?.trim() || "—"}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Wyrób:</span>{" "}
                      {order.product_name?.trim() || "—"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mb-2">Brak zlecenia</p>
                )}

                {/* Task detail */}
                {task && (
                  <p className="text-sm text-slate-300">
                    <span className="text-slate-500">Detal:</span>{" "}
                    {task.detail_name || "—"}
                  </p>
                )}

                {/* Operator */}
                {ws.user_id && (
                  <p className="text-xs text-slate-500 mt-2">
                    Operator: {userMap[ws.user_id]?.username || ws.user_id}
                  </p>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
