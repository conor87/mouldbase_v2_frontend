import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";

export default function MES_Machines() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [myCount, setMyCount] = useState(0);
  const [claiming, setClaiming] = useState(null);

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

  const fetchMachines = useCallback(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/production/workstations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results ?? data.data ?? [];
        const userId = getUserId();
        const filtered = list.filter((w) => String(w.machine_group_id) === groupId);
        setMachines(filtered);
        setMyCount(list.filter((w) => w.user_id != null && Number(w.user_id) === userId).length);
        if (filtered.length > 0 && filtered[0].machine_group) {
          setGroupName(filtered[0].machine_group.name);
        }
      })
      .catch(() => setMachines([]))
      .finally(() => setLoading(false));
  }, [groupId, getUserId]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const handleTakeover = (ws) => {
    const token = localStorage.getItem("access_token");
    const userId = getUserId();
    if (!userId) return;
    setClaiming(ws.id);

    fetch(`${API_BASE}/production/workstations/${ws.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Takeover failed");
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
        navigate(`/mes/production/machine/${updated.id}`);
      })
      .catch(() => alert("Nie udało się przejąć maszyny."))
      .finally(() => setClaiming(null));
  };

  const userId = getUserId();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-6 pt-14">
      <MES_UserBar />
      <button
        onClick={() => navigate("/mes/production")}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót
      </button>
      <h1 className="text-2xl font-bold mb-6">
        {groupName ? `Maszyny — ${groupName}` : "Maszyny"}
      </h1>

      {loading ? (
        <p className="text-slate-400">Ładowanie…</p>
      ) : machines.length === 0 ? (
        <p className="text-slate-400">Brak maszyn w tej grupie.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {machines.map((m) => {
            const isMine = m.user_id != null && Number(m.user_id) === userId;
            const isOccupied = m.user_id != null && !isMine;
            const operatorName = m.user_name || m.username || null;
            const canClaim = !isMine && !isOccupied && myCount < 4;

            return (
              <div
                key={m.id}
                className={`rounded-2xl border p-6 text-left transition
                  ${isMine
                    ? "border-blue-500/30 bg-blue-500/10"
                    : "border-white/10 bg-white/5"
                  }`}
              >
                <button
                  onClick={() => navigate(`/mes/production/machine/${m.id}`)}
                  className="w-full text-left hover:opacity-80 transition"
                >
                  <h2 className="text-lg font-semibold">{m.name}</h2>
                </button>

                {isMine && (
                  <p className="text-xs text-blue-400 mt-1">Twoja maszyna</p>
                )}
                {isOccupied && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Zajęta{operatorName ? ` — ${operatorName}` : ""}
                  </p>
                )}
                {!isMine && !isOccupied && (
                  <p className="text-xs text-green-400 mt-1">Wolna</p>
                )}

                {canClaim && (
                  <button
                    onClick={() => handleTakeover(m)}
                    disabled={claiming === m.id}
                    className="mt-3 w-full px-3 py-1.5 rounded-lg text-sm bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-500/30 text-cyan-300 transition disabled:opacity-50"
                  >
                    {claiming === m.id ? "Przejmowanie…" : "Przejmij"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
