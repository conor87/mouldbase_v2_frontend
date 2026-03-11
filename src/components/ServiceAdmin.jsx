import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "./Navbar.jsx";
import { API_BASE } from "../config/api.js";
import { getCurrentUser } from "../auth.js";
import { Wrench, ScrollText } from "lucide-react";

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs text-slate-400 mb-1">{label}</label>
    {children}
  </div>
);

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm focus:outline-none focus:border-blue-500";

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
              <th key={col.key} className="px-3 py-2 text-center font-medium">
                {col.header}
              </th>
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

export default function ServiceAdmin() {
  const [activeTab, setActiveTab] = useState("service_workstations");
  const [message, setMessage] = useState(null);

  const [workstations, setWorkstations] = useState([]);
  const [logs, setLogs] = useState([]);

  const user = getCurrentUser();
  const role = user?.role;
  const canEdit = role === "admin" || role === "admindn" || role === "superadmin";

  // ─── Form state ────────────────────────────────────────────────────────────
  const [wsForm, setWsForm] = useState({
    nazwa_stanowiska: "",
    st: "",
    status: "",
    aktualne_przezbrojenie_id: "",
    aktualne_zlecenie_serwisowe_id: "",
    aktualny_typ_zlecenia: "",
    status_changeovers: "",
    user_id: "",
  });
  const [editingWsId, setEditingWsId] = useState(null);

  const [logForm, setLogForm] = useState({
    operator: "",
    created_at: "",
    status_service: "",
    mes_activ_service_id: "",
    mes_activ_changeover_id: "",
    status_changeover: "",
  });
  const [editingLogId, setEditingLogId] = useState(null);

  // ─── API helpers ───────────────────────────────────────────────────────────
  const getHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const apiGet = async (path, setter) => {
    try {
      const res = await fetch(`${API_BASE}${path}`, { headers: getHeaders() });
      const data = await res.json();
      setter(Array.isArray(data) ? data : data?.results ?? data?.data ?? []);
    } catch {
      /* ignore */
    }
  };

  const apiPost = async (path, body, onSuccess) => {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.detail || "Błąd zapisu.");
        return;
      }
      if (onSuccess) await onSuccess();
    } catch {
      setMessage("Błąd połączenia.");
    }
  };

  const apiPut = async (path, body, onSuccess) => {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.detail || "Błąd zapisu.");
        return;
      }
      if (onSuccess) await onSuccess();
    } catch {
      setMessage("Błąd połączenia.");
    }
  };

  const apiDelete = async (path, onSuccess) => {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.detail || "Błąd usuwania.");
        return;
      }
      if (onSuccess) await onSuccess();
    } catch {
      setMessage("Błąd połączenia.");
    }
  };

  // ─── Fetch data ────────────────────────────────────────────────────────────
  useEffect(() => {
    apiGet("/service/workstations", setWorkstations);
    apiGet("/service/logs", setLogs);
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const toIntOrNull = (value) => {
    const v = String(value ?? "").trim();
    if (!v) return null;
    const parsed = Number.parseInt(v, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const resetWsForm = () => {
    setWsForm({
      nazwa_stanowiska: "",
      st: "",
      status: "",
      aktualne_przezbrojenie_id: "",
      aktualne_zlecenie_serwisowe_id: "",
      aktualny_typ_zlecenia: "",
      status_changeovers: "",
      user_id: "",
    });
    setEditingWsId(null);
  };

  const handleCreateOrUpdateWs = async (e) => {
    e.preventDefault();
    const payload = {
      nazwa_stanowiska: wsForm.nazwa_stanowiska,
      st: wsForm.st || null,
      status: wsForm.status || null,
      aktualne_przezbrojenie_id: toIntOrNull(wsForm.aktualne_przezbrojenie_id),
      aktualne_zlecenie_serwisowe_id: toIntOrNull(wsForm.aktualne_zlecenie_serwisowe_id),
      aktualny_typ_zlecenia: wsForm.aktualny_typ_zlecenia || null,
      status_changeovers: wsForm.status_changeovers || null,
      user_id: toIntOrNull(wsForm.user_id),
    };

    if (editingWsId) {
      await apiPut(`/service/workstations/${editingWsId}`, payload, async () => {
        await apiGet("/service/workstations", setWorkstations);
        setMessage("Stanowisko zaktualizowane.");
        resetWsForm();
      });
    } else {
      await apiPost("/service/workstations", payload, async () => {
        await apiGet("/service/workstations", setWorkstations);
        setMessage("Stanowisko dodane.");
        resetWsForm();
      });
    }
  };

  const handleEditWs = useCallback((ws) => {
    setWsForm({
      nazwa_stanowiska: ws.nazwa_stanowiska || "",
      st: ws.st || "",
      status: ws.status || "",
      aktualne_przezbrojenie_id: ws.aktualne_przezbrojenie_id ?? "",
      aktualne_zlecenie_serwisowe_id: ws.aktualne_zlecenie_serwisowe_id ?? "",
      aktualny_typ_zlecenia: ws.aktualny_typ_zlecenia || "",
      status_changeovers: ws.status_changeovers || "",
      user_id: ws.user_id ?? "",
    });
    setEditingWsId(ws.id);
  }, []);

  const handleDeleteWs = useCallback(async (id) => {
    await apiDelete(`/service/workstations/${id}`, async () => {
      await apiGet("/service/workstations", setWorkstations);
      setMessage("Stanowisko usunięte.");
    });
  }, []);

  // ─── Log handlers ──────────────────────────────────────────────────────────
  const resetLogForm = () => {
    setLogForm({
      operator: "",
      created_at: "",
      status_service: "",
      mes_activ_service_id: "",
      mes_activ_changeover_id: "",
      status_changeover: "",
    });
    setEditingLogId(null);
  };

  const handleCreateOrUpdateLog = async (e) => {
    e.preventDefault();
    const payload = {
      operator: logForm.operator || null,
      created_at: logForm.created_at || null,
      status_service: logForm.status_service || null,
      mes_activ_service_id: toIntOrNull(logForm.mes_activ_service_id),
      mes_activ_changeover_id: toIntOrNull(logForm.mes_activ_changeover_id),
      status_changeover: logForm.status_changeover || null,
    };

    if (editingLogId) {
      await apiPut(`/service/logs/${editingLogId}`, payload, async () => {
        await apiGet("/service/logs", setLogs);
        setMessage("Log zaktualizowany.");
        resetLogForm();
      });
    } else {
      await apiPost("/service/logs", payload, async () => {
        await apiGet("/service/logs", setLogs);
        setMessage("Log dodany.");
        resetLogForm();
      });
    }
  };

  const handleEditLog = useCallback((log) => {
    setLogForm({
      operator: log.operator || "",
      created_at: log.created_at || "",
      status_service: log.status_service || "",
      mes_activ_service_id: log.mes_activ_service_id ?? "",
      mes_activ_changeover_id: log.mes_activ_changeover_id ?? "",
      status_changeover: log.status_changeover || "",
    });
    setEditingLogId(log.id);
  }, []);

  const handleDeleteLog = useCallback(async (id) => {
    await apiDelete(`/service/logs/${id}`, async () => {
      await apiGet("/service/logs", setLogs);
      setMessage("Log usunięty.");
    });
  }, []);

  const logColumns = useMemo(() => [
    { key: "id", header: "ID" },
    { key: "operator", header: "Operator" },
    { key: "created_at", header: "Data" },
    { key: "status_service", header: "Status serwis" },
    { key: "mes_activ_service_id", header: "Zlecenie serwisowe ID" },
    { key: "status_changeover", header: "Status przezbrojenia" },
    { key: "mes_activ_changeover_id", header: "Przezbrojenie ID" },
    ...(canEdit
      ? [{
          key: "_actions",
          header: "Akcje",
          render: (row) => (
            <div className="flex gap-2 justify-center">
              <button onClick={() => handleEditLog(row)} className="text-blue-400 hover:text-blue-300 text-xs">edytuj</button>
              <button onClick={() => handleDeleteLog(row.id)} className="text-red-400 hover:text-red-300 text-xs">usuń</button>
            </div>
          ),
        }]
      : []),
  ], [canEdit, handleEditLog, handleDeleteLog]);

  const wsColumns = useMemo(() => [
    { key: "id", header: "ID" },
    { key: "nazwa_stanowiska", header: "Nazwa stanowiska" },
    { key: "st", header: "ST" },
    { key: "status", header: "Status" },
    { key: "aktualny_typ_zlecenia", header: "Typ zlecenia" },
    { key: "status_changeovers", header: "Status changeovers" },
    { key: "aktualne_przezbrojenie_id", header: "Przezbrojenie ID" },
    { key: "aktualne_zlecenie_serwisowe_id", header: "Zlecenie serwisowe ID" },
    { key: "user_id", header: "User ID" },
    ...(canEdit
      ? [{
          key: "_actions",
          header: "Akcje",
          render: (row) => (
            <div className="flex gap-2 justify-center">
              <button onClick={() => handleEditWs(row)} className="text-blue-400 hover:text-blue-300 text-xs">edytuj</button>
              <button onClick={() => handleDeleteWs(row.id)} className="text-red-400 hover:text-red-300 text-xs">usuń</button>
            </div>
          ),
        }]
      : []),
  ], [canEdit, handleEditWs, handleDeleteWs]);

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: "service_workstations", label: "Stanowiska serwisowe", icon: Wrench },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-800/90 text-white">
      <Navbar
        titleOverride={
          <>
            <span className="text-white">Mould</span>
            <span className="text-emerald-400">Service 2.0</span>
          </>
        }
      />
      <div className="pt-20 px-6 pb-12">
        <div className="mx-auto grid grid-cols-[auto_1fr] gap-4">
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
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-200"
                        : "border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="space-y-6">
            {message && (
              <div className="bg-blue-500/20 border border-blue-500 text-blue-200 rounded-lg px-4 py-2 text-sm">
                {message}
                <button onClick={() => setMessage(null)} className="ml-3 underline text-xs">
                  zamknij
                </button>
              </div>
            )}

            {/* ══════════════════════════ Stanowiska serwisowe ══════════════════════════ */}
            {activeTab === "service_workstations" && (
              <section>
                <h2 className="text-lg font-bold mb-4">Stanowiska serwisowe</h2>

                {canEdit && (
                  <form onSubmit={handleCreateOrUpdateWs} className="mb-6 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Field label="Nazwa stanowiska *">
                        <input
                          className={inputClass}
                          value={wsForm.nazwa_stanowiska}
                          onChange={(e) => setWsForm(prev => ({ ...prev, nazwa_stanowiska: e.target.value }))}
                          required
                        />
                      </Field>
                      <Field label="ST">
                        <input
                          className={inputClass}
                          value={wsForm.st}
                          onChange={(e) => setWsForm(prev => ({ ...prev, st: e.target.value }))}
                        />
                      </Field>
                      <Field label="Status">
                        <input
                          className={inputClass}
                          value={wsForm.status}
                          onChange={(e) => setWsForm(prev => ({ ...prev, status: e.target.value }))}
                        />
                      </Field>
                      <Field label="Aktualny typ zlecenia">
                        <input
                          className={inputClass}
                          value={wsForm.aktualny_typ_zlecenia}
                          onChange={(e) => setWsForm(prev => ({ ...prev, aktualny_typ_zlecenia: e.target.value }))}
                        />
                      </Field>
                      <Field label="Status changeovers">
                        <input
                          className={inputClass}
                          value={wsForm.status_changeovers}
                          onChange={(e) => setWsForm(prev => ({ ...prev, status_changeovers: e.target.value }))}
                        />
                      </Field>
                      <Field label="Aktualne przezbrojenie ID">
                        <input
                          type="number"
                          className={inputClass}
                          value={wsForm.aktualne_przezbrojenie_id}
                          onChange={(e) => setWsForm(prev => ({ ...prev, aktualne_przezbrojenie_id: e.target.value }))}
                        />
                      </Field>
                      <Field label="Aktualne zlecenie serwisowe ID">
                        <input
                          type="number"
                          className={inputClass}
                          value={wsForm.aktualne_zlecenie_serwisowe_id}
                          onChange={(e) => setWsForm(prev => ({ ...prev, aktualne_zlecenie_serwisowe_id: e.target.value }))}
                        />
                      </Field>
                      <Field label="User ID">
                        <input
                          type="number"
                          className={inputClass}
                          value={wsForm.user_id}
                          onChange={(e) => setWsForm(prev => ({ ...prev, user_id: e.target.value }))}
                        />
                      </Field>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition"
                      >
                        {editingWsId ? "Zapisz zmiany" : "Dodaj stanowisko"}
                      </button>
                      {editingWsId && (
                        <button
                          type="button"
                          onClick={resetWsForm}
                          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium transition"
                        >
                          Anuluj
                        </button>
                      )}
                    </div>
                  </form>
                )}

                <DataTable
                  columns={wsColumns}
                  rows={workstations}
                  getRowKey={(row) => row.id}
                />
              </section>
            )}

            {/* ══════════════════════════ Logi ══════════════════════════ */}
            {activeTab === "logs" && (
              <section>
                <h2 className="text-lg font-bold mb-4">Logi serwisowe</h2>

                {canEdit && (
                  <form onSubmit={handleCreateOrUpdateLog} className="mb-6 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <Field label="Operator">
                        <input
                          className={inputClass}
                          value={logForm.operator}
                          onChange={(e) => setLogForm(prev => ({ ...prev, operator: e.target.value }))}
                        />
                      </Field>
                      <Field label="Data (created_at)">
                        <input
                          type="datetime-local"
                          className={inputClass}
                          value={logForm.created_at}
                          onChange={(e) => setLogForm(prev => ({ ...prev, created_at: e.target.value }))}
                        />
                      </Field>
                      <Field label="Status serwis">
                        <input
                          className={inputClass}
                          value={logForm.status_service}
                          onChange={(e) => setLogForm(prev => ({ ...prev, status_service: e.target.value }))}
                        />
                      </Field>
                      <Field label="Zlecenie serwisowe ID">
                        <input
                          type="number"
                          className={inputClass}
                          value={logForm.mes_activ_service_id}
                          onChange={(e) => setLogForm(prev => ({ ...prev, mes_activ_service_id: e.target.value }))}
                        />
                      </Field>
                      <Field label="Status przezbrojenia">
                        <input
                          className={inputClass}
                          value={logForm.status_changeover}
                          onChange={(e) => setLogForm(prev => ({ ...prev, status_changeover: e.target.value }))}
                        />
                      </Field>
                      <Field label="Przezbrojenie ID">
                        <input
                          type="number"
                          className={inputClass}
                          value={logForm.mes_activ_changeover_id}
                          onChange={(e) => setLogForm(prev => ({ ...prev, mes_activ_changeover_id: e.target.value }))}
                        />
                      </Field>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition"
                      >
                        {editingLogId ? "Zapisz zmiany" : "Dodaj log"}
                      </button>
                      {editingLogId && (
                        <button
                          type="button"
                          onClick={resetLogForm}
                          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium transition"
                        >
                          Anuluj
                        </button>
                      )}
                    </div>
                  </form>
                )}

                <div className="text-sm text-slate-400 mb-3">{logs.length} rekordów</div>
                <DataTable
                  columns={logColumns}
                  rows={logs}
                  getRowKey={(row) => row.id}
                />
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
