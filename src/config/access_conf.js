// src/config/access_conf.js
// Konfiguracja dostępu — moduły i role

/**
 * Hierarchia ról (od najniższej):
 *   user → userdn → admin → admindn → superadmin
 *
 * Legenda:
 *   allowedRoles — lista ról mających dostęp do modułu
 *   "all"        — każdy zalogowany użytkownik
 */

export const ROLES = ["user", "userdn", "admin", "admindn", "superadmin"];

export const ACCESS_TABLE = [
  // ──────────────── Moduły publiczne (każdy zalogowany) ────────────────
  {
    module: "Moulds",
    path: "/",
    allowedRoles: "all",
    description: "Lista form wtryskowych",
  },
  {
    module: "Mould Details",
    path: "/moulds/:mould_number",
    allowedRoles: "all",
    description: "Szczegóły formy",
  },
  {
    module: "Przezbrojenia",
    path: "/changeovers",
    allowedRoles: "all",
    description: "Zarządzanie przezbrojeniami",
  },
  {
    module: "Maszyny",
    path: "/current_sv",
    allowedRoles: "all",
    description: "Podgląd maszyn",
  },
  {
    module: "TPM",
    path: "/tpm",
    allowedRoles: "all",
    description: "Total Productive Maintenance",
  },
  {
    module: "Przewodniki",
    path: "/open-service-guides",
    allowedRoles: "all",
    description: "Formy z otwartymi przewodnikami serwisowania",
  },
  {
    module: "Kalendarz",
    path: "/kalendarz",
    allowedRoles: "all",
    description: "Kalendarz produkcji",
  },

  // ──────────────── MES (userdn+) ────────────────
  {
    module: "MES",
    path: "/mes",
    allowedRoles: ["userdn", "admindn", "superadmin"],
    description: "Panel główny MES",
  },
  {
    module: "MES Produkcja",
    path: "/mes/production",
    allowedRoles: ["userdn", "admindn", "superadmin"],
    description: "Grupy maszyn / maszyny / operacje",
  },
  {
    module: "MES Panel Maszyny",
    path: "/mes/production/machine/:machineId/panel/:operationId",
    allowedRoles: ["userdn", "admindn", "superadmin"],
    description: "Panel operatora maszyny",
  },
  {
    module: "MES Dashboard Produkcji",
    path: "/mes/production/dashboard",
    allowedRoles: ["userdn", "admindn", "superadmin"],
    description: "Dashboard produkcji",
  },
  {
    module: "MES Serwis",
    path: "/mes/service",
    allowedRoles: ["userdn", "admindn", "superadmin"],
    description: "Stanowiska serwisowe",
  },
  {
    module: "MES Panel Serwisu",
    path: "/mes/service/workstation/:workstationId/panel/:mouldNumber",
    allowedRoles: ["userdn", "admindn", "superadmin"],
    description: "Panel serwisowy formy",
  },
  {
    module: "MES Panel Przezbrojenia",
    path: "/mes/service/workstation/:workstationId/changeover/:changeoverId",
    allowedRoles: ["userdn", "admindn", "superadmin"],
    description: "Panel przezbrojenia w serwisie",
  },
  {
    module: "MES Dashboard Serwisu",
    path: "/mes/service/dashboard",
    allowedRoles: ["userdn", "admindn", "superadmin"],
    description: "Dashboard serwisu",
  },

  // ──────────────── Administracja (admin+) ────────────────
  {
    module: "Admin Panel",
    path: "/admin-panel",
    allowedRoles: ["admin", "admindn", "superadmin"],
    description: "Panel administracyjny",
  },
  {
    module: "Production Admin",
    path: "/production_admin",
    allowedRoles: ["admin", "admindn", "superadmin"],
    description: "Administracja produkcji",
  },
  {
    module: "Service Admin",
    path: "/service_admin",
    allowedRoles: ["admin", "admindn", "superadmin"],
    description: "Administracja serwisu",
  },

  // ──────────────── Administracja DN (admindn+) ────────────────
  {
    module: "Moulds Admin",
    path: "/moulds-admin",
    allowedRoles: ["admindn", "superadmin"],
    description: "Dodawanie / edycja form",
  },

  // ──────────────── Superadmin ────────────────
  {
    module: "Super Admin Panel",
    path: "/superadmin",
    allowedRoles: ["superadmin"],
    description: "Panel superadmina",
  },
  {
    module: "Dashboard",
    path: "/dashboard",
    allowedRoles: ["superadmin"],
    description: "Główny dashboard systemowy",
  },
];

// ──────────────── Helpery ────────────────

/** Sprawdza czy rola ma dostęp do danego modułu */
export function hasAccess(role, moduleName) {
  const entry = ACCESS_TABLE.find((m) => m.module === moduleName);
  if (!entry) return false;
  if (entry.allowedRoles === "all") return true;
  return entry.allowedRoles.includes(role);
}

/** Zwraca listę modułów dostępnych dla danej roli */
export function getModulesForRole(role) {
  return ACCESS_TABLE.filter(
    (m) => m.allowedRoles === "all" || m.allowedRoles.includes(role)
  );
}

/** Zwraca allowedRoles dla danej ścieżki */
export function getAllowedRolesForPath(path) {
  const entry = ACCESS_TABLE.find((m) => m.path === path);
  if (!entry) return [];
  if (entry.allowedRoles === "all") return ROLES;
  return entry.allowedRoles;
}
