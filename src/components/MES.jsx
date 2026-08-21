import { useNavigate } from "react-router-dom";
import { Calendar, Factory, Wrench } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";

const tiles = [
  {
    label: "Produkcja form",
    icon: Factory,
    path: "/mes/production",
    description: "Zarządzanie produkcją na maszynach",
  },
  {
    label: "Kalendarz produkcji",
    icon: Calendar,
    path: "/mes/production/calendar",
    description: "Plan operacji na stanowiskach produkcyjnych",
    adminOnly: true,
  },
  {
    label: "Serwis",
    icon: Wrench,
    path: "/mes/service",
    description: "Serwis i utrzymanie ruchu",
  },
];

const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const isAdminDnOrSuperadmin = () => {
  const token = localStorage.getItem("access_token");
  const payload = token ? parseJwt(token) : null;
  const role = payload?.role ?? localStorage.getItem("role");
  return role === "admindn" || role === "superadmin";
};

export default function MES() {
  const navigate = useNavigate();
  const visibleTiles = tiles.filter((tile) => !tile.adminOnly || isAdminDnOrSuperadmin());

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-6 pt-14">
      <MES_UserBar />
      <h1 className="text-2xl font-bold mb-6">MES</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
        {visibleTiles.map((tile) => (
          <button
            key={tile.path}
            onClick={() => navigate(tile.path)}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left
                       hover:bg-white/10 transition cursor-pointer group"
          >
            <tile.icon className="w-10 h-10 mb-3 text-blue-400 group-hover:text-blue-300 transition" />
            <h2 className="text-lg font-semibold">{tile.label}</h2>
            <p className="text-sm text-slate-400 mt-1">{tile.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
