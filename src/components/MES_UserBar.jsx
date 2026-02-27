import { LogOut, User } from "lucide-react";

export default function MES_UserBar() {
  const username = localStorage.getItem("username") || "—";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    window.location.href = "/login";
  };

  return (
    <div className="fixed top-0 left-16 right-0 z-50 flex items-center justify-between px-4 py-2 bg-slate-800/60 backdrop-blur-sm border-b border-slate-700/50">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <User className="w-4 h-4" />
        <span>{username}</span>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
      >
        <LogOut className="w-4 h-4" />
        Wyloguj
      </button>
    </div>
  );
}
