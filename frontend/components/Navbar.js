"use client";
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, LogOut } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <nav className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-100 w-full">
            <Link href="/" className="flex items-center gap-2 text-slate-900 font-bold text-lg hover:opacity-80 transition-all tracking-tight">
                <div className="p-1.5 rounded-md bg-slate-900">
                    <Activity className="h-4 w-4 text-white" />
                </div>
                <span>DiaRisk AI</span>
            </Link>
            
            <div className="flex items-center gap-6">
                {user ? (
                    <>
                        <span className="text-slate-600 hidden sm:inline-block">Welcome, {user.name}</span>
                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                        </button>
                    </>
                ) : (
                    <div className="flex gap-4 items-center">
                        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer">Log In</Link>
                        <Link href="/register" className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition cursor-pointer shadow-sm hover:shadow-md">Get Started</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
