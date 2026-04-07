import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import { ArrowLeftRight, BarChart3, Calendar, ClipboardList, Cpu, Factory, Hammer, Home, LayoutDashboard, ListTree, Settings, ShieldCheck, Wrench } from "lucide-react";

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

const getRoleFromToken = () => {
  const token = localStorage.getItem("access_token");
  const payload = token ? parseJwt(token) : null;
  return payload?.role ?? null;
};

const isAdminFromToken = () => {
  const role = getRoleFromToken();
  return role === "admindn" || role === "superadmin";
};

const isMesUser = () => {
  const role = getRoleFromToken();
  return role === "userdn" || role === "admindn" || role === "superadmin";
};

const isSuperAdminFromToken = () => getRoleFromToken() === "superadmin";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, superAdminOnly: true },
  { to: "/", label: "Moulds", icon: Home, end: true },
  { to: "/changeovers", label: "Przezbrojenia", icon: ArrowLeftRight },
  { to: "/current_sv", label: "Maszyny", icon: Factory },
  { to: "/kalendarz", label: "Kalendarz", icon: Calendar },
  { to: "/tpm", label: "TPM", icon: Wrench },
  { to: "/moulds-admin", label: "Dodaj forme", icon: Settings, adminOnly: true },
  { to: "/mes/production/dashboard", label: "Dashboard produkcji", icon: LayoutDashboard, mesOnly: true },
  { to: "/mes/service/dashboard", label: "Dashboard serwisu", icon: LayoutDashboard, mesOnly: true },
  { to: "/mes", label: "MES", icon: Cpu, mesOnly: true, end: true, smartMes: true },
  { to: "/orders-tree", label: "Tree", icon: ListTree, mesOnly: true },
  { to: "/production_admin", label: "Production Admin", icon: ShieldCheck, adminOnly: true },
  { to: "/service_admin", label: "Service Admin", icon: Hammer, adminOnly: true },
  { to: "/analytics", label: "Analityka", icon: ClipboardList, adminOnly: true },
  
];

const baseItemClasses =
  "w-11 h-11 rounded-2xl flex items-center justify-center transition border border-transparent";
const idleClasses = "text-slate-300 hover:text-white hover:bg-slate-800/70";
const activeClasses = "bg-blue-500/90 text-white shadow-lg shadow-blue-500/20";

function NavItem({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        `${baseItemClasses} ${isActive ? activeClasses : idleClasses}`
      }
    >
      {React.createElement(icon, { className: "w-5 h-5" })}
    </NavLink>
  );
}

const normalizeList = (data) =>
  Array.isArray(data) ? data : data?.results ?? data?.data ?? [];

export default function Sidebar() {
  const navigate = useNavigate();
  const canAddMould = isAdminFromToken();
  const isSuperAdmin = isSuperAdminFromToken();
  const canMes = isMesUser();
  const items = navItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.adminOnly && !canAddMould) return false;
    if (item.mesOnly && !canMes) return false;
    return true;
  });

  const handleMesClick = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) { navigate("/mes"); return; }
    let userId = localStorage.getItem("user_id");
    if (!userId && token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        userId = decoded.id ?? decoded.user_id ?? decoded.sub ?? null;
        if (userId != null) localStorage.setItem("user_id", String(userId));
      } catch { /* ignore */ }
    }
    userId = userId ? parseInt(userId, 10) : null;
    if (!userId) { navigate("/mes"); return; }
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [prodRes, svcRes] = await Promise.all([
        fetch(`${API_BASE}/production/workstations`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/service/workstations`, { headers }).then((r) => r.json()),
      ]);
      const prodList = normalizeList(prodRes);
      const svcList = normalizeList(svcRes);

      // Match by user_id — compare both as numbers; prefer workstation with active operation
      const prodAll = prodList.filter((ws) => ws.user_id != null && Number(ws.user_id) === userId);
      if (prodAll.length > 0) {
        const prodWs = prodAll.find((ws) => ws.current_operation_id) || prodAll[0];
        const dest = prodWs.current_operation_id
          ? `/mes/production/machine/${prodWs.id}/panel/${prodWs.current_operation_id}`
          : `/mes/production/machine/${prodWs.id}`;
        console.log(`[MES Nav] prod ws=${prodWs.id} → ${dest}`);
        navigate(dest);
        return;
      }
      const svcWs = svcList.find((ws) => ws.user_id != null && Number(ws.user_id) === userId);
      if (svcWs) {
        let dest;
        if (svcWs.aktualne_przezbrojenie_id) {
          dest = `/mes/service/workstation/${svcWs.id}/changeover/${svcWs.aktualne_przezbrojenie_id}`;
        } else if (svcWs.st) {
          dest = `/mes/service/workstation/${svcWs.id}/panel/${svcWs.st}`;
        } else {
          dest = `/mes/service/workstation/${svcWs.id}`;
        }
        console.log(`[MES Nav] svc ws=${svcWs.id} → ${dest}`);
        navigate(dest);
        return;
      }
      console.log("[MES Nav] no match, userId:", userId);
      navigate("/mes");
    } catch (err) {
      console.error("[MES Nav] error:", err);
      navigate("/mes");
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-slate-800/90 border-r border-slate-800/80 backdrop-blur-md z-[60] opacity-100">
      <div className="flex h-full flex-col items-center gap-3 py-4">
        {items.map((item) =>
          item.smartMes ? (
            <button
              key={item.to}
              onClick={handleMesClick}
              title={item.label}
              aria-label={item.label}
              className={`${baseItemClasses} ${idleClasses}`}
            >
              <item.icon className="w-5 h-5" />
            </button>
          ) : (
            <NavItem key={item.to} {...item} />
          )
        )}
      </div>
    </aside>
  );
}
