import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ChevronLeft } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

// Map status_changeovers label → color
const STATUS_COLOR_MAP = {
  "Modyfikacja":                "blue",
  "Fakturowanie":               "cyan",
  "Przygot. do z kooper.":      "emerald",
  "Przegląd / Remont":          "emerald",
  "Naprawa TPM":                "yellow",
  "Spawanie":                   "slate",
  "Koniec działań":             "slate",
  "Przezbrajanie":              "yellow",
  "Przerwane przezbrajanie":    "orange",
  // Awarie
  "Układ grzania":              "red",
  "Pow. formujące":             "red",
  "Obce ciało w ukł. dolot.":   "red",
  "Układ chłodzenia":           "red",
  "Układ powietrzny":           "red",
  "Układ hydrauliczny":         "red",
  "Układ mechaniczny":          "red",
  "Pow. zamykania i odpowietrz.": "red",
};

// Build Tailwind classes from a color name
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
function buildColorClasses(colorName) {
  const c = colorName || "slate";
  return {
    bg: `bg-${c}-600/20`,
    border: `border-${c}-500`,
    text: `text-${c}-400`,
    dot: `bg-${c}-500`,
  };
}

export default function MES_Service_Dashboard() {
  const navigate = useNavigate();

  const [workstations, setWorkstations] = useState([]);
  const [users, setUsers] = useState([]);
  const [moulds, setMoulds] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/service/workstations`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/production/users`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/moulds`, { headers }).then((r) => r.json()),
    ])
      .then(([wsRaw, usersRaw, mouldsRaw]) => {
        setWorkstations(normalizeList(wsRaw));
        setUsers(normalizeList(usersRaw));
        setMoulds(normalizeList(mouldsRaw));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  const mouldMap = useMemo(
    () => Object.fromEntries(moulds.map((m) => [m.mould_number, m])),
    [moulds],
  );

  const filteredWorkstations = useMemo(() => {
    if (selectedFilter === "active") {
      return workstations.filter((ws) => ws.user_id);
    }
    return workstations;
  }, [workstations, selectedFilter]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] p-4 sm:p-6 pt-14 max-w-7xl mx-auto w-full">
      <MES_UserBar />
      <button
        onClick={() => navigate("/mes")}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4 self-start"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót
      </button>
      <h1 className="text-2xl font-bold mb-6 text-center">Dashboard serwisu</h1>

      {/* Filter bar */}
      <div className="flex justify-center mb-6">
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-sm min-w-[220px]"
        >
          <option value="active">Aktywne stanowiska</option>
          <option value="">Wszystkie stanowiska</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center">Ładowanie…</p>
      ) : filteredWorkstations.length === 0 ? (
        <p className="text-slate-400 text-center">Brak stanowisk serwisowych.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredWorkstations.map((ws) => {
            const statusLabel = ws.status_changeovers || null;
            const colorName = statusLabel ? STATUS_COLOR_MAP[statusLabel] : null;
            const colors = buildColorClasses(colorName);

            return (
              <div
                key={ws.id}
                className={`rounded-2xl border p-4 transition-colors ${colors.bg} ${colors.border}`}
              >
                {/* Workstation name */}
                <h2
                  className="text-lg font-bold mb-1 cursor-pointer hover:text-blue-400 transition text-center"
                  onClick={() =>
                    ws.st
                      ? navigate(`/mes/service/workstation/${ws.id}/panel/${ws.st}`)
                      : navigate(`/mes/service/workstation/${ws.id}`)
                  }
                >
                  {ws.nazwa_stanowiska}
                </h2>

                {/* Status badge */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    {statusLabel || "Brak statusu"}
                  </span>
                </div>

                {/* Details grid */}
                <div className="text-sm grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 mb-2">
                  {(() => {
                    const m = ws.st ? mouldMap[ws.st] : null;
                    return m ? (
                      <>
                        <span className="text-slate-500">Forma:</span>
                        <span className="text-slate-300">{m.mould_number}</span>
                        <span className="text-slate-500">Wyrób:</span>
                        <span className="text-slate-300">{m.product || "—"}</span>
                      </>
                    ) : (
                      <span className="text-slate-500 col-span-2">Brak formy</span>
                    );
                  })()}
                  {ws.user_id ? (
                    <>
                      <span className="text-slate-500">Operator:</span>
                      <span className="text-slate-300">{userMap[ws.user_id]?.username || ws.user_id}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500">Operator:</span>
                      <span className="text-slate-500">—</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
