import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft } from "lucide-react";

export default function MES_Machines() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/production/workstations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results ?? data.data ?? [];
        const filtered = list.filter((w) => String(w.machine_group_id) === groupId);
        setMachines(filtered);
        if (filtered.length > 0 && filtered[0].machine_group) {
          setGroupName(filtered[0].machine_group.name);
        }
      })
      .catch(() => setMachines([]))
      .finally(() => setLoading(false));
  }, [groupId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-6">
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
          {machines.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/mes/production/machine/${m.id}`)}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left
                         hover:bg-white/10 transition cursor-pointer"
            >
              <h2 className="text-lg font-semibold">{m.name}</h2>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
