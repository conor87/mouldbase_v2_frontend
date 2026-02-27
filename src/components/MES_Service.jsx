import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";

export default function MES_Service() {
  const navigate = useNavigate();
  const [workstations, setWorkstations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/service/workstations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results ?? data.data ?? [];
        setWorkstations(list);
      })
      .catch(() => setWorkstations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-6 pt-14">
      <MES_UserBar />
      <button
        onClick={() => navigate("/mes")}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót
      </button>
      <h1 className="text-2xl font-bold mb-6">Serwis — Stanowiska</h1>

      {loading ? (
        <p className="text-slate-400">Ładowanie…</p>
      ) : workstations.length === 0 ? (
        <p className="text-slate-400">Brak stanowisk serwisowych.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {workstations.map((ws) => (
            <button
              key={ws.id}
              onClick={() =>
                ws.user_id && ws.st
                  ? navigate(`/mes/service/workstation/${ws.id}/panel/${ws.st}`)
                  : navigate(`/mes/service/workstation/${ws.id}`)
              }
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left
                         hover:bg-white/10 transition cursor-pointer"
            >
              <h2 className="text-lg font-semibold">{ws.nazwa_stanowiska}</h2>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}