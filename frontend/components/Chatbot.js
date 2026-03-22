"use client";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, FileText, Loader2, RefreshCw, Paperclip, Activity, TrendingUp, Shield, Zap, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_URL = '';

const INITIAL_MESSAGE = { 
    role: 'model', 
    content: "Hi! I'm DiaRisk AI. I can help assess your diabetes risk by asking a few simple questions one by one. Or, you can upload a recent medical report to get started faster. How would you like to proceed?" 
};

const RichText = ({ text }) => {
    const lines = text.split('\n');
    return (
        <div className="text-[15px] leading-relaxed">
            {lines.map((line, i) => {
                const parts = line.split(/(\*\*.*?\*\*)/g);
                const rendered = parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
                    }
                    const italicParts = part.split(/(\_.*?\_)/g);
                    return italicParts.map((ip, k) => {
                        if (ip.startsWith('_') && ip.endsWith('_') && ip.length > 2) {
                            return <em key={`${j}-${k}`} className="text-slate-400 text-sm">{ip.slice(1, -1)}</em>;
                        }
                        return <span key={`${j}-${k}`}>{ip}</span>;
                    });
                });
                return (
                    <div key={i} className={line.trim() === '' ? 'h-2' : ''}>
                        {rendered}
                    </div>
                );
            })}
        </div>
    );
};

const RiskResultCard = ({ riskData }) => {
    if (!riskData) return null;

    const probability = Math.round(riskData.probability * 100);
    const isHighRisk = riskData.risk_level === 'High Risk';
    const isModRisk = riskData.risk_level === 'Moderate Risk';

    const colors = isHighRisk 
        ? { gradient: 'from-rose-500/20 to-red-600/10', border: 'border-rose-500/30', text: 'text-rose-400', bar: 'from-rose-500 to-red-400', badge: 'bg-rose-500/20 text-rose-400', glow: 'shadow-rose-500/10' }
        : isModRisk 
        ? { gradient: 'from-amber-500/20 to-orange-600/10', border: 'border-amber-500/30', text: 'text-amber-400', bar: 'from-amber-500 to-orange-400', badge: 'bg-amber-500/20 text-amber-400', glow: 'shadow-amber-500/10' }
        : { gradient: 'from-emerald-500/20 to-teal-600/10', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'from-emerald-500 to-teal-400', badge: 'bg-emerald-500/20 text-emerald-400', glow: 'shadow-emerald-500/10' };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.98 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`bg-gradient-to-br ${colors.gradient} ${colors.border} border rounded-2xl p-5 my-3 max-w-md shadow-lg ${colors.glow}`}
        >
            <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded-lg ${colors.badge}`}>
                    <Activity className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-white text-sm">Risk Assessment Result</h4>
            </div>

            <div className="mb-4">
                <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Probability</span>
                    <span className={`text-2xl font-bold ${colors.text}`}>{probability}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${probability}%` }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                        className={`h-full rounded-full bg-gradient-to-r ${colors.bar}`}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs text-slate-400 font-medium">Risk Level</span>
                    </div>
                    <span className={`text-sm font-bold ${colors.text}`}>{riskData.risk_level}</span>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs text-slate-400 font-medium">Confidence</span>
                    </div>
                    <span className="text-sm font-bold text-slate-200">{riskData.confidence_score}</span>
                </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed italic">
                This is an AI screening result, not a medical diagnosis.
            </p>
        </motion.div>
    );
};

const TypingIndicator = () => (
    <div className="flex gap-4 max-w-4xl mx-auto">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mt-1 shadow-lg shadow-cyan-500/20">
            <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="py-3 px-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
            <div className="flex gap-1.5 items-center h-5">
                <span className="typing-dot w-2 h-2 rounded-full bg-cyan-400/70"></span>
                <span className="typing-dot w-2 h-2 rounded-full bg-cyan-400/70"></span>
                <span className="typing-dot w-2 h-2 rounded-full bg-cyan-400/70"></span>
            </div>
        </div>
    </div>
);

const Chatbot = ({ onAssessmentComplete }) => {
    const [messages, setMessages] = useState([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [riskResults, setRiskResults] = useState([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API_URL}/api/chat`);
                if (res.data.messages && res.data.messages.length > 0) {
                    setMessages(res.data.messages);
                    if (res.data.riskAssessment && res.data.riskAssessment.status === 'completed') {
                        setRiskResults([{
                            index: res.data.messages.length - 1,
                            data: res.data.riskAssessment
                        }]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/api/chat`, { message: userMsg });
            const newMsgIndex = messages.length + 1;
            
            setMessages(prev => [...prev, { role: 'model', content: res.data.reply }]);
            if (res.data.complete && res.data.riskAssessment) {
                setRiskResults(prev => [...prev, { index: newMsgIndex, data: res.data.riskAssessment }]);
                if (onAssessmentComplete) onAssessmentComplete(res.data.riskAssessment);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I'm having trouble connecting to the server." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            alert("Please upload a PDF file.");
            return;
        }

        const formData = new FormData();
        formData.append('report', file);
        setUploading(true);
        setMessages(prev => [...prev, { role: 'user', content: `[Uploaded File: ${file.name}]` }]);

        try {
            await axios.post(`${API_URL}/api/upload/pdf`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessages(prev => [...prev, { role: 'model', content: "I've successfully scanned your report! To finish the assessment, what is your current physical activity level?" }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, I couldn't process that PDF." }]);
        } finally {
            setUploading(false);
            event.target.value = null; 
        }
    };

    const handleNewChat = () => {
        setMessages([INITIAL_MESSAGE]);
        setRiskResults([]);
        if (onAssessmentComplete) onAssessmentComplete(null);
    };

    const handleDeeperInsights = () => {
        const msg = "I'd like deeper insights to refine my risk score";
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);

        axios.post(`${API_URL}/api/chat`, { message: msg })
            .then(res => {
                setMessages(prev => [...prev, { role: 'model', content: res.data.reply }]);
            })
            .catch(() => {
                setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I'm having trouble connecting." }]);
            })
            .finally(() => setLoading(false));
    };

    return (
        <div className="flex flex-col h-full min-h-[500px] bg-[#0a0f1a] rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/40">
            
            {/* ── Header ── */}
            <div className="relative p-4 flex justify-between items-center z-10 shrink-0 border-b border-white/[0.06]"
                 style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(15,23,42,0.95) 50%, rgba(59,130,246,0.06) 100%)' }}>
                {/* Subtle ambient glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
                </div>
                <div className="flex items-center gap-3 relative">
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-cyan-500/20 bot-glow">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base tracking-tight text-white">DiaRisk AI</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 status-glow"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                            </span>
                            <p className="text-emerald-400/80 text-xs font-medium">Online</p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleNewChat} 
                    className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-200 cursor-pointer outline-none border border-transparent hover:border-white/[0.08]"
                    title="New conversation"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-xs font-medium hidden sm:inline">New Chat</span>
                </button>
            </div>

            {/* ── Messages Area ── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
                 style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #0d1321 100%)' }}>
                <AnimatePresence>
                    {messages.map((msg, idx) => {
                        const riskForThis = riskResults.find(r => r.index === idx);
                        const isUser = msg.role === 'user';
                        return (
                            <div key={idx}>
                                <motion.div 
                                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className={`flex gap-3 max-w-4xl mx-auto ${isUser ? 'flex-row-reverse' : ''}`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg ${
                                        isUser 
                                            ? 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-700/20' 
                                            : 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20'
                                    }`}>
                                        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`max-w-[75%] ${
                                        isUser 
                                            ? 'bg-gradient-to-br from-cyan-600/90 to-blue-600/90 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-lg shadow-cyan-600/10' 
                                            : 'bg-white/[0.04] border border-white/[0.06] text-slate-300 rounded-2xl rounded-tl-md px-4 py-3 border-l-2 border-l-cyan-500/40'
                                    }`}>
                                        {msg.content.includes('[Uploaded File') ? (
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/10 rounded-lg">
                                                    <FileText className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <span className="font-medium text-sm">{msg.content.replace('[Uploaded File: ', '').replace(']', '')}</span>
                                                    <p className="text-xs text-white/60 mt-0.5">PDF Document</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <RichText text={msg.content} />
                                        )}
                                    </div>
                                </motion.div>

                                {/* Risk Result */}
                                {riskForThis && (
                                    <div className="max-w-4xl mx-auto pl-11 mt-3">
                                        <RiskResultCard riskData={riskForThis.data} />
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.6, duration: 0.3 }}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleDeeperInsights}
                                            className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-cyan-600/20 cursor-pointer"
                                        >
                                            <Zap className="w-4 h-4" />
                                            Get Deeper Insights
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </AnimatePresence>

                {/* Typing Indicator */}
                {loading && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input Area ── */}
            <div className="p-4 shrink-0 border-t border-white/[0.06]"
                 style={{ background: 'linear-gradient(180deg, #0d1321 0%, #0a0f1a 100%)' }}>
                <form onSubmit={handleSend} className="relative flex items-center gap-2 max-w-4xl mx-auto">
                    <div className="relative flex-1 input-glow rounded-2xl transition-all duration-300">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message DiaRisk..."
                            className="w-full bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.06] border border-white/[0.08] focus:border-cyan-500/30 text-[15px] text-white placeholder-slate-500 rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-all duration-200"
                            disabled={loading || uploading}
                        />
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full">
                            <label className="cursor-pointer flex items-center justify-center p-2 text-slate-500 hover:text-cyan-400 transition-all duration-200">
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-cyan-400" /> : <Paperclip className="w-5 h-5" />}
                                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" disabled={uploading || loading} />
                            </label>
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading || uploading || !input.trim()} 
                        className="p-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-lg shadow-cyan-600/20 disabled:shadow-none cursor-pointer outline-none"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
                <p className="text-center text-[11px] text-slate-600 mt-3">
                    DiaRisk AI provides screening results only — not a medical diagnosis.
                </p>
            </div>
        </div>
    );
};

export default Chatbot;
