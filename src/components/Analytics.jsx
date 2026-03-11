import { useEffect, useState, useCallback } from "react";
import { API_BASE } from "../config/api.js";
import { getCurrentUser } from "../auth.js";
import {
  BarChart3, Save, RotateCcw, ChevronDown, ChevronUp, Clock,
  User, Loader2, Cpu, Users, ScrollText, Wrench, LogIn,
} from "lucide-react";
import Navbar from "./Navbar.jsx";

const authHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const tabs = [
  { id: "workers", label: "Pracownicy", icon: Users },
  { id: "machines", label: "Maszyny", icon: Cpu },
  { id: "production_logs", label: "Logi produkcji", icon: ScrollText },
  { id: "service_logs", label: "Logi serwisu", icon: Wrench },
  { id: "session_logs", label: "Logi sesji MES", icon: LogIn },
];

const DataTable = ({ columns, rows, getRowKey }) => {
  if (!rows.length) {
    return <div className="text-sm text-slate-400">Brak rekordów.</div>;
  }
  return (
    <div className="overflow-x-auto border border-slate-700 rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900/60 text-slate-300">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-center font-medium">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)} className="hover:bg-slate-800/40">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-slate-200 text-center">
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

// ===== Shared accordion card component =====
function CardRow({
  id, label, icon: Icon, source, edited, total, isOpen, onToggle,
  entries, entryKey, entryLabel, canEdit, onSlider, onSave, onReset, isSaving,
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-750 transition text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-slate-400" />
          <span className="font-medium text-white">{label}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              source === "saved"
                ? "bg-green-900/50 text-green-300 border border-green-700"
                : "bg-yellow-900/50 text-yellow-300 border border-yellow-700"
            }`}
          >
            {source === "saved" ? "zapisane" : "z logów"}
          </span>
          {edited && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/50 text-orange-300 border border-orange-700">
              edytowane
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-300">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatMinutes(total)}</span>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-700 px-4 py-4">
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry[entryKey]} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{entryLabel(entry)}</span>
                  <span className="font-mono text-slate-200 text-sm min-w-[70px] text-right">
                    {formatMinutes(entry.minutes)}
                  </span>
                </div>
                {canEdit ? (
                  <input
                    type="range"
                    min={0}
                    max={720}
                    step={5}
                    value={entry.minutes}
                    onChange={(e) => onSlider(id, entry[entryKey], parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                ) : (
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min((entry.minutes / 480) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Łącznie:</span>
            <span className="font-mono text-lg text-white">{formatMinutes(total)}</span>
          </div>

          {canEdit && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Zapisz kartę
              </button>
              <button
                onClick={onReset}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Resetuj kartę
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("workers");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState({});

  // Workers state
  const [workers, setWorkers] = useState([]);
  const [expandedWorker, setExpandedWorker] = useState(null);
  const [workerEdits, setWorkerEdits] = useState({});

  // Machines state
  const [machines, setMachines] = useState([]);
  const [expandedMachine, setExpandedMachine] = useState(null);
  const [machineEdits, setMachineEdits] = useState({});

  // Logs state
  const [productionLogs, setProductionLogs] = useState([]);
  const [serviceLogs, setServiceLogs] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const user = getCurrentUser();
  const role = user?.role;
  const canEdit = role === "admin" || role === "admindn" || role === "superadmin";

  // ===== Fetch =====
  const fetchWorkers = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/analytics/worker-cards?date=${selectedDate}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWorkers(data.workers || []);
      setWorkerEdits({});
    } catch {
      setMessage("Błąd pobierania danych pracowników.");
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const fetchMachines = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/analytics/machine-cards?date=${selectedDate}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMachines(data.machines || []);
      setMachineEdits({});
    } catch {
      setMessage("Błąd pobierania danych maszyn.");
      setMachines([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const fetchProductionLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/production/logs`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProductionLogs(Array.isArray(data) ? data : []);
    } catch { setProductionLogs([]); }
    finally { setLogsLoading(false); }
  }, []);

  const fetchServiceLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/service/logs`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServiceLogs(Array.isArray(data) ? data : []);
    } catch { setServiceLogs([]); }
    finally { setLogsLoading(false); }
  }, []);

  const fetchSessionLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mes-session/logs`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessionLogs(Array.isArray(data) ? data : []);
    } catch { setSessionLogs([]); }
    finally { setLogsLoading(false); }
  }, []);

  const fetchData = useCallback(() => {
    if (activeTab === "workers") return fetchWorkers();
    if (activeTab === "machines") return fetchMachines();
    if (activeTab === "production_logs") return fetchProductionLogs();
    if (activeTab === "service_logs") return fetchServiceLogs();
    if (activeTab === "session_logs") return fetchSessionLogs();
  }, [activeTab, fetchWorkers, fetchMachines, fetchProductionLogs, fetchServiceLogs, fetchSessionLogs]);

  useEffect(() => {
    if (selectedDate) fetchData();
  }, [selectedDate, fetchData]);

  // ===== Workers logic =====
  const getWorkerEntries = (w) => workerEdits[w.user_id] || w.entries;
  const getWorkerTotal = (w) => getWorkerEntries(w).reduce((s, e) => s + e.minutes, 0);

  const handleWorkerSlider = (userId, wsId, mins) => {
    setWorkerEdits((prev) => {
      const worker = workers.find((w) => w.user_id === userId);
      const cur = prev[userId] || worker.entries.map((e) => ({ ...e }));
      return { ...prev, [userId]: cur.map((e) => e.workstation_id === wsId ? { ...e, minutes: mins } : e) };
    });
  };

  const saveWorker = async (worker) => {
    const entries = getWorkerEntries(worker);
    setSaving((p) => ({ ...p, [`w${worker.user_id}`]: true }));
    try {
      const res = await fetch(`${API_BASE}/analytics/worker-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          user_id: worker.user_id,
          date: selectedDate,
          entries: entries.map((e) => ({ workstation_id: e.workstation_id, minutes: e.minutes })),
        }),
      });
      if (!res.ok) throw new Error();
      setMessage(`Zapisano kartę: ${worker.username}`);
      await fetchWorkers();
    } catch {
      setMessage(`Błąd zapisu: ${worker.username}`);
    } finally {
      setSaving((p) => ({ ...p, [`w${worker.user_id}`]: false }));
    }
  };

  const resetWorker = async (worker) => {
    setSaving((p) => ({ ...p, [`w${worker.user_id}`]: true }));
    try {
      const res = await fetch(
        `${API_BASE}/analytics/worker-cards?user_id=${worker.user_id}&date=${selectedDate}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      setMessage(`Zresetowano kartę: ${worker.username}`);
      setWorkerEdits((p) => { const c = { ...p }; delete c[worker.user_id]; return c; });
      await fetchWorkers();
    } catch {
      setMessage(`Błąd resetowania: ${worker.username}`);
    } finally {
      setSaving((p) => ({ ...p, [`w${worker.user_id}`]: false }));
    }
  };

  // ===== Machines logic =====
  const getMachineEntries = (m) => machineEdits[m.workstation_id] || m.entries;
  const getMachineTotal = (m) => getMachineEntries(m).reduce((s, e) => s + e.minutes, 0);

  const handleMachineSlider = (wsId, opId, mins) => {
    setMachineEdits((prev) => {
      const machine = machines.find((m) => m.workstation_id === wsId);
      const cur = prev[wsId] || machine.entries.map((e) => ({ ...e }));
      return { ...prev, [wsId]: cur.map((e) => e.operation_id === opId ? { ...e, minutes: mins } : e) };
    });
  };

  const saveMachine = async (machine) => {
    const entries = getMachineEntries(machine);
    setSaving((p) => ({ ...p, [`m${machine.workstation_id}`]: true }));
    try {
      const res = await fetch(`${API_BASE}/analytics/machine-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          workstation_id: machine.workstation_id,
          date: selectedDate,
          entries: entries.map((e) => ({ operation_id: e.operation_id, minutes: e.minutes })),
        }),
      });
      if (!res.ok) throw new Error();
      setMessage(`Zapisano kartę: ${machine.workstation_name}`);
      await fetchMachines();
    } catch {
      setMessage(`Błąd zapisu: ${machine.workstation_name}`);
    } finally {
      setSaving((p) => ({ ...p, [`m${machine.workstation_id}`]: false }));
    }
  };

  const resetMachine = async (machine) => {
    setSaving((p) => ({ ...p, [`m${machine.workstation_id}`]: true }));
    try {
      const res = await fetch(
        `${API_BASE}/analytics/machine-cards?workstation_id=${machine.workstation_id}&date=${selectedDate}`,
        { method: "DELETE", headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      setMessage(`Zresetowano kartę: ${machine.workstation_name}`);
      setMachineEdits((p) => { const c = { ...p }; delete c[machine.workstation_id]; return c; });
      await fetchMachines();
    } catch {
      setMessage(`Błąd resetowania: ${machine.workstation_name}`);
    } finally {
      setSaving((p) => ({ ...p, [`m${machine.workstation_id}`]: false }));
    }
  };

  // ===== Render =====
  return (
    <div className="min-h-screen bg-slate-800/90 text-white">
      <Navbar titleOverride={<><span className="text-white">Mould</span><span className="text-blue-400">Analytics 2.0</span></>} />
      <div className="pt-20 px-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-7 h-7 text-blue-400" />
          <h1 className="text-2xl font-bold">Analityka</h1>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-4">
          {/* Sidebar tabs */}
          <aside className="bg-slate-800/60 border border-slate-700 rounded-xl p-2 h-fit">
            <div className="flex flex-col gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border transition ${
                      activeTab === tab.id
                        ? "bg-blue-500/20 border-blue-500 text-blue-200"
                        : "border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main content */}
          <main>
            {/* Date picker */}
            <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-slate-700">
              <div className="flex flex-wrap items-center gap-4">
                <label className="text-sm text-slate-300 font-medium">Wybierz dzień:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {loading ? "Ładowanie..." : "Odśwież"}
                </button>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className="mb-4 px-4 py-2 rounded-lg bg-blue-900/40 border border-blue-700 text-blue-200 text-sm">
                {message}
              </div>
            )}

            {/* Loading */}
            {(loading || logsLoading) && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="ml-3 text-slate-400">Ładowanie danych...</span>
              </div>
            )}

            {/* ===== Workers tab ===== */}
            {activeTab === "workers" && !loading && (
              <section>
                {workers.length === 0 && selectedDate && (
                  <div className="text-center py-12 text-slate-400">
                    Brak danych pracowników na dzień {selectedDate}
                  </div>
                )}
                {workers.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-400 mb-2">
                      {workers.length} pracowników &middot; {selectedDate}
                    </div>
                    {workers.map((worker) => (
                      <CardRow
                        key={worker.user_id}
                        id={worker.user_id}
                        label={worker.username}
                        icon={User}
                        source={worker.source}
                        edited={!!workerEdits[worker.user_id]}
                        total={getWorkerTotal(worker)}
                        isOpen={expandedWorker === worker.user_id}
                        onToggle={() => setExpandedWorker(expandedWorker === worker.user_id ? null : worker.user_id)}
                        entries={getWorkerEntries(worker)}
                        entryKey="workstation_id"
                        entryLabel={(e) => e.workstation_name || `Stanowisko #${e.workstation_id}`}
                        canEdit={canEdit}
                        onSlider={handleWorkerSlider}
                        onSave={() => saveWorker(worker)}
                        onReset={() => resetWorker(worker)}
                        isSaving={saving[`w${worker.user_id}`]}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ===== Machines tab ===== */}
            {activeTab === "machines" && !loading && (
              <section>
                {machines.length === 0 && selectedDate && (
                  <div className="text-center py-12 text-slate-400">
                    Brak danych maszyn na dzień {selectedDate}
                  </div>
                )}
                {machines.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-400 mb-2">
                      {machines.length} maszyn &middot; {selectedDate}
                    </div>
                    {machines.map((machine) => (
                      <CardRow
                        key={machine.workstation_id}
                        id={machine.workstation_id}
                        label={machine.workstation_name}
                        icon={Cpu}
                        source={machine.source}
                        edited={!!machineEdits[machine.workstation_id]}
                        total={getMachineTotal(machine)}
                        isOpen={expandedMachine === machine.workstation_id}
                        onToggle={() => setExpandedMachine(expandedMachine === machine.workstation_id ? null : machine.workstation_id)}
                        entries={getMachineEntries(machine)}
                        entryKey="operation_id"
                        entryLabel={(e) => e.operation_label || `Operacja #${e.operation_id}`}
                        canEdit={canEdit}
                        onSlider={handleMachineSlider}
                        onSave={() => saveMachine(machine)}
                        onReset={() => resetMachine(machine)}
                        isSaving={saving[`m${machine.workstation_id}`]}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ===== Production logs tab ===== */}
            {activeTab === "production_logs" && !logsLoading && (
              <section>
                <h2 className="text-lg font-bold mb-4">Logi produkcji</h2>
                <div className="text-sm text-slate-400 mb-3">{productionLogs.length} rekordów</div>
                <DataTable
                  rows={productionLogs}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    { key: "operation_id", header: "Operacja" },
                    { key: "status_id", header: "Status" },
                    { key: "workstation_id", header: "Stanowisko" },
                    { key: "user_id", header: "User ID" },
                    { key: "note", header: "Notatka" },
                    { key: "created_at", header: "Utworzono" },
                  ]}
                />
              </section>
            )}

            {/* ===== Service logs tab ===== */}
            {activeTab === "service_logs" && !logsLoading && (
              <section>
                <h2 className="text-lg font-bold mb-4">Logi serwisu</h2>
                <div className="text-sm text-slate-400 mb-3">{serviceLogs.length} rekordów</div>
                <DataTable
                  rows={serviceLogs}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    { key: "operator", header: "Operator" },
                    { key: "created_at", header: "Data" },
                    { key: "status_service", header: "Status serwis" },
                    { key: "mes_activ_service_id", header: "Zlecenie serwisowe ID" },
                    { key: "status_changeover", header: "Status przezbrojenia" },
                    { key: "mes_activ_changeover_id", header: "Przezbrojenie ID" },
                  ]}
                />
              </section>
            )}

            {/* ===== MES session logs tab ===== */}
            {activeTab === "session_logs" && !logsLoading && (
              <section>
                <h2 className="text-lg font-bold mb-4">Logi sesji MES</h2>
                <div className="text-sm text-slate-400 mb-3">{sessionLogs.length} rekordów</div>
                <DataTable
                  rows={sessionLogs}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: "id", header: "ID" },
                    { key: "user_id", header: "User ID" },
                    { key: "username", header: "Użytkownik" },
                    { key: "action", header: "Akcja", render: (row) => row.action === "login" ? "Logowanie" : "Wylogowanie" },
                    { key: "created_at", header: "Data" },
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
