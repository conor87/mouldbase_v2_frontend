import { useEffect, useMemo, useState } from "react";
import Navbar from "./Navbar.jsx";
import { API_BASE } from "../config/api.js";
import { getCurrentUser } from "../auth.js";

const toIntOrNull = (value) => {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const parsed = Number.parseInt(v, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toIntOrZero = (value) => {
  const v = String(value ?? "").trim();
  if (!v) return 0;
  const parsed = Number.parseInt(v, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const DataTable = ({ columns, rows, getRowKey }) => {
  if (!rows.length) {
    return <div className="text-sm text-slate-400">No records yet.</div>;
  }

  return (
    <div className="overflow-x-auto border border-slate-700 rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900/60 text-slate-300">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)} className="hover:bg-slate-800/40">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-slate-200">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function ProductionAdmin() {
  const [activeTab, setActiveTab] = useState("machine_statuses");
  const [message, setMessage] = useState(null);

  const [machineStatuses, setMachineStatuses] = useState([]);
  const [orderTypes, setOrderTypes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workstations, setWorkstations] = useState([]);
  const [operations, setOperations] = useState([]);
  const [logs, setLogs] = useState([]);

  const user = getCurrentUser();
  const role = user?.role;
  const isSuperAdmin = role === "superadmin";
  const canEdit = role === "admin" || role === "admindn" || role === "superadmin";

  const [orderSearch, setOrderSearch] = useState("");
  const [operationTaskSearch, setOperationTaskSearch] = useState("");

  const [statusForm, setStatusForm] = useState({ status_no: "", name: "" });
  const [orderTypeForm, setOrderTypeForm] = useState({ code: "", name: "" });
  const [orderForm, setOrderForm] = useState({
    order_number: "",
    order_type_id: "",
    is_done: false,
    team: "",
    product_name: "",
  });
  const [taskForm, setTaskForm] = useState({
    order_id: "",
    detail_number: "",
    detail_name: "",
    is_done: false,
    quantity: "",
  });
  const [workstationForm, setWorkstationForm] = useState({
    name: "",
    cost_center: "",
    status_id: "",
    current_task_id: "",
    user_id: "",
  });
  const [operationForm, setOperationForm] = useState({
    task_id: "",
    operation_no: "",
    description: "",
    suggested_duration_min: "",
    is_done: false,
    is_released: false,
    is_started: false,
    duration_total_min: "",
    duration_shift_min: "",
    workstation_id: "",
  });
  const [logForm, setLogForm] = useState({
    operation_id: "",
    status_id: "",
    workstation_id: "",
    user_id: "",
    note: "",
  });

  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingOrderTypeId, setEditingOrderTypeId] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingWorkstationId, setEditingWorkstationId] = useState(null);
  const [editingOperationId, setEditingOperationId] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);

  const authHeaders = () => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const apiGet = async (path, setter) => {
    const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
    if (!res.ok) {
      throw new Error(`GET ${path} failed`);
    }
    const data = await res.json();
    setter(Array.isArray(data) ? data : []);
  };

  const apiPost = async (path, payload, onDone) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || `POST ${path} failed`);
    }
    onDone?.();
  };

  const apiPut = async (path, payload, onDone) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || `PUT ${path} failed`);
    }
    onDone?.();
  };

  const loadAll = async () => {
    try {
      setMessage(null);
      await Promise.all([
        apiGet("/production/machine-statuses", setMachineStatuses),
        apiGet("/production/order-types", setOrderTypes),
        apiGet("/production/orders", setOrders),
        apiGet("/production/tasks", setTasks),
        apiGet("/production/workstations", setWorkstations),
        apiGet("/production/operations", setOperations),
        apiGet("/production/logs", setLogs),
      ]);
    } catch (err) {
      console.error(err);
      setMessage("Load failed. Check console and API status.");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const orderOptions = useMemo(() => orders || [], [orders]);
  const taskOptions = useMemo(() => tasks || [], [tasks]);
  const workstationOptions = useMemo(() => workstations || [], [workstations]);
  const statusOptions = useMemo(() => machineStatuses || [], [machineStatuses]);
  const orderTypeOptions = useMemo(() => orderTypes || [], [orderTypes]);
  const operationOptions = useMemo(() => operations || [], [operations]);
  const orderMetaById = useMemo(() => {
    const map = new Map();
    orderOptions.forEach((order) => {
      map.set(order.id, {
        team: order.team?.trim() || "",
        product: order.product_name?.trim() || "",
      });
    });
    return map;
  }, [orderOptions]);
  const orderLabelById = useMemo(() => {
    const map = new Map();
    orderOptions.forEach((order) => {
      const teamLabel = order.team?.trim() ? order.team.trim() : "-";
      const productLabel = order.product_name?.trim() ? order.product_name.trim() : "-";
      map.set(order.id, `${order.order_number} | ${teamLabel} | ${productLabel}`);
    });
    return map;
  }, [orderOptions]);
  const taskLabelById = useMemo(() => {
    const map = new Map();
    taskOptions.forEach((task) => {
      const meta = orderMetaById.get(task.order_id) ?? { team: "", product: "" };
      const teamLabel = meta.team || "-";
      const productLabel = meta.product || "-";
      const detailLabel = task.detail_name?.trim() ? task.detail_name.trim() : "-";
      map.set(task.id, `${teamLabel} | ${productLabel} | ${detailLabel}`);
    });
    return map;
  }, [taskOptions, orderMetaById]);
  const filteredOrderOptions = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();
    if (!term) return orderOptions;
    return orderOptions.filter((order) => {
      const fields = [order.order_number, order.team, order.product_name]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return fields.some((value) => value.includes(term));
    });
  }, [orderOptions, orderSearch]);
  const filteredTaskOptionsForOperations = useMemo(() => {
    const term = operationTaskSearch.trim().toLowerCase();
    if (!term) return taskOptions;
    return taskOptions.filter((task) => {
      const meta = orderMetaById.get(task.order_id) ?? {};
      const fields = [
        meta.team,
        meta.product,
        task.detail_name,
        task.detail_number,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return fields.some((value) => value.includes(term));
    });
  }, [taskOptions, operationTaskSearch, orderMetaById]);

  const handleCreateStatus = async (e) => {
    e.preventDefault();
    const payload = {
      status_no: toIntOrZero(statusForm.status_no),
      name: statusForm.name.trim(),
    };
    if (!payload.name) {
      setMessage("Status name is required.");
      return;
    }
    if (editingStatusId) {
      await apiPut(`/production/machine-statuses/${editingStatusId}`, payload, async () => {
        setEditingStatusId(null);
        setStatusForm({ status_no: "", name: "" });
        await apiGet("/production/machine-statuses", setMachineStatuses);
        setMessage("Status zaktualizowany.");
      });
      return;
    }
    await apiPost("/production/machine-statuses", payload, async () => {
      setStatusForm({ status_no: "", name: "" });
      await apiGet("/production/machine-statuses", setMachineStatuses);
      setMessage("Status dodany.");
    });
  };

  const handleCreateOrderType = async (e) => {
    e.preventDefault();
    const payload = {
      code: orderTypeForm.code.trim(),
      name: orderTypeForm.name.trim(),
    };
    if (!payload.code || !payload.name) {
      setMessage("Code and name are required.");
      return;
    }
    if (editingOrderTypeId) {
      await apiPut(`/production/order-types/${editingOrderTypeId}`, payload, async () => {
        setEditingOrderTypeId(null);
        setOrderTypeForm({ code: "", name: "" });
        await apiGet("/production/order-types", setOrderTypes);
        setMessage("Typ zlecenia zaktualizowany.");
      });
      return;
    }
    await apiPost("/production/order-types", payload, async () => {
      setOrderTypeForm({ code: "", name: "" });
      await apiGet("/production/order-types", setOrderTypes);
      setMessage("Typ zlecenia dodany.");
    });
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const payload = {
      order_number: orderForm.order_number.trim(),
      order_type_id: toIntOrNull(orderForm.order_type_id),
      is_done: Boolean(orderForm.is_done),
      team: orderForm.team.trim() || null,
      product_name: orderForm.product_name.trim() || null,
    };
    if (!payload.order_number || !payload.order_type_id) {
      setMessage("Order number and order type are required.");
      return;
    }
    if (editingOrderId) {
      await apiPut(`/production/orders/${editingOrderId}`, payload, async () => {
        setEditingOrderId(null);
        setOrderForm({
          order_number: "",
          order_type_id: "",
          is_done: false,
          team: "",
          product_name: "",
        });
        await apiGet("/production/orders", setOrders);
        setMessage("Zamówienie zaktualizowane.");
      });
      return;
    }
    await apiPost("/production/orders", payload, async () => {
      setOrderForm({
        order_number: "",
        order_type_id: "",
        is_done: false,
        team: "",
        product_name: "",
      });
      await apiGet("/production/orders", setOrders);
      setMessage("Zamówienie dodane.");
    });
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const payload = {
      order_id: toIntOrNull(taskForm.order_id),
      detail_number: taskForm.detail_number.trim(),
      detail_name: taskForm.detail_name.trim(),
      is_done: Boolean(taskForm.is_done),
      quantity: toIntOrNull(taskForm.quantity),
    };
    if (!payload.order_id || !payload.detail_number || !payload.detail_name) {
      setMessage("Order, detail number, and detail name are required.");
      return;
    }
    if (editingTaskId) {
      await apiPut(`/production/tasks/${editingTaskId}`, payload, async () => {
        setEditingTaskId(null);
        setTaskForm({
          order_id: "",
          detail_number: "",
          detail_name: "",
          is_done: false,
          quantity: "",
        });
        await apiGet("/production/tasks", setTasks);
        setMessage("Zlecenie zaktualizowane.");
      });
      return;
    }
    await apiPost("/production/tasks", payload, async () => {
      setTaskForm({
        order_id: "",
        detail_number: "",
        detail_name: "",
        is_done: false,
        quantity: "",
      });
      await apiGet("/production/tasks", setTasks);
      setMessage("Zlecenie dodane.");
    });
  };

  const handleCreateWorkstation = async (e) => {
    e.preventDefault();
    const payload = {
      name: workstationForm.name.trim(),
      cost_center: workstationForm.cost_center.trim() || null,
      status_id: toIntOrNull(workstationForm.status_id),
      current_task_id: toIntOrNull(workstationForm.current_task_id),
      user_id: toIntOrNull(workstationForm.user_id),
    };
    if (!payload.name) {
      setMessage("Workstation name is required.");
      return;
    }
    if (editingWorkstationId) {
      await apiPut(`/production/workstations/${editingWorkstationId}`, payload, async () => {
        setEditingWorkstationId(null);
        setWorkstationForm({
          name: "",
          cost_center: "",
          status_id: "",
          current_task_id: "",
          user_id: "",
        });
        await apiGet("/production/workstations", setWorkstations);
        setMessage("Stanowisko zaktualizowane.");
      });
      return;
    }
    await apiPost("/production/workstations", payload, async () => {
      setWorkstationForm({
        name: "",
        cost_center: "",
        status_id: "",
        current_task_id: "",
        user_id: "",
      });
      await apiGet("/production/workstations", setWorkstations);
      setMessage("Stanowisko dodane.");
    });
  };

  const handleCreateOperation = async (e) => {
    e.preventDefault();
    const payload = {
      task_id: toIntOrNull(operationForm.task_id),
      operation_no: toIntOrZero(operationForm.operation_no),
      description: operationForm.description.trim(),
      suggested_duration_min: toIntOrNull(operationForm.suggested_duration_min),
      is_done: Boolean(operationForm.is_done),
      is_released: Boolean(operationForm.is_released),
      is_started: Boolean(operationForm.is_started),
      duration_total_min: toIntOrZero(operationForm.duration_total_min),
      duration_shift_min: toIntOrZero(operationForm.duration_shift_min),
      workstation_id: toIntOrNull(operationForm.workstation_id),
    };
    if (!payload.task_id || !payload.operation_no || !payload.description) {
      setMessage("Task, operation number, and description are required.");
      return;
    }
    if (editingOperationId) {
      await apiPut(`/production/operations/${editingOperationId}`, payload, async () => {
        setEditingOperationId(null);
        setOperationForm({
          task_id: "",
          operation_no: "",
          description: "",
          suggested_duration_min: "",
          is_done: false,
          is_released: false,
          is_started: false,
          duration_total_min: "",
          duration_shift_min: "",
          workstation_id: "",
        });
        await apiGet("/production/operations", setOperations);
        setMessage("Operacja zaktualizowana.");
      });
      return;
    }
    await apiPost("/production/operations", payload, async () => {
      setOperationForm({
        task_id: "",
        operation_no: "",
        description: "",
        suggested_duration_min: "",
        is_done: false,
        is_released: false,
        is_started: false,
        duration_total_min: "",
        duration_shift_min: "",
        workstation_id: "",
      });
      await apiGet("/production/operations", setOperations);
      setMessage("Operacja dodana.");
    });
  };

  const handleCreateLog = async (e) => {
    e.preventDefault();
    const payload = {
      operation_id: toIntOrNull(logForm.operation_id),
      status_id: toIntOrNull(logForm.status_id),
      workstation_id: toIntOrNull(logForm.workstation_id),
      user_id: toIntOrNull(logForm.user_id),
      note: logForm.note.trim() || null,
    };
    if (!payload.operation_id) {
      setMessage("Operation is required.");
      return;
    }
    if (editingLogId) {
      await apiPut(`/production/logs/${editingLogId}`, payload, async () => {
        setEditingLogId(null);
        setLogForm({
          operation_id: "",
          status_id: "",
          workstation_id: "",
          user_id: "",
          note: "",
        });
        await apiGet("/production/logs", setLogs);
        setMessage("Log zaktualizowany.");
      });
      return;
    }
    await apiPost("/production/logs", payload, async () => {
      setLogForm({
        operation_id: "",
        status_id: "",
        workstation_id: "",
        user_id: "",
        note: "",
      });
      await apiGet("/production/logs", setLogs);
      setMessage("Log dodany.");
    });
  };

  const startEditStatus = (row) => {
    setEditingStatusId(row.id);
    setStatusForm({ status_no: String(row.status_no ?? ""), name: row.name ?? "" });
    setMessage(null);
  };

  const startEditOrderType = (row) => {
    setEditingOrderTypeId(row.id);
    setOrderTypeForm({ code: row.code ?? "", name: row.name ?? "" });
    setMessage(null);
  };

  const startEditOrder = (row) => {
    setEditingOrderId(row.id);
    setOrderForm({
      order_number: row.order_number ?? "",
      order_type_id: row.order_type_id != null ? String(row.order_type_id) : "",
      is_done: Boolean(row.is_done),
      team: row.team ?? "",
      product_name: row.product_name ?? "",
    });
    setMessage(null);
  };

  const startEditTask = (row) => {
    setEditingTaskId(row.id);
    setTaskForm({
      order_id: row.order_id != null ? String(row.order_id) : "",
      detail_number: row.detail_number ?? "",
      detail_name: row.detail_name ?? "",
      is_done: Boolean(row.is_done),
      quantity: row.quantity != null ? String(row.quantity) : "",
    });
    setMessage(null);
  };

  const startEditWorkstation = (row) => {
    setEditingWorkstationId(row.id);
    setWorkstationForm({
      name: row.name ?? "",
      cost_center: row.cost_center ?? "",
      status_id: row.status_id != null ? String(row.status_id) : "",
      current_task_id: row.current_task_id != null ? String(row.current_task_id) : "",
      user_id: row.user_id != null ? String(row.user_id) : "",
    });
    setMessage(null);
  };

  const startEditOperation = (row) => {
    setEditingOperationId(row.id);
    setOperationForm({
      task_id: row.task_id != null ? String(row.task_id) : "",
      operation_no: row.operation_no != null ? String(row.operation_no) : "",
      description: row.description ?? "",
      suggested_duration_min: row.suggested_duration_min != null ? String(row.suggested_duration_min) : "",
      is_done: Boolean(row.is_done),
      is_released: Boolean(row.is_released),
      is_started: Boolean(row.is_started),
      duration_total_min: row.duration_total_min != null ? String(row.duration_total_min) : "",
      duration_shift_min: row.duration_shift_min != null ? String(row.duration_shift_min) : "",
      workstation_id: row.workstation_id != null ? String(row.workstation_id) : "",
    });
    setMessage(null);
  };

  const startEditLog = (row) => {
    setEditingLogId(row.id);
    setLogForm({
      operation_id: row.operation_id != null ? String(row.operation_id) : "",
      status_id: row.status_id != null ? String(row.status_id) : "",
      workstation_id: row.workstation_id != null ? String(row.workstation_id) : "",
      user_id: row.user_id != null ? String(row.user_id) : "",
      note: row.note ?? "",
    });
    setMessage(null);
  };

  const tabs = [
    { id: "machine_statuses", label: "Statusy maszyn" },
    { id: "order_types", label: "Typy zleceń" },
    { id: "workstations", label: "Stanowiska produkcyjne" },
    { id: "orders", label: "Zamówienia" },
    { id: "tasks", label: "Zlecenia" },
    { id: "operations", label: "Operacje" },
    { id: "logs", label: "Logi" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Navbar />
      <div className="pt-20 px-6 pb-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[220px_1fr] gap-6">
          <aside className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 h-fit">
            <div className="text-sm uppercase tracking-wider text-slate-400 mb-3">
              Administracja produkcji
            </div>
            <div className="flex flex-col gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-left px-3 py-2 rounded-lg border ${
                    activeTab === tab.id
                      ? "bg-blue-500/20 border-blue-500 text-blue-200"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </aside>

          <main className="space-y-6">
            {message && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-sm">
                {message}
              </div>
            )}

            {activeTab === "machine_statuses" && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <h2 className="text-xl font-semibold mb-4">Statusy maszyn</h2>
                {isSuperAdmin ? (
                  <form onSubmit={handleCreateStatus} className="grid md:grid-cols-3 gap-3 mb-6">
                    <input
                      type="number"
                      placeholder="Numer statusu"
                      value={statusForm.status_no}
                      onChange={(e) => setStatusForm({ ...statusForm, status_no: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                    />
                    <input
                      type="text"
                      placeholder="Nazwa statusu"
                      value={statusForm.name}
                      onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                    />
                    <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">
                      {editingStatusId ? "Zapisz status" : "Dodaj status"}
                    </button>
                    {editingStatusId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStatusId(null);
                          setStatusForm({ status_no: "", name: "" });
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-slate-400 md:col-span-3"
                      >
                        Anuluj edycję
                      </button>
                    )}
                  </form>
                ) : (
                  <div className="text-sm text-slate-400 mb-6">
                    Tylko superadmin może dodawać i edytować statusy maszyn.
                  </div>
                )}
                <div className="text-sm text-slate-400 mb-3">{machineStatuses.length} rekordów</div>
                <DataTable
                  rows={machineStatuses}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    { key: "status_no", header: "Numer statusu" },
                    { key: "name", header: "Nazwa" },
                    ...(isSuperAdmin
                      ? [
                          {
                            key: "actions",
                            header: "Akcje",
                            render: (row) => (
                              <button
                                type="button"
                                onClick={() => startEditStatus(row)}
                                className="px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:border-slate-400"
                              >
                                Edytuj
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </section>
            )}

            {activeTab === "order_types" && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <h2 className="text-xl font-semibold mb-4">Typy zleceń</h2>
                {isSuperAdmin ? (
                  <form onSubmit={handleCreateOrderType} className="grid md:grid-cols-3 gap-3 mb-6">
                    <input
                      type="text"
                      placeholder="Skrót"
                      value={orderTypeForm.code}
                      onChange={(e) => setOrderTypeForm({ ...orderTypeForm, code: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                    />
                    <input
                      type="text"
                      placeholder="Pełna nazwa"
                      value={orderTypeForm.name}
                      onChange={(e) => setOrderTypeForm({ ...orderTypeForm, name: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                    />
                    <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">
                      {editingOrderTypeId ? "Zapisz typ" : "Dodaj typ"}
                    </button>
                    {editingOrderTypeId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOrderTypeId(null);
                          setOrderTypeForm({ code: "", name: "" });
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-slate-400 md:col-span-3"
                      >
                        Anuluj edycję
                      </button>
                    )}
                  </form>
                ) : (
                  <div className="text-sm text-slate-400 mb-6">
                    Tylko superadmin może dodawać i edytować typy zleceń.
                  </div>
                )}
                <div className="text-sm text-slate-400 mb-3">{orderTypes.length} rekordów</div>
                <DataTable
                  rows={orderTypes}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    { key: "code", header: "Skrót" },
                    { key: "name", header: "Pełna nazwa" },
                    ...(isSuperAdmin
                      ? [
                          {
                            key: "actions",
                            header: "Akcje",
                            render: (row) => (
                              <button
                                type="button"
                                onClick={() => startEditOrderType(row)}
                                className="px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:border-slate-400"
                              >
                                Edytuj
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </section>
            )}

            {activeTab === "orders" && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <h2 className="text-xl font-semibold mb-4">Zamówienia</h2>
                <form onSubmit={handleCreateOrder} className="grid md:grid-cols-3 gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="Numer zlecenia"
                    value={orderForm.order_number}
                    onChange={(e) => setOrderForm({ ...orderForm, order_number: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <select
                    value={orderForm.order_type_id}
                    onChange={(e) => setOrderForm({ ...orderForm, order_type_id: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  >
                    <option value="">Wybierz typ zlecenia</option>
                    {orderTypeOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} - {t.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Zespół"
                    value={orderForm.team}
                    onChange={(e) => setOrderForm({ ...orderForm, team: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <input
                    type="text"
                    placeholder="Nazwa wyrobu"
                    value={orderForm.product_name}
                    onChange={(e) => setOrderForm({ ...orderForm, product_name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={orderForm.is_done}
                      onChange={(e) => setOrderForm({ ...orderForm, is_done: e.target.checked })}
                    />
                    Zakończone
                  </label>
                  <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">
                    {editingOrderId ? "Zapisz zamówienie" : "Dodaj zamówienie"}
                  </button>
                  {editingOrderId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOrderId(null);
                        setOrderForm({
                          order_number: "",
                          order_type_id: "",
                          is_done: false,
                          team: "",
                          product_name: "",
                        });
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-slate-400 md:col-span-3"
                    >
                      Anuluj edycję
                    </button>
                  )}
                </form>
                <div className="text-sm text-slate-400 mb-3">{orders.length} rekordów</div>
                <DataTable
                  rows={orders}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    { key: "order_number", header: "Numer zlecenia" },
                    { key: "order_type_id", header: "Typ (ID)" },
                    { key: "is_done", header: "Zakończone", render: (row) => (row.is_done ? "tak" : "nie") },
                    { key: "team", header: "Zespół" },
                    { key: "product_name", header: "Nazwa wyrobu" },
                    ...(canEdit
                      ? [
                          {
                            key: "actions",
                            header: "Akcje",
                            render: (row) => (
                              <button
                                type="button"
                                onClick={() => startEditOrder(row)}
                                className="px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:border-slate-400"
                              >
                                Edytuj
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </section>
            )}

            {activeTab === "tasks" && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <h2 className="text-xl font-semibold mb-4">Zlecenia</h2>
                <form onSubmit={handleCreateTask} className="grid md:grid-cols-3 gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="Szukaj zamówienia..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <select
                    value={taskForm.order_id}
                    onChange={(e) => setTaskForm({ ...taskForm, order_id: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  >
                    <option value="">Wybierz zamówienie</option>
                    {filteredOrderOptions.map((o) => {
                      const teamLabel = o.team?.trim() ? o.team.trim() : "-";
                      const productLabel = o.product_name?.trim() ? o.product_name.trim() : "-";
                      return (
                        <option key={o.id} value={o.id}>
                          {o.order_number} | {teamLabel} | {productLabel}
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="text"
                    placeholder="Numer detalu"
                    value={taskForm.detail_number}
                    onChange={(e) => setTaskForm({ ...taskForm, detail_number: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <input
                    type="text"
                    placeholder="Nazwa detalu"
                    value={taskForm.detail_name}
                    onChange={(e) => setTaskForm({ ...taskForm, detail_name: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <input
                    type="number"
                    placeholder="Ilość sztuk"
                    value={taskForm.quantity}
                    onChange={(e) => setTaskForm({ ...taskForm, quantity: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={taskForm.is_done}
                      onChange={(e) => setTaskForm({ ...taskForm, is_done: e.target.checked })}
                    />
                    Zakończone
                  </label>
                  <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">
                    {editingTaskId ? "Zapisz zlecenie" : "Dodaj zlecenie"}
                  </button>
                  {editingTaskId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTaskId(null);
                        setTaskForm({
                          order_id: "",
                          detail_number: "",
                          detail_name: "",
                          is_done: false,
                          quantity: "",
                        });
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-slate-400 md:col-span-3"
                    >
                      Anuluj edycję
                    </button>
                  )}
                </form>
                <div className="text-sm text-slate-400 mb-3">{tasks.length} rekordów</div>
                <DataTable
                  rows={tasks}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    {
                      key: "order_id",
                      header: "Zamówienie",
                      render: (row) => orderLabelById.get(row.order_id) ?? row.order_id,
                    },
                    { key: "detail_number", header: "Numer detalu" },
                    { key: "detail_name", header: "Nazwa detalu" },
                    { key: "quantity", header: "Ilość" },
                    { key: "is_done", header: "Zakończone", render: (row) => (row.is_done ? "tak" : "nie") },
                    ...(canEdit
                      ? [
                          {
                            key: "actions",
                            header: "Akcje",
                            render: (row) => (
                              <button
                                type="button"
                                onClick={() => startEditTask(row)}
                                className="px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:border-slate-400"
                              >
                                Edytuj
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </section>
            )}

            {activeTab === "workstations" && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <h2 className="text-xl font-semibold mb-4">Stanowiska produkcyjne</h2>
                {isSuperAdmin ? (
                  <form onSubmit={handleCreateWorkstation} className="grid md:grid-cols-3 gap-3 mb-6">
                    <input
                      type="text"
                      placeholder="Nazwa stanowiska"
                      value={workstationForm.name}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, name: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                    />
                    <input
                      type="text"
                      placeholder="Stanowisko kosztów"
                      value={workstationForm.cost_center}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, cost_center: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                    />
                    <select
                      value={workstationForm.status_id}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, status_id: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                    >
                      <option value="">Status (opcjonalnie)</option>
                      {statusOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.status_no} - {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={workstationForm.current_task_id}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, current_task_id: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                    >
                      <option value="">Aktualne zlecenie (opcjonalnie)</option>
                      {taskOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.detail_number} - {t.detail_name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="User ID (opcjonalnie)"
                      value={workstationForm.user_id}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, user_id: e.target.value })}
                      className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                    />
                    <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">
                      {editingWorkstationId ? "Zapisz stanowisko" : "Dodaj stanowisko"}
                    </button>
                    {editingWorkstationId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWorkstationId(null);
                          setWorkstationForm({
                            name: "",
                            cost_center: "",
                            status_id: "",
                            current_task_id: "",
                            user_id: "",
                          });
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-slate-400 md:col-span-3"
                      >
                        Anuluj edycję
                      </button>
                    )}
                  </form>
                ) : (
                  <div className="text-sm text-slate-400 mb-6">
                    Tylko superadmin może dodawać i edytować stanowiska produkcyjne.
                  </div>
                )}
                <div className="text-sm text-slate-400 mb-3">{workstations.length} rekordów</div>
                <DataTable
                  rows={workstations}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    { key: "name", header: "Nazwa" },
                    { key: "cost_center", header: "Stanowisko kosztów" },
                    { key: "status_id", header: "Status (ID)" },
                    { key: "current_task_id", header: "Aktualne zlecenie (ID)" },
                    { key: "user_id", header: "User ID" },
                    ...(isSuperAdmin
                      ? [
                          {
                            key: "actions",
                            header: "Akcje",
                            render: (row) => (
                              <button
                                type="button"
                                onClick={() => startEditWorkstation(row)}
                                className="px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:border-slate-400"
                              >
                                Edytuj
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </section>
            )}

            {activeTab === "operations" && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <h2 className="text-xl font-semibold mb-4">Operacje</h2>
                <form onSubmit={handleCreateOperation} className="grid md:grid-cols-3 gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="Szukaj zlecenia..."
                    value={operationTaskSearch}
                    onChange={(e) => setOperationTaskSearch(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <select
                    value={operationForm.task_id}
                    onChange={(e) => setOperationForm({ ...operationForm, task_id: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  >
                    <option value="">Wybierz zlecenie</option>
                    {filteredTaskOptionsForOperations.map((t) => (
                      <option key={t.id} value={t.id}>
                        {taskLabelById.get(t.id) ?? t.detail_name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Numer operacji"
                    value={operationForm.operation_no}
                    onChange={(e) => setOperationForm({ ...operationForm, operation_no: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <textarea
                    placeholder="Opis operacji"
                    value={operationForm.description}
                    onChange={(e) => setOperationForm({ ...operationForm, description: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 md:col-span-3"
                    rows={3}
                  />
                  <input
                    type="number"
                    placeholder="Sugerowany czas (min)"
                    value={operationForm.suggested_duration_min}
                    onChange={(e) => setOperationForm({ ...operationForm, suggested_duration_min: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <input
                    type="number"
                    placeholder="Czas wykonania (min)"
                    value={operationForm.duration_total_min}
                    onChange={(e) => setOperationForm({ ...operationForm, duration_total_min: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <input
                    type="number"
                    placeholder="Czas na zmianie (min)"
                    value={operationForm.duration_shift_min}
                    onChange={(e) => setOperationForm({ ...operationForm, duration_shift_min: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <select
                    value={operationForm.workstation_id}
                    onChange={(e) => setOperationForm({ ...operationForm, workstation_id: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  >
                    <option value="">Stanowisko (opcjonalnie)</option>
                    {workstationOptions.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300 md:col-span-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={operationForm.is_done}
                        onChange={(e) => setOperationForm({ ...operationForm, is_done: e.target.checked })}
                      />
                      Zakończone
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={operationForm.is_released}
                        onChange={(e) => setOperationForm({ ...operationForm, is_released: e.target.checked })}
                      />
                      Przekazane do realizacji
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={operationForm.is_started}
                        onChange={(e) => setOperationForm({ ...operationForm, is_started: e.target.checked })}
                      />
                      Rozpoczęte
                    </label>
                  </div>
                  <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">
                    {editingOperationId ? "Zapisz operację" : "Dodaj operację"}
                  </button>
                  {editingOperationId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOperationId(null);
                        setOperationForm({
                          task_id: "",
                          operation_no: "",
                          description: "",
                          suggested_duration_min: "",
                          is_done: false,
                          is_released: false,
                          is_started: false,
                          duration_total_min: "",
                          duration_shift_min: "",
                          workstation_id: "",
                        });
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-slate-400 md:col-span-3"
                    >
                      Anuluj edycję
                    </button>
                  )}
                </form>
                <div className="text-sm text-slate-400 mb-3">{operations.length} rekordów</div>
                <DataTable
                  rows={operations}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    { key: "task_id", header: "Zlecenie (ID)" },
                    { key: "operation_no", header: "Nr operacji" },
                    { key: "description", header: "Opis" },
                    { key: "suggested_duration_min", header: "Sugerowany czas (min)" },
                    { key: "duration_total_min", header: "Czas wykonania (min)" },
                    { key: "duration_shift_min", header: "Czas na zmianie (min)" },
                    { key: "is_done", header: "Zakończone", render: (row) => (row.is_done ? "tak" : "nie") },
                    { key: "is_released", header: "Przekazane", render: (row) => (row.is_released ? "tak" : "nie") },
                    { key: "is_started", header: "Rozpoczęte", render: (row) => (row.is_started ? "tak" : "nie") },
                    { key: "workstation_id", header: "Stanowisko (ID)" },
                    ...(canEdit
                      ? [
                          {
                            key: "actions",
                            header: "Akcje",
                            render: (row) => (
                              <button
                                type="button"
                                onClick={() => startEditOperation(row)}
                                className="px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:border-slate-400"
                              >
                                Edytuj
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </section>
            )}

            {activeTab === "logs" && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <h2 className="text-xl font-semibold mb-4">Logi</h2>
                <form onSubmit={handleCreateLog} className="grid md:grid-cols-3 gap-3 mb-6">
                  <select
                    value={logForm.operation_id}
                    onChange={(e) => setLogForm({ ...logForm, operation_id: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  >
                    <option value="">Wybierz operację</option>
                    {operationOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.operation_no} - zlecenie {o.task_id}
                      </option>
                    ))}
                  </select>
                  <select
                    value={logForm.status_id}
                    onChange={(e) => setLogForm({ ...logForm, status_id: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  >
                    <option value="">Status (opcjonalnie)</option>
                    {statusOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.status_no} - {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={logForm.workstation_id}
                    onChange={(e) => setLogForm({ ...logForm, workstation_id: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  >
                    <option value="">Stanowisko (opcjonalnie)</option>
                    {workstationOptions.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="User ID (opcjonalnie)"
                    value={logForm.user_id}
                    onChange={(e) => setLogForm({ ...logForm, user_id: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <input
                    type="text"
                    placeholder="Notatka"
                    value={logForm.note}
                    onChange={(e) => setLogForm({ ...logForm, note: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700"
                  />
                  <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500">
                    {editingLogId ? "Zapisz log" : "Dodaj log"}
                  </button>
                  {editingLogId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLogId(null);
                        setLogForm({
                          operation_id: "",
                          status_id: "",
                          workstation_id: "",
                          user_id: "",
                          note: "",
                        });
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:border-slate-400 md:col-span-3"
                    >
                      Anuluj edycję
                    </button>
                  )}
                </form>
                <div className="text-sm text-slate-400 mb-3">{logs.length} rekordów</div>
                <DataTable
                  rows={logs}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    { key: "operation_id", header: "Operacja (ID)" },
                    { key: "status_id", header: "Status (ID)" },
                    { key: "workstation_id", header: "Stanowisko (ID)" },
                    { key: "user_id", header: "User ID" },
                    { key: "note", header: "Notatka" },
                    { key: "created_at", header: "Utworzono" },
                    ...(canEdit
                      ? [
                          {
                            key: "actions",
                            header: "Akcje",
                            render: (row) => (
                              <button
                                type="button"
                                onClick={() => startEditLog(row)}
                                className="px-2 py-1 rounded-md border border-slate-600 text-slate-200 hover:border-slate-400"
                              >
                                Edytuj
                              </button>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
