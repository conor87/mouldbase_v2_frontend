import { useNavigate } from "react-router-dom";
import { Cpu, Database, ShieldCheck } from "lucide-react";
import MES_UserBar from "./MES_UserBar.jsx";

const modules = [
  {
    title: "Formy wtryskowe",
    description: "Baza form, TPM, kalendarz i zarządzanie kartoteką form.",
    path: "/moulds",
    icon: Database,
  },
  {
    title: "MES",
    description: "Rejestracja czasu pracy - Produkcji, serwisu, przezbrojeń oraz aktualny status stanowisk.",
    path: "/mes",
    icon: Cpu,
  },
  {
    title: "Admin Panel",
    description: "Administracja produkcją, serwisem, drzewem zleceń i analityką.",
    path: "/production_admin",
    icon: ShieldCheck,
  },
];

export default function StartPage() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen px-8 pb-10 pt-16 text-white">
      <MES_UserBar left={0} />
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cyan-400">ToolShop 2.0</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            Wybierz obszar pracy.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {modules.map((module) => (
            <button
              key={module.path}
              type="button"
              onClick={() => navigate(module.path)}
              className="group flex min-h-[260px] flex-col rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition hover:bg-white/10"
            >
              <module.icon className="mx-auto mb-6 h-12 w-12 text-cyan-400 transition group-hover:text-cyan-300" />
              <h2 className="text-center text-2xl font-bold">{module.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{module.description}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
