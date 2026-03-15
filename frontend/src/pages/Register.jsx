import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { register, googleLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(name, email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            await googleLogin(credentialResponse.credential);
            navigate('/dashboard');
        } catch (err) {
            setError('Google Sign-In failed');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="auth-panel p-8 w-full max-w-[400px]"
            >
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
                    <p className="text-slate-500 mt-1 text-sm">Start your health assessment</p>
                </div>
                
                {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center border border-red-100">{error}</div>}
                
                <div className="flex justify-center mb-6">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google Sign-In was unsuccessful')}
                        useOneTap
                    />
                </div>

                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">Or continue with email</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input 
                            type="text" 
                            placeholder="Full Name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors text-sm"
                            required 
                        />
                    </div>
                    <div>
                        <input 
                            type="email" 
                            placeholder="Email address" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors text-sm"
                            required 
                        />
                    </div>
                    <div>
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors text-sm"
                            required 
                        />
                    </div>
                    <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg transition-colors mt-6 text-sm">
                        Continue
                    </button>
                </form>
                
                <p className="text-center text-slate-500 text-sm mt-8">
                    Already have an account? <Link to="/login" className="text-brand-600 font-medium hover:underline">Log in</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default Register;
