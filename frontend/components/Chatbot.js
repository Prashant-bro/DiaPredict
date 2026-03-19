"use client";
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, FileText, Loader2, RefreshCw, Paperclip, Activity, TrendingUp, Shield, Zap } from 'lucide-react';
import axios from 'axios';

const API_URL = ''; // Internal API routes

const INITIAL_MESSAGE = { 
    role: 'model', 
    content: "Hi! I'm DiaRisk AI. I can help assess your diabetes risk by asking a few simple questions one by one. Or, you can upload a recent medical report to get started faster. How would you like to proceed?" 
};

// Simple markdown-like renderer for bold text and bullet points
const RichText = ({ text }) => {
    const lines = text.split('\n');
    return (
        <div className="text-[15px] leading-relaxed">
            {lines.map((line, i) => {
                const parts = line.split(/(\*\*.*?\*\*)/g);
                const rendered = parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
                    }
                    const italicParts = part.split(/(\_.*?\_)/g);
                    return italicParts.map((ip, k) => {
                        if (ip.startsWith('_') && ip.endsWith('_') && ip.length > 2) {
                            return <em key={`${j}-${k}`} className="text-slate-500 text-sm">{ip.slice(1, -1)}</em>;
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

// Inline risk result card component
const RiskResultCard = ({ riskData }) => {
    if (!riskData) return null;

    const probability = Math.round(riskData.probability * 100);
    const isHighRisk = riskData.risk_level === 'High Risk';
    const isModRisk = riskData.risk_level === 'Moderate Risk';

    const colors = isHighRisk 
        ? { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700' }
        : isModRisk 
        ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' }
        : { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.98 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`${colors.bg} ${colors.border} border rounded-2xl p-5 my-3 max-w-md shadow-sm`}
        >
            <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded-lg ${colors.badge}`}>
                    <Activity className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-slate-900 text-sm">Risk Assessment Result</h4>
            </div>

            <div className="mb-4">
                <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Probability</span>
                    <span className={`text-2xl font-bold ${colors.text}`}>{probability}%</span>
                </div>
                <div className="w-full bg-white/80 rounded-full h-2.5 overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${probability}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                        className={`h-full rounded-full ${colors.bar}`}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/70 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">Risk Level</span>
                    </div>
                    <span className={`text-sm font-bold ${colors.text}`}>{riskData.risk_level}</span>
                </div>
                <div className="bg-white/70 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">Confidence</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{riskData.confidence_score}</span>
                </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed italic">
                This is an AI screening result, not a medical diagnosis.
            </p>
        </motion.div>
    );
};

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
        <div className="flex flex-col h-full min-h-[500px] bg-white rounded-2xl overflow-hidden border border-slate-200">
            <div className="bg-white p-4 text-slate-900 flex justify-between items-center z-10 shrink-0 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <Bot className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base tracking-tight">DiaRisk AI</h3>
                        <p className="text-slate-500 text-xs font-medium">Clinical Assistant</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-white">
                {messages.map((msg, idx) => {
                    const riskForThis = riskResults.find(r => r.index === idx);
                    return (
                        <div key={idx}>
                            <motion.div 
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-slate-200 text-slate-700' : 'bg-slate-900 text-white'}`}>
                                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`max-w-[75%] ${msg.role === 'user' ? 'bg-slate-100 text-slate-900 rounded-2xl px-5 py-3' : 'bg-transparent text-slate-900 py-1'}`}>
                                    {msg.content.includes('[Uploaded File') ? (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-200 rounded-lg">
                                                <FileText className="w-5 h-5 text-slate-700" />
                                            </div>
                                            <span className="font-medium tracking-wide">{msg.content.replace('[Uploaded File: ', '').replace(']', '')}</span>
                                        </div>
                                    ) : (
                                        <RichText text={msg.content} />
                                    )}
                                </div>
                            </motion.div>
                            {riskForThis && (
                                <div className="max-w-4xl mx-auto pl-12 mt-3">
                                    <RiskResultCard riskData={riskForThis.data} />
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.6, duration: 0.3 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleDeeperInsights}
                                        className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md cursor-pointer"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Get Deeper Insights
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {loading && (
                    <div className="flex gap-4 max-w-4xl mx-auto">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center mt-1">
                            <Bot className="w-4 h-4" />
                        </div>
                        <div className="py-2 flex gap-1 items-center">
                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse delay-75"></span>
                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse delay-150"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white shrink-0">
                <form onSubmit={handleSend} className="relative flex items-center gap-2 max-w-4xl mx-auto">
                    <button type="button" onClick={handleNewChat} className="flex items-center justify-center p-3 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all cursor-pointer outline-none">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message DiaRisk..."
                            className="w-full bg-slate-100 hover:bg-slate-200 focus:bg-white border border-transparent focus:border-slate-300 text-[15px] text-slate-900 rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-all"
                            disabled={loading || uploading}
                        />
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full">
                            <label className="cursor-pointer flex items-center justify-center p-2 text-slate-500 hover:text-slate-900 transition-all">
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-900" /> : <Paperclip className="w-5 h-5" />}
                                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" disabled={uploading || loading} />
                            </label>
                        </div>
                    </div>
                    <button type="submit" disabled={loading || uploading || !input.trim()} className="p-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer outline-none">
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;
