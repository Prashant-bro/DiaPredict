import dbConnect from "@/lib/db";
import Assessment from "@/lib/models/Assessment";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

const SYSTEM_PROMPT = `
You are a medical assistant chatbot for diabetes risk screening.
Your goal is to collect specific health data from the user ONE BY ONE through natural conversation.
Do NOT ask multiple questions at once. Be empathetic and professional.

Fields to collect:
1. HighBP (High Blood Pressure: 0=No, 1=Yes)
2. HighChol (High Cholesterol: 0=No, 1=Yes)
3. CholCheck (Cholesterol check within 5 years: 0=No, 1=Yes)
4. BMI (Body Mass Index)
5. Smoker (Smoked at least 100 cigarettes: 0=No, 1=Yes)
6. Stroke (Ever had a stroke: 0=No, 1=Yes)
7. HeartDiseaseorAttack (Coronary heart disease or MI: 0=No, 1=Yes)
8. PhysActivity (Physical activity within 30 days: 0=No, 1=Yes)
9. Fruits (Consume fruit 1+ times/day: 0=No, 1=Yes)
10. Veggies (Consume vegetables 1+ times/day: 0=No, 1=Yes)
11. HvyAlcoholConsump (Heavy drinker: 0=No, 1=Yes)
12. GenHlth (General health: 1=Excellent, 2=Very Good, 3=Good, 4=Fair, 5=Poor)
13. Sex (0=Female, 1=Male)
14. Age (Age category: 1=18-24, 2=25-29, 3=30-34, 4=35-39, 5=40-44, 6=45-49, 7=50-54, 8=55-59, 9=60-64, 10=65-69, 11=70-74, 12=75-79, 13=80+)

MANDATORY JSON FORMAT:
At the end of every response, you MUST include a JSON block with any extracted or updated fields.
Format:
\`\`\`json
{
  "HighBP": null,
  "HighChol": null,
  "ready_to_predict": false
}
\`\`\`
Set "ready_to_predict": true only when you have collected enough info (at least 5-6 key fields).
`;

const FOLLOWUP_PROMPT = `
The user wants deeper insights. Collect more detailed lifestyle data one by one.
Fields:
1. AnyHealthcare (Any health insurance: 0=No, 1=Yes)
2. NoDocbcCost (Couldn't see doctor due to cost: 0=No, 1=Yes)
3. MentHlth (Days of poor mental health in last 30 days)
4. PhysHlth (Days of poor physical health in last 30 days)
5. DiffWalk (Difficulty walking or climbing stairs: 0=No, 1=Yes)
6. Education (1-6 scale)
7. Income (1-8 scale)

MANDATORY: include JSON at the end.
Do NOT set "ready_to_predict": true until you have collected at least 5 additional fields.
`;

async function callGemini(systemPrompt, history, message) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
        history: history,
        generationConfig: { maxOutputTokens: 500 }
    });
    const result = await chat.sendMessage(message + "\n\n" + systemPrompt);
    return result.response.text();
}

function buildPayload(data) {
    return {
        HighBP: data.HighBP || 0,
        HighChol: data.HighChol || 0,
        CholCheck: data.CholCheck || 0,
        BMI: data.BMI || 25,
        Smoker: data.Smoker || 0,
        Stroke: data.Stroke || 0,
        HeartDiseaseorAttack: data.HeartDiseaseorAttack || 0,
        PhysActivity: data.PhysActivity || 1,
        Fruits: data.Fruits || 1,
        Veggies: data.Veggies || 1,
        HvyAlcoholConsump: data.HvyAlcoholConsump || 0,
        AnyHealthcare: data.AnyHealthcare || 1,
        NoDocbcCost: data.NoDocbcCost || 0,
        GenHlth: data.GenHlth || 3,
        MentHlth: data.MentHlth || 0,
        PhysHlth: data.PhysHlth || 0,
        DiffWalk: data.DiffWalk || 0,
        Sex: data.Sex || 0,
        Age: data.Age || 5,
        Education: data.Education || 4,
        Income: data.Income || 5
    };
}

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const chat = await Assessment.findOne({ userId: user.id }).sort({ updatedAt: -1 });
        return NextResponse.json(chat || { messages: [] });
    } catch (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { message } = await req.json();
        const wantsDeeper = message.toLowerCase().includes('deeper insights') || 
                            message.toLowerCase().includes('more detail') ||
                            message.toLowerCase().includes('refine');

        let chat = await Assessment.findOne({ 
            userId: user.id, 
            'riskAssessment.status': { $in: ['pending', 'followup'] } 
        }, null, { sort: { updatedAt: -1 } });
        
        if (!chat) {
            chat = await Assessment.findOne({ userId: user.id }, null, { sort: { updatedAt: -1 } });
            if (chat && chat.riskAssessment.status === 'completed' && wantsDeeper) {
                chat.riskAssessment.status = 'followup';
                await chat.save();
            } else if (chat && chat.riskAssessment.status === 'completed') {
                const wasRecent = (Date.now() - new Date(chat.updatedAt).getTime()) < 30 * 60 * 1000;
                if (!wasRecent) chat = null;
            }
        }

        if (!chat) {
            chat = new Assessment({ userId: user.id, messages: [] });
        }

        const isFollowup = chat.riskAssessment.status === 'followup';
        const activePrompt = isFollowup ? FOLLOWUP_PROMPT : SYSTEM_PROMPT;

        chat.messages.push({ role: 'user', content: message });

        const history = chat.messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        let botReply = await callGemini(activePrompt, history, message);

        const jsonMatch = botReply.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
        let updatedData = {};
        if (jsonMatch) {
            try {
                updatedData = JSON.parse(jsonMatch[1]);
                botReply = botReply.replace(jsonMatch[0], '').trim();
                Object.keys(updatedData).forEach(key => {
                    if (key !== 'ready_to_predict' && chat.extractedData[key] !== undefined) {
                        chat.extractedData[key] = updatedData[key];
                    }
                });
            } catch (e) {
                console.error("Failed to parse extracted JSON", e);
            }
        }

        botReply = botReply.replace(/```json[\s\S]*?```/gi, '');
        botReply = botReply.replace(/```[\s\S]*?```/gi, '');
        botReply = botReply.trim();

        chat.messages.push({ role: 'model', content: botReply });
        await chat.save();

        const filledFields = Object.values(chat.extractedData).filter(v => v !== null).length;
        const readyToPredict = updatedData.ready_to_predict === true;
        
        const followupFieldsList = ['AnyHealthcare', 'NoDocbcCost', 'MentHlth', 'PhysHlth', 'DiffWalk', 'Education', 'Income'];
        const filledFollowup = followupFieldsList.filter(f => chat.extractedData[f] !== null).length;

        const shouldPredict = isFollowup 
            ? (!wantsDeeper && ((readyToPredict && filledFollowup >= 4) || filledFollowup >= 6 || (message.toLowerCase().includes('score') && message.length < 15)))
            : (filledFields >= 5 || readyToPredict || message.toLowerCase().includes('score'));

        if (shouldPredict) {
            const payload = buildPayload(chat.extractedData);
            try {
                const mlResponse = await axios.post(`${ML_API_URL}/predict`, payload);
                chat.riskAssessment = {
                    ...mlResponse.data,
                    status: 'completed',
                    lastUpdated: new Date()
                };
                await chat.save();

                const riskMsg = `\n\n🩺 Updated Diabetes Risk Assessment:\n• Risk Level: **${chat.riskAssessment.risk_level}**\n• Confidence Score: **${chat.riskAssessment.confidence_score}**\n• Probability: **${Math.round(chat.riskAssessment.probability * 100)}%**\n\nThis assessment is for screening only.`;
                
                return NextResponse.json({
                    reply: botReply + riskMsg,
                    riskAssessment: chat.riskAssessment,
                    complete: true
                });
            } catch (err) {
                console.error("ML API Error:", err);
            }
        }

        return NextResponse.json({
            reply: botReply,
            riskAssessment: chat.riskAssessment,
            complete: false
        });

    } catch (error) {
        console.error("Chat Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
