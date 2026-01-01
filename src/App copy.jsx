import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import Pricing from './components/Pricing.jsx'
import Testimonials from './components/Testimonials.jsx'
import Moulds from './components/Moulds.jsx'
import Footer from './components/Footer.jsx'

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MouldDetails from "./components/MouldDetails";


function App() {

  return (
    <div className="min-h-screen bg-slate-800 text-white overflow-hidden">
      
    <Router>
      <Routes>
        
        <Route path="/" element={<Moulds />} />
        <Route path="/moulds/:number" element={<MouldDetails />} />
      </Routes>
    </Router>
    </div>
  )
}

export default App
