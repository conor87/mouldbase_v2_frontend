import { useNavigate } from "react-router-dom";
import { ChevronLeft, Construction } from "lucide-react";

export default function MES_Service() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] p-6">
      <button
        onClick={() => navigate("/mes")}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Powrót
      </button>
      <div className="flex flex-col items-center justify-center mt-20 text-slate-400">
        <Construction className="w-16 h-16 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Serwis</h1>
        <p>Moduł w budowie</p>
      </div>
    </div>
  );
}
