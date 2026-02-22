import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-16 max-w-[100vw] overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
