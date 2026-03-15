import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

const Dashboard = ({ riskData }) => {
    if (!riskData) {
        return null; // The parent component now handles the empty state conditional rendering
    }

    const isHighRisk = riskData.risk_level === 'High Risk';
    const isModRisk = riskData.risk_level === 'Moderate Risk';

    const colorScheme = isHighRisk ? 'text-rose-600 bg-rose-50 border-rose-200' 
                      : isModRisk ? 'text-amber-600 bg-amber-50 border-amber-200'
                      : 'text-emerald-600 bg-emerald-50 border-emerald-200';

    const gradient = isHighRisk ? 'from-rose-500 to-rose-600' 
                   : isModRisk ? 'from-amber-400 to-amber-500' 
                   : 'from-emerald-400 to-emerald-500';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-2xl p-6 h-full min-h-[500px] overflow-y-auto ${colorScheme} border border-slate-200 flex flex-col`}
        >
            <div className="text-center pb-6 border-b border-slate-100">
                <div className="inline-flex items-center justify-center p-3 rounded-xl bg-slate-50 shadow-sm mb-4 border border-slate-100">
                    {isHighRisk ? <AlertTriangle className="w-8 h-8 text-rose-500" /> : <CheckCircle className="w-8 h-8 text-emerald-500" />}
                </div>
                <h2 className="text-2xl font-bold mb-1">Assessment Complete</h2>
                <p className="opacity-80 text-sm">Confidence: {riskData.confidence_score}</p>
            </div>

            <div className="py-8 text-center flex flex-col items-center">
                <div className="relative w-48 h-48 mb-6">
                    {/* Fake Gauge */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="opacity-10" />
                        <motion.circle 
                            initial={{ strokeDasharray: "0 283" }}
                            animate={{ strokeDasharray: `${riskData.probability * 283} 283` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="50" cy="50" r="45" fill="none" stroke="url(#gradient)" strokeWidth="10" 
                            className="drop-shadow-sm"
                        />
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={isHighRisk ? "#ef4444" : isModRisk ? "#f59e0b" : "#10b981"} />
                                <stop offset="100%" stopColor={isHighRisk ? "#be123c" : isModRisk ? "#d97706" : "#059669"} />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black">{Math.round(riskData.probability * 100)}%</span>
                        <span className="text-xs uppercase font-bold tracking-wider mt-1 opacity-70">Probability</span>
                    </div>
                </div>

                <div className={`px-6 py-2 rounded-lg inline-block font-bold text-white bg-slate-900 shadow-sm`}>
                    {riskData.risk_level.toUpperCase()}
                </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl mt-4 border border-slate-100">
                <h4 className="font-semibold text-slate-900 mb-2">AI Recommendation</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                    {isHighRisk 
                        ? "Your answers indicate a significant risk profile for diabetes. We strongly advise scheduling a consultation with a healthcare professional soon. They can conduct a formal HbA1c test and discuss preventative measures or treatment options immediately." 
                        : isModRisk 
                        ? "You show some moderate risk factors. Consider reviewing your diet (incorporating more vegetables) and attempting to increase your physical activity. A routine check-up with your doctor is recommended to monitor your baseline metrics."
                        : "Your current lifestyle and metrics indicate a low risk for diabetes. Continue maintaining a balanced diet, consistent physical activity, and regular health check-ups."}
                </p>
                <div className="mt-4 p-3 bg-white rounded-lg text-xs italic text-slate-500 text-center border border-slate-200">
                    Disclaimer: This is a screening tool, not a medical diagnosis.
                </div>
            </div>
        </motion.div>
    );
};

export default Dashboard;
