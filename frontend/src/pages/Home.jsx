import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, HeartPulse } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { user } = useAuth();
    return (
        <div className="min-h-[85vh] flex flex-col justify-center items-center text-center px-4">
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-4xl"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium mb-8 border border-slate-200">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                    </span>
                    AI Powered Medical Screening
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
                    Predict Your Risk.<br />
                    <span className="text-slate-500">Protect Your Future.</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                    Chat naturally with our medical AI assistant or upload your recent clinical reports to generate an instant, highly accurate diabetes risk assessment using advanced machine learning.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    {user ? (
                        <Link to="/dashboard" className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors">
                            Go to Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link to="/register" className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors">
                                Start Assessment
                            </Link>
                            <Link to="/login" className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium border border-slate-200 transition-colors">
                                Sign In
                            </Link>
                        </>
                    )}
                </div>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl w-full">
                {[
                    { icon: Activity, title: "Clinical Accuracy", desc: "Trained on CDC BRFSS dataset using performant ML models." },
                    { icon: HeartPulse, title: "Conversational", desc: "No complex forms. Just chat naturally with our AI." },
                    { icon: ShieldCheck, title: "Private & Secure", desc: "End-to-end processing with encrypted data transmission." }
                ].map((feature, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (i * 0.1) }}
                        key={i} 
                        className="bg-white p-8 rounded-2xl text-left border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-6">
                            <feature.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Home;
