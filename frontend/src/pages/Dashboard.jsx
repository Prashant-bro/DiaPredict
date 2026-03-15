import { useState } from 'react';
import Chatbot from '../components/Chatbot';

const Dashboard = () => {
    const [riskData, setRiskData] = useState(null);

    const handleAssessmentComplete = (data) => {
        setRiskData(data);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl h-full flex flex-col justify-center">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h1 className="text-2xl font-bold text-slate-900">Your Health Overview</h1>
            </div>
            
            <div className="flex-1 min-h-[500px]">
                <Chatbot onAssessmentComplete={handleAssessmentComplete} />
            </div>
        </div>
    );
};

export default Dashboard;
