import React, { useState } from "react";
import { API_BASE } from "../config/api.js";
import AddMouldModal from "./subcomponents/AddMouldModal.jsx";
import { getCurrentUser } from "../auth.js";

const authHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function MouldsAdmin() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const user = getCurrentUser();
  const role = user?.role;
  const canEdit = role === "admindn" || role === "superadmin";

  const tiles = [
    { key: "add", label: "Dodaj forme", active: true },
    { key: "t2", label: "Wkrotce", active: false },
    { key: "t3", label: "Wkrotce", active: false },
    { key: "t4", label: "Wkrotce", active: false },
    { key: "t5", label: "Wkrotce", active: false },
    { key: "t6", label: "Wkrotce", active: false },
    { key: "t7", label: "Wkrotce", active: false },
    { key: "t8", label: "Wkrotce", active: false },
  ];

  return (
    <>
      <div className="p-10 text-white">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-cyan-400">Panel form</h1>
          <p className="text-sm text-slate-300">Zarzadzanie formularzem dodawania form.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiles.map((tile) =>
            tile.active ? (
              <button
                key={tile.key}
                type="button"
                onClick={() => setIsAddOpen(true)}
                disabled={!canEdit}
                className="min-h-[170px] rounded-2xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-white flex items-center justify-center text-lg font-semibold transition disabled:opacity-50"
                title="Dodaj forme"
              >
                Dodaj forme
              </button>
            ) : (
              <div
                key={tile.key}
                className="min-h-[170px] rounded-2xl border border-slate-800/80 bg-slate-900/40 text-slate-400 flex items-center justify-center text-sm"
              >
                {tile.label}
              </div>
            )
          )}
        </div>
      </div>

      <AddMouldModal
        open={canEdit && isAddOpen}
        canEdit={canEdit}
        API_BASE={API_BASE}
        authHeaders={authHeaders}
        onClose={() => setIsAddOpen(false)}
        onCreated={() => {}}
      />
    </>
  );
}
