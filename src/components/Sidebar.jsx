import React from "react";
import { NavLink } from "react-router-dom";
import { ArrowLeftRight, BarChart3, Calendar, Home, Settings, Wrench } from "lucide-react";

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

const isSuperAdminFromToken = () => getRoleFromToken() === "superadmin";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, superAdminOnly: true },
  { to: "/", label: "Moulds", icon: Home, end: true },
  { to: "/changeovers", label: "Przezbrojenia", icon: ArrowLeftRight },
  { to: "/kalendarz", label: "Kalendarz", icon: Calendar },
  { to: "/tpm", label: "TPM", icon: Wrench },
  { to: "/moulds-admin", label: "Dodaj forme", icon: Settings, adminOnly: true },
];

const baseItemClasses =
  "w-11 h-11 rounded-2xl flex items-center justify-center transition border border-transparent";
const idleClasses = "text-slate-300 hover:text-white hover:bg-slate-800/70";
const activeClasses = "bg-blue-500/90 text-white shadow-lg shadow-blue-500/20";

function NavItem({ to, label, icon: Icon, end }) {
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
      <Icon className="w-5 h-5" />
    </NavLink>
  );
}

export default function Sidebar() {
  const canAddMould = isAdminFromToken();
  const isSuperAdmin = isSuperAdminFromToken();
  const items = navItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.adminOnly && !canAddMould) return false;
    return true;
  });

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-slate-800/90 border-r border-slate-800/80 backdrop-blur-md z-[60] opacity-100">
      <div className="flex h-full flex-col items-center gap-3 py-4">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </aside>
  );
}
