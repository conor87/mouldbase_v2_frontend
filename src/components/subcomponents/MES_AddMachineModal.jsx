import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Search } from "lucide-react";
import { API_BASE } from "../../config/api.js";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

export default function MES_AddMachineModal({ onClose, onAdded, myWorkstationIds }) {
  const navigate = useNavigate();
  const [workstations, setWorkstations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/production/workstations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/machine-groups`, { headers }).then((r) => r.json()),
    ])
      .then(([wsRaw, groupsRaw]) => {
        const wsList = normalizeList(wsRaw);
        const gList = normalizeList(groupsRaw);
        // Exclude workstations already claimed by me
        setWorkstations(wsList.filter((ws) => !myWorkstationIds.includes(ws.id)));
        setGroups(gList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [myWorkstationIds]);

  const handleClaim = (ws) => {
    setClaiming(true);
    const token = localStorage.getItem("access_token");
    let userId = localStorage.getItem("user_id");
    if (!userId) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        userId = decoded.id ?? decoded.user_id ?? decoded.sub ?? null;
      } catch { /* ignore */ }
    }
    userId = userId ? parseInt(userId, 10) : null;
    if (!userId) { setClaiming(false); return; }

    fetch(`${API_BASE}/production/workstations/${ws.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Claim failed");
        return r.json();
      })
      .then((updated) => {
        if (updated.current_operation_id) {
          const now = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; })();
          fetch(`${API_BASE}/production/logs`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              operation_id: updated.current_operation_id,
              status_id: updated.status_id || null,
              workstation_id: updated.id,
              user_id: userId,
              note: "Przejęcie maszyny",
              created_at: now,
            }),
          }).catch(() => {});
        }
        onAdded();
        const dest = updated.current_operation_id
          ? `/mes/production/machine/${updated.id}/panel/${updated.current_operation_id}`
          : `/mes/production/machine/${updated.id}`;
        navigate(dest);
      })
      .catch(() => alert("Nie udało się przejąć maszyny."))
      .finally(() => setClaiming(false));
  };

  const filtered = workstations.filter((ws) => {
    if (selectedGroup && String(ws.machine_group_id) !== selectedGroup) return false;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      if (!ws.name?.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] rounded-2xl bg-slate-900 border border-white/10 p-6 text-white flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-cyan-300">Dodaj maszynę</h2>
          <button
            onClick={onClose}
            disabled={claiming}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          >
            <option value="">Wszystkie grupy</option>
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Szukaj maszyny…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Machine grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-slate-400 text-center py-8">Ładowanie…</p>
          ) : filtered.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Brak dostępnych maszyn.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((ws) => {
                const isFree = ws.user_id == null;
                const operatorName = ws.user_name || ws.username || null;

                return (
                  <button
                    key={ws.id}
                    onClick={() => isFree && handleClaim(ws)}
                    disabled={claiming || !isFree}
                    className={`rounded-xl border p-4 text-left transition
                      ${isFree
                        ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10 cursor-pointer"
                        : "border-yellow-500/30 bg-yellow-500/5 opacity-70 cursor-not-allowed"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{ws.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isFree
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {isFree ? "Wolna" : `Zajęta${operatorName ? ` — ${operatorName}` : ""}`}
                      </span>
                    </div>
                    {ws.machine_group && (
                      <p className="text-xs text-slate-500 mt-1">{ws.machine_group.name}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
