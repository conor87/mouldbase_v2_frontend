import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

export default function AppLayout() {
  const location = useLocation();
  const isStartPage = location.pathname === "/";

  return (
    <div className="min-h-screen">
      {!isStartPage && <Sidebar />}
      <div className={`${isStartPage ? "" : "pl-24"} max-w-[100vw] overflow-x-hidden`}>
        <Outlet />
      </div>
    </div>
  );
}
