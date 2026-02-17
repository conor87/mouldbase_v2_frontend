import { useNavigate } from "react-router-dom";
import { Factory, Wrench } from "lucide-react";

const tiles = [
  {
    label: "Produkcja form",
    icon: Factory,
    path: "/mes/production",
    description: "Zarządzanie produkcją na maszynach",
  },
  {
    label: "Serwis",
    icon: Wrench,
    path: "/mes/service",
    description: "Serwis i utrzymanie ruchu",
  },
];

export default function MES() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-6">
      <h1 className="text-2xl font-bold mb-6">MES</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
        {tiles.map((tile) => (
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
