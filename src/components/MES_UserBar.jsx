import { LogOut, User } from "lucide-react";
import { API_BASE } from "../config/api.js";

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

export default function MES_UserBar({ left = 64 }) {
  const username = localStorage.getItem("username") || "—";

  const handleLogout = async () => {
    const token = localStorage.getItem("access_token");
    let userId = localStorage.getItem("user_id");
    if (!userId && token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        userId = decoded.id ?? decoded.user_id ?? decoded.sub ?? null;
      } catch { /* ignore */ }
    }
    userId = userId ? parseInt(userId, 10) : null;

    // Release all production workstations assigned to this user
    if (token && userId) {
      try {
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        const res = await fetch(`${API_BASE}/production/workstations`, { headers });
        const wsList = normalizeList(await res.json());
        const mine = wsList.filter((ws) => ws.user_id != null && Number(ws.user_id) === userId);
        const now = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; })();
        await Promise.all(
          mine.flatMap((ws) => {
            const ops = [];
            // Create logout log if workstation has active operation
            if (ws.current_operation_id) {
              ops.push(
                fetch(`${API_BASE}/production/logs`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    operation_id: ws.current_operation_id,
                    status_id: ws.status_id || null,
                    workstation_id: ws.id,
                    user_id: userId,
                    note: "Wylogowanie",
                    created_at: now,
                  }),
                }).catch(() => {}),
              );
            }
            // Release workstation — clear operator, operation and status
            ops.push(
              fetch(`${API_BASE}/production/workstations/${ws.id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                  user_id: null,
                  current_operation_id: null,
                  current_task_id: null,
                  status_id: null,
                }),
              }).catch(() => {}),
            );
            return ops;
          }),
        );
      } catch { /* ignore — proceed with logout */ }

      // Release all service workstations assigned to this user
      try {
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        const svcRes = await fetch(`${API_BASE}/service/workstations`, { headers });
        const svcList = normalizeList(await svcRes.json());
        const mySvc = svcList.filter((ws) => ws.user_id != null && Number(ws.user_id) === userId);
        const operator = localStorage.getItem("username") || null;
        const now = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; })();
        await Promise.all(
          mySvc.flatMap((ws) => {
            const ops = [];
            // Create service logout log
            ops.push(
              fetch(`${API_BASE}/service/logs`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  operator,
                  created_at: now,
                  status_service: "Wylogowanie",
                  mes_activ_service_id: ws.aktualne_zlecenie_serwisowe_id || null,
                  mes_activ_changeover_id: ws.aktualne_przezbrojenie_id || null,
                  status_changeover: null,
                }),
              }).catch(() => {}),
            );
            // Release service workstation
            ops.push(
              fetch(`${API_BASE}/service/workstations/${ws.id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                  user_id: null,
                  status_changeovers: null,
                  st: null,
                  aktualne_przezbrojenie_id: null,
                  aktualne_zlecenie_serwisowe_id: null,
                  aktualny_typ_zlecenia: null,
                }),
              }).catch(() => {}),
            );
            return ops;
          }),
        );
      } catch { /* ignore — proceed with logout */ }
    }

    // Log session logout
    if (token && userId) {
      const now = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; })();
      try {
        const res = await fetch(`${API_BASE}/mes-session/logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ user_id: userId, username: localStorage.getItem("username") || "", action: "logout", created_at: now }),
        });
        await res.text();
      } catch { /* ignore */ }
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    window.location.href = "/login";
  };

  return (
    <div
      className="fixed top-0 right-0 z-50 flex items-center justify-end px-4 py-2 bg-slate-800/60 backdrop-blur-sm border-b border-slate-700/50"
      style={{ left }}
    >
      <div className="flex items-center gap-3">
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
    </div>
  );
}
