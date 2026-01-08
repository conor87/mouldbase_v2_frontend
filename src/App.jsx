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
import RequireAuth from "./components/RequireAuth";
import RequireRole from './components/RequireRole.jsx';
import SuperAdminPanel from "./components/SuperAdminPanel";
import AdminPanel from "./components/AdminPanel";
import Changeovers from "./components/Changeovers.jsx";
import Tpm from "./components/Tpm.jsx";



function App() {
  return (
    <div className="min-h-screen bg-slate-800 text-white overflow-hidden">
      <Router>
        {/* <Navbar /> */}

          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Moulds />} />
              <Route path="/moulds/:number" element={<MouldDetails />} />
              <Route path="/changeovers" element={<Changeovers />} />
              <Route path="/tpm" element={<Tpm />} />
            </Route>

            <Route element={<RequireRole allowedRoles={["admin", "superadmin"]} />}>
              <Route path="/admin-panel" element={<AdminPanel />} />
            </Route>

            <Route element={<RequireRole allowedRoles={["superadmin"]} />}>
              <Route path="/superadmin" element={<SuperAdminPanel />} />
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
