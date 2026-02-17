// src/App.jsx
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import Pricing from './components/Pricing.jsx'
import Testimonials from './components/Testimonials.jsx'
import Moulds from './components/Moulds.jsx'
import Footer from './components/Footer.jsx'

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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



function App() {
  return (
    <div className="min-h-screen bg-slate-800 text-white overflow-hidden">
      <Router>
        {/* <Navbar /> */}

          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Moulds />} />
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
                <Route path="/mes/service" element={<MES_Service />} />
              </Route>
            </Route>

            <Route element={<RequireRole allowedRoles={["admin", "admindn", "superadmin"]} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin-panel" element={<AdminPanel />} />
                <Route path="/production_admin" element={<ProductionAdmin />} />
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

        {/* (opcjonalnie) Footer */}
        {/* <Footer /> */}
      </Router>
    </div>
  )
}

export default App
