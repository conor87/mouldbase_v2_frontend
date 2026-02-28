import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { API_BASE } from "../config/api.js";
import MES_AddMachineModal from "./subcomponents/MES_AddMachineModal.jsx";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

const MAX_MACHINES = 4;

export default function MES_MachineTabs({ activeMachineId, refreshKey }) {
  const navigate = useNavigate();
  const [myWorkstations, setMyWorkstations] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);

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

  const fetchData = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const userId = getUserId();
    if (!userId) return;

    Promise.all([
      fetch(`${API_BASE}/production/workstations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/machine-statuses`, { headers }).then((r) => r.json()),
    ])
      .then(([wsRaw, statusesRaw]) => {
        const wsList = normalizeList(wsRaw);
        const statuses = normalizeList(statusesRaw);

        const mine = wsList.filter(
          (ws) => ws.user_id != null && Number(ws.user_id) === userId,
        );
        setMyWorkstations(mine);

        const sMap = {};
        statuses.forEach((s) => {
          sMap[s.id] = s;
        });
        setStatusMap(sMap);
      })
      .catch(() => {});
  }, [getUserId]);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, refreshKey]);

  const handleRelease = useCallback(
    (wsId, e) => {
      e.stopPropagation();
      const token = localStorage.getItem("access_token");
      fetch(`${API_BASE}/production/workstations/${wsId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: null }),
      })
        .then((r) => {
          if (!r.ok) throw new Error("Release failed");
          // Remove from local state immediately
          setMyWorkstations((prev) => {
            const remaining = prev.filter((ws) => ws.id !== wsId);
            // If we released the active tab, navigate to first remaining
            if (String(wsId) === String(activeMachineId) && remaining.length > 0) {
              const target = remaining[0];
              const dest = target.current_operation_id
                ? `/mes/production/machine/${target.id}/panel/${target.current_operation_id}`
                : `/mes/production/machine/${target.id}`;
              navigate(dest);
            } else if (remaining.length === 0) {
              navigate("/mes/production");
            }
            return remaining;
          });
        })
        .catch(() => alert("Nie udało się zwolnić maszyny."));
    },
    [activeMachineId, navigate],
  );

  const handleTabClick = useCallback(
    (ws) => {
      if (String(ws.id) === String(activeMachineId)) return;
      const dest = ws.current_operation_id
        ? `/mes/production/machine/${ws.id}/panel/${ws.current_operation_id}`
        : `/mes/production/machine/${ws.id}`;
      navigate(dest);
    },
    [activeMachineId, navigate],
  );

  const handleMachineAdded = useCallback(() => {
    setShowAddModal(false);
    fetchData();
  }, [fetchData]);

  // Don't render if no claimed machines
  if (myWorkstations.length === 0) return null;

  const getStatusColor = (ws) => {
    if (!ws.status_id || !statusMap[ws.status_id]) return "bg-slate-500";
    const color = statusMap[ws.status_id].color || "slate";
    return `bg-${color}-500`;
  };

  return (
    <>
      <div className="flex items-center justify-center gap-1 py-1.5 mb-3">
        {myWorkstations.map((ws) => {
          const isActive = String(ws.id) === String(activeMachineId);
          return (
            <button
              key={ws.id}
              onClick={() => handleTabClick(ws)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-base transition
                ${isActive
                  ? "bg-blue-600/30 text-white border border-blue-500/50"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${getStatusColor(ws)}`} />
              <span className="truncate max-w-[120px]">{ws.name}</span>
              <span
                role="button"
                onClick={(e) => handleRelease(ws.id, e)}
                className="ml-1 p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 transition"
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          );
        })}

        {myWorkstations.length < MAX_MACHINES && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-white/5 transition"
            title="Dodaj maszynę"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {showAddModal && (
        <MES_AddMachineModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleMachineAdded}
          myWorkstationIds={myWorkstations.map((ws) => ws.id)}
        />
      )}
    </>
  );
}
