"use client";
import ProtectedRoute from '../../components/ProtectedRoute';
import Chatbot from '../../components/Chatbot';

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <div className="container mx-auto px-4 py-8 max-w-3xl h-[calc(100vh-120px)] flex flex-col justify-center">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h1 className="text-2xl font-bold text-slate-900">Your Health Overview</h1>
                </div>
                
                <div className="flex-1 min-h-[500px]">
                    <Chatbot />
                </div>
            </div>
        </ProtectedRoute>
    );
}
