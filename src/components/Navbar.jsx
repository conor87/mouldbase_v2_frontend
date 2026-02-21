import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../auth';

export default function Navbar({ titleOverride } = {}) {
    const [mobileMenuIsOpen, setMobileMenuIsOpen] = useState(false);
    const [username, setUsername] = useState(() => {
    if (typeof window === "undefined") return "";
    const user = getCurrentUser();
    return user?.sub ?? user?.username ?? "";
    });

    const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window === "undefined") return false; // na wszelki wypadek gdyby było SSR
    const token = localStorage.getItem("access_token");
    return !!token;
    });

    useEffect(() => {
        const syncAuth = () => {
            if (typeof window === "undefined") return;
            const user = getCurrentUser();
            setUsername(user?.sub ?? user?.username ?? "");
            setIsLoggedIn(Boolean(user));
        };

        syncAuth();
        window.addEventListener("storage", syncAuth);
        return () => window.removeEventListener("storage", syncAuth);
    }, []);

    function logout() {
        localStorage.removeItem("access_token");
        setIsLoggedIn(false);
        setUsername("");
        window.location.href = "/login"; // przekierowanie
    }

    return (
        <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-slate-800/20 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-around items-center h-14 sm:h-16 md:h-20">

                    {/* Logo */}
                    <div className="flex items-center space-x-1 group cursor-pointer">
                        <span className="text-lg sm:text-xl md:text-2xl font-medium">
                            {titleOverride || (
                              <>
                                <span className="text-white">Mould</span>
                                <span className="text-cyan-400">Book</span>
                                <span className="text-cyan-400"> 2.0</span>
                              </>
                            )}
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
                                    className="text-red-400 hover:text-white flex items-center gap-2 md:flex-col md:items-start md:gap-1 lg:flex-row lg:items-center lg:gap-2 min-w-0"
                                >
                                    <span>Logout</span>
                                    {username && (
                                        <span className="font-bold text-slate-300 block md:text-left md:whitespace-normal md:break-all lg:whitespace-nowrap lg:truncate min-w-0 max-w-[160px] md:max-w-[180px] lg:max-w-[220px]">
                                            {username}
                                        </span>
                                    )}
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

                        {/* <a href="#features" onClick={() => setMobileMenuIsOpen(false)} className="block text-gray-300 hover:text-white">
                            Features
                        </a>
                        <a href="#pricing" onClick={() => setMobileMenuIsOpen(false)} className="block text-gray-300 hover:text-white">
                            Pricing
                        </a>
                        <a href="#testimonials" onClick={() => setMobileMenuIsOpen(false)} className="block text-gray-300 hover:text-white">
                            Testimonials
                        </a> */}

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
                                <span className="flex items-center gap-2 min-w-0">
                                    <span>Logout</span>
                                    {username && (
                                        <span className="font-bold text-slate-300 block min-w-0 max-w-[200px] truncate">
                                            {username}
                                        </span>
                                    )}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
