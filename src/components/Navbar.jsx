import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
    const [mobileMenuIsOpen, setMobileMenuIsOpen] = useState(false);

    const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false; // na wszelki wypadek gdyby było SSR
    const token = localStorage.getItem("access_token");
    return !!token;
    });

    function logout() {
        localStorage.removeItem("access_token");
        setIsLoggedIn(false);
        window.location.href = "/login"; // przekierowanie
    }

    return (
        <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-slate-800/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14 sm:h-16 md:h-20">

                    {/* Logo */}
                    <div className="flex items-center space-x-1 group cursor-pointer">
                        <span className="text-lg sm:text-xl md:text-2xl font-medium">
                            <span className="text-white">Mould</span>
                            <span className="text-cyan-400">Book 2.0</span>
                        </span>
                    </div>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
                        {/* <a href="#features" className="text-gray-300 hover:text-white">Features</a>
                        <a href="#pricing" className="text-gray-300 hover:text-white">Pricing</a>
                        <a href="#testimonials" className="text-gray-300 hover:text-white">Testimonials</a> */}

                        {/* 🔥 Login / Register / Logout */}
                            {!isLoggedIn ? (
                                <>
                                    <a href="/login" className="text-cyan-400 hover:text-white">
                                        Login
                                    </a>
                                    <a href="/register" className="text-cyan-400 hover:text-white">
                                        Register
                                    </a>
                                </>
                            ) : (
                                <button 
                                    onClick={logout}
                                    className="text-red-400 hover:text-white"
                                >
                                    Logout
                                </button>
                            )}
                    </div>

                    {/* Mobile menu button */}
                    <button 
                        className="md:hidden p-2 text-gray-300 hover:text-white"
                        onClick={() => setMobileMenuIsOpen(!mobileMenuIsOpen)}
                    >
                        {mobileMenuIsOpen ? <X /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuIsOpen && (
                <div className="md:hidden bg-slate-800/95 backdrop-blur-lg border-t border-slate-700 animate-in slide-in-from-top duration-300">
                    <div className="px-4 py-4 sm:py-6 space-y-4">

                        <a href="#features" onClick={() => setMobileMenuIsOpen(false)} className="block text-gray-300 hover:text-white">
                            Features
                        </a>
                        <a href="#pricing" onClick={() => setMobileMenuIsOpen(false)} className="block text-gray-300 hover:text-white">
                            Pricing
                        </a>
                        <a href="#testimonials" onClick={() => setMobileMenuIsOpen(false)} className="block text-gray-300 hover:text-white">
                            Testimonials
                        </a>

                        {/* 🔥 Mobile Login / Logout */}
                        {!isLoggedIn ? (
                            <>
                                <a 
                                    href="/login"
                                    onClick={() => setMobileMenuIsOpen(false)}
                                    className="block text-cyan-400 hover:text-white"
                                >
                                    Login
                                </a>

                                <a 
                                    href="/register"
                                    onClick={() => setMobileMenuIsOpen(false)}
                                    className="block text-cyan-400 hover:text-white"
                                >
                                    Register
                                </a>
                            </>
                        ) : (
                            <button
                                onClick={() => { logout(); setMobileMenuIsOpen(false); }}
                                className="block text-red-400 hover:text-white"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
