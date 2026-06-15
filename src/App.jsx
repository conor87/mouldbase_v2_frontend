// src/App.jsx
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import Pricing from './components/Pricing.jsx'
import Testimonials from './components/Testimonials.jsx'
import Moulds from './components/Moulds.jsx'
import Footer from './components/Footer.jsx'

import { useEffect } from "react";
import { releaseAssignedMesResources } from "./utils/mesRelease.js";
import { API_BASE } from "./config/api.js";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import MouldDetails from "./components/MouldDetails";

import Login from "./components/Login";
import Register from "./components/Register";
import RequireRole from './components/RequireRole.jsx';
import SuperAdminPanel from "./components/SuperAdminPanel";
import AdminPanel from "./components/AdminPanel";
import Changeovers from "./components/Changeovers.jsx";
import Tpm from "./components/Tpm.jsx";
import Kalendarz from "./components/Kalendarz.jsx";
import ProductionAdmin from "./components/ProductionAdmin.jsx";
import ServiceAdmin from "./components/ServiceAdmin.jsx";
import AppLayout from "./components/AppLayout.jsx";
import MouldsAdmin from "./components/MouldsAdmin.jsx";
import Dashboard from "./components/Dashboard.jsx";
import CurrentSv from "./components/CurrentSv.jsx";
import MES from "./components/MES.jsx";
import MES_MachineGroups from "./components/MES_MachineGroups.jsx";
import MES_Machines from "./components/MES_Machines.jsx";
import MES_Operations from "./components/MES_Operations.jsx";
import MES_MachinePanel from "./components/MES_MachinePanel.jsx";
import MES_Service from "./components/MES_Service.jsx";
import MES_ServiceWorkstation from "./components/MES_ServiceWorkstation.jsx";
import MES_ServicePanel from "./components/MES_ServicePanel.jsx";
import MES_Service_Dashboard from "./components/MES_Service_Dashboard.jsx";
import MES_ChangeoverPanel from "./components/MES_ChangeoverPanel.jsx";
import MES_Production_Dashboard from "./components/MES_Production_Dashboard.jsx";
import Analytics from "./components/Analytics.jsx";
import OrdersTree from "./components/OrdersTree.jsx";
import StartPage from "./components/StartPage.jsx";
import LicenseGate from "./components/LicenseGate.jsx";



function useDailyAutoLogout() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkTimeAndLogout = async () => {
      const token = localStorage.getItem("access_token");
      const userId = localStorage.getItem("user_id");
      const uname = localStorage.getItem("username") || "";

      if (!token || !userId) return;

      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Zwalnianie stanowisk o 23:45
      if (hours === 23 && minutes >= 45) {
        // Sprawdź czy automatyczne wylogowywanie jest aktywne w systemie
        try {
          const res = await fetch(`${API_BASE}/settings/auto-logout`);
          const settings = await res.json();
          if (settings && settings.enabled === false) {
            console.log("Automatyczne wylogowanie o 23:45 jest obecnie WYŁĄCZONE w panelu admina.");
            return;
          }
        } catch (err) {
          console.error("Błąd podczas sprawdzania statusu autowylogowania:", err);
          // W razie błędu serwera kontynuujemy wylogowywanie dla bezpieczeństwa
        }

        console.log("Automatyczne wylogowanie zwalniające stanowiska (23:45)...");

        try {
          await releaseAssignedMesResources({
            token,
            userId: parseInt(userId, 10),
            username: uname,
          });
        } catch (err) {
          console.error("Błąd podczas zwalniania zasobów:", err);
        }

        try {
          const p = (n) => String(n).padStart(2, "0");
          const created_at = `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
          await fetch(`${API_BASE}/mes-session/logs`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ user_id: parseInt(userId, 10), username: uname, action: "logout", created_at }),
          });
        } catch { /* ignore */ }

        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        localStorage.removeItem("user_id");

        window.dispatchEvent(new Event("storage"));
        navigate("/login");
      }
    };

    const interval = setInterval(checkTimeAndLogout, 30000);
    checkTimeAndLogout();

    return () => clearInterval(interval);
  }, [navigate]);
}

function AutoLogoutTrigger() {
  useDailyAutoLogout();
  return null;
}

function App() {
  return (
    <div className="min-h-screen bg-slate-800 text-white overflow-hidden">
      <Router>
        <LicenseGate>
          <AutoLogoutTrigger />
        {/* <Navbar /> */}

          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<StartPage />} />
              <Route path="/moulds" element={<Moulds />} />
              <Route path="/moulds/:mould_number" element={<MouldDetails />} />
              <Route path="/changeovers" element={<Changeovers />} />
              <Route path="/current_sv" element={<CurrentSv />} />
              <Route path="/tpm" element={<Tpm />} />
              <Route path="/kalendarz" element={<Kalendarz />} />
            </Route>

            <Route element={<RequireRole allowedRoles={["userdn", "admindn", "superadmin"]} />}>
              <Route element={<AppLayout />}>
                <Route path="/mes" element={<MES />} />
                <Route path="/mes/production" element={<MES_MachineGroups />} />
                <Route path="/mes/production/group/:groupId" element={<MES_Machines />} />
                <Route path="/mes/production/machine/:machineId" element={<MES_Operations />} />
                <Route path="/mes/production/machine/:machineId/panel/:operationId" element={<MES_MachinePanel />} />
                <Route path="/mes/production/dashboard" element={<MES_Production_Dashboard />} />
                <Route path="/mes/service" element={<MES_Service />} />
                <Route path="/mes/service/workstation/:workstationId" element={<MES_ServiceWorkstation />} />
                <Route path="/mes/service/workstation/:workstationId/panel/:mouldNumber" element={<MES_ServicePanel />} />
                <Route path="/mes/service/workstation/:workstationId/changeover/:changeoverId" element={<MES_ChangeoverPanel />} />
                <Route path="/mes/service/dashboard" element={<MES_Service_Dashboard />} />
                <Route path="/orders-tree" element={<OrdersTree />} />
              </Route>
            </Route>

            <Route element={<RequireRole allowedRoles={["admin", "admindn", "superadmin"]} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin-panel" element={<AdminPanel />} />
                <Route path="/production_admin" element={<ProductionAdmin />} />
                <Route path="/service_admin" element={<ServiceAdmin />} />
                <Route path="/analytics" element={<Analytics />} />
              </Route>
            </Route>

            <Route element={<RequireRole allowedRoles={["admindn", "superadmin"]} />}>
              <Route element={<AppLayout />}>
                <Route path="/moulds-admin" element={<MouldsAdmin />} />
              </Route>
            </Route>

            <Route element={<RequireRole allowedRoles={["superadmin"]} />}>
              <Route element={<AppLayout />}>
                <Route path="/superadmin" element={<SuperAdminPanel />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
            </Route>

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<div>Brak uprawnień</div>} />
          </Routes>
        </LicenseGate>

        {/* (opcjonalnie) Footer */}
        {/* <Footer /> */}
      </Router>
    </div>
  )
}

export default App
