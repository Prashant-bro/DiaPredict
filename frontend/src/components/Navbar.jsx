import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, LogOut } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-100 w-full">
            <Link to="/" className="flex items-center gap-2 text-slate-900 font-bold text-lg hover:opacity-80 transition-all tracking-tight">
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
                            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-500 transition"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                        </button>
                    </>
                ) : (
                    <div className="flex gap-4 items-center">
                        <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Log In</Link>
                        <Link to="/register" className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">Get Started</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
