"use client";
import ProtectedRoute from '../../components/ProtectedRoute';
import Chatbot from '../../components/Chatbot';

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <div className="min-h-[calc(100vh-65px)] bg-gradient-to-br from-slate-950 via-[#0a0f1a] to-slate-900 px-4 py-6 sm:py-8">
                <div className="container mx-auto max-w-3xl h-[calc(100vh-120px)] flex flex-col">
                    <div className="flex-1 min-h-[500px]">
                        <Chatbot />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
