import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api.js";
import {
  ArrowLeftRight,
  BarChart3,
  Calendar,
  ClipboardList,
  Cpu,
  Database,
  Factory,
  Hammer,
  Home,
  LayoutDashboard,
  ListTree,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";

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

const moduleItems = [
  { key: "moulds", to: "/moulds", label: "Formy wtryskowe", icon: Database },
  { key: "mes", to: "/mes", label: "MES", icon: Cpu, mesOnly: true },
  { key: "admin", to: "/production_admin", label: "Admin Panel", icon: ShieldCheck, adminOnly: true },
];

const navItems = [
  { module: "moulds", to: "/dashboard", label: "Dashboard", icon: BarChart3, superAdminOnly: true },
  { module: "moulds", to: "/moulds", label: "Formy", icon: Home, end: true },
  { module: "moulds", to: "/kalendarz", label: "Kalendarz", icon: Calendar },
  { module: "moulds", to: "/tpm", label: "TPM", icon: Wrench },
  { module: "moulds", to: "/moulds-admin", label: "Dodaj formę", icon: Settings, adminOnly: true },

  { module: "mes", to: "/mes", label: "MES", icon: Cpu, mesOnly: true, end: true, smartMes: true },
  { module: "mes", to: "/mes/production/dashboard", label: "Dashboard produkcji", icon: LayoutDashboard, mesOnly: true },
  { module: "mes", to: "/mes/service/dashboard", label: "Dashboard serwisu", icon: LayoutDashboard, mesOnly: true },
  { module: "mes", to: "/changeovers", label: "Przezbrojenia", icon: ArrowLeftRight, mesOnly: true },
  { module: "mes", to: "/current_sv", label: "Maszyny", icon: Factory, mesOnly: true },
  { module: "mes", to: "/superadmin", label: "Settings", icon: Settings, superAdminOnly: true },

  { module: "admin", to: "/production_admin", label: "Production Admin", icon: ShieldCheck, adminOnly: true },
  { module: "admin", to: "/service_admin", label: "Service Admin", icon: Hammer, adminOnly: true },
  { module: "admin", to: "/orders-tree", label: "Tree", icon: ListTree, adminOnly: true },
  { module: "admin", to: "/analytics", label: "Analityka", icon: ClipboardList, adminOnly: true },
];

const baseItemClasses =
  "w-10 h-10 rounded-xl flex items-center justify-center transition border border-transparent";
const idleClasses = "text-slate-300 hover:text-white hover:bg-slate-800/70";
const activeClasses = "bg-blue-500/20 border-blue-500 text-blue-200";
const moduleIdleClasses = "text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700/70";
const moduleActiveClasses = activeClasses;

const moduleForPath = (pathname) => {
  if (
    pathname.startsWith("/mes") ||
    pathname.startsWith("/changeovers") ||
    pathname.startsWith("/current_sv") ||
    pathname.startsWith("/superadmin")
  ) {
    return "mes";
  }
  if (
    pathname.startsWith("/production_admin") ||
    pathname.startsWith("/service_admin") ||
    pathname.startsWith("/orders-tree") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/admin-panel")
  ) {
    return "admin";
  }
  return "moulds";
};

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
  const location = useLocation();
  const activeModule = moduleForPath(location.pathname);
  const canAddMould = isAdminFromToken();
  const isSuperAdmin = isSuperAdminFromToken();
  const canMes = isMesUser();

  const isAllowed = (item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.adminOnly && !canAddMould) return false;
    if (item.mesOnly && !canMes) return false;
    return true;
  };

  const items = navItems.filter((item) => item.module === activeModule && isAllowed(item));
  const visibleModules = moduleItems.filter(isAllowed);

  const handleMesClick = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/mes");
      return;
    }
    let userId = localStorage.getItem("user_id");
    if (!userId && token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        userId = decoded.id ?? decoded.user_id ?? decoded.sub ?? null;
        if (userId != null) localStorage.setItem("user_id", String(userId));
      } catch {
        /* ignore */
      }
    }
    userId = userId ? parseInt(userId, 10) : null;
    if (!userId) {
      navigate("/mes");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [prodRes, svcRes] = await Promise.all([
        fetch(`${API_BASE}/production/workstations`, { headers }).then((r) => r.json()),
        fetch(`${API_BASE}/service/workstations`, { headers }).then((r) => r.json()),
      ]);
      const prodList = normalizeList(prodRes);
      const svcList = normalizeList(svcRes);

      const prodAll = prodList.filter((ws) => ws.user_id != null && Number(ws.user_id) === userId);
      if (prodAll.length > 0) {
        const prodWs = prodAll.find((ws) => ws.current_operation_id) || prodAll[0];
        const dest = prodWs.current_operation_id
          ? `/mes/production/machine/${prodWs.id}/panel/${prodWs.current_operation_id}`
          : `/mes/production/machine/${prodWs.id}`;
        navigate(dest);
        return;
      }
      const svcWs = svcList.find((ws) => ws.user_id != null && Number(ws.user_id) === userId);
      if (svcWs) {
        if (svcWs.aktualne_przezbrojenie_id) {
          navigate(`/mes/service/workstation/${svcWs.id}/changeover/${svcWs.aktualne_przezbrojenie_id}`);
        } else if (svcWs.st) {
          navigate(`/mes/service/workstation/${svcWs.id}/panel/${svcWs.st}`);
        } else {
          navigate(`/mes/service/workstation/${svcWs.id}`);
        }
        return;
      }
      navigate("/mes");
    } catch (err) {
      console.error("[MES Nav] error:", err);
      navigate("/mes");
    }
  };

  return (
    <>
      <aside className="fixed left-0 top-0 z-[70] h-full w-10 border-r border-slate-700/80 bg-slate-800 backdrop-blur-md">
        <div className="grid h-full grid-rows-3">
          {visibleModules.map((item) => {
            const active = item.key === activeModule;
            return (
              <NavLink
                key={item.key}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                className={`${active ? moduleActiveClasses : moduleIdleClasses} flex items-center justify-center border-b border-slate-800/80 transition last:border-b-0`}
              >
                <item.icon className="h-4 w-4" />
              </NavLink>
            );
          })}
        </div>
      </aside>

      <aside className="fixed left-10 top-0 z-[60] h-full w-12 border-r border-slate-800/80 bg-slate-800/90 opacity-100 backdrop-blur-md">
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
                <item.icon className="h-5 w-5" />
              </button>
            ) : (
              <NavItem key={item.to} {...item} />
            )
          )}
        </div>
      </aside>
    </>
  );
}
