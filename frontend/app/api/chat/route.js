import dbConnect from "@/lib/db";
import Assessment from "@/lib/models/Assessment";
import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import axios from 'axios';


const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';


const SYSTEM_PROMPT = `
You are DiaRisk AI, a professional medical assistant specialized in diabetes risk screening.
Your goal is to collect health data from the user ONE BY ONE through natural, empathetic conversation.

CRITICAL RULES:
1. Ask exactly ONE question at a time.
2. NEVER output the JSON block to the user. It must be a hidden block at the end of your response.
3. Be empathetic: if a user reports a health issue, acknowledge it professionally.
4. If a user provides multiple pieces of info, extract all of them but only ask for ONE missing piece.
5. Do NOT give medical advice or diagnoses. Say you are a screening tool.

Fields to collect (Extract as 0 for No, 1 for Yes):
- HighBP, HighChol, BMI (ask for height/weight if they don't know BMI), Smoker, Stroke, HeartDiseaseorAttack, PhysActivity, Fruits, Veggies, HvyAlcoholConsump, GenHlth (1-5 scale), Sex (0=F, 1=M), Age (1=18-24, 2=25-29, ..., 13=80+).

MANDATORY JSON FORMAT:
Every single response MUST end with a JSON block in this exact format:
\`\`\`json
{
  "HighBP": 1,
  "BMI": 24.5,
  "ready_to_predict": false
}
\`\`\`
Only set "ready_to_predict": true when you have at least 6-7 key fields.
`;

const FOLLOWUP_PROMPT = `
The user is seeking deeper insights. You need to collect more detailed lifestyle data.
Ask about these fields ONE BY ONE:
- MentHlth (Poor mental health days in last 30), PhysHlth (Poor physical health days in last 30), DiffWalk (Difficulty walking/stairs).

MANDATORY: Follow the same JSON rules as the initial prompt.
`;

import { GoogleGenerativeAI } from '@google/generative-ai';

async function callGemini(systemPrompt, history, message) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt
    });
    const chat = model.startChat({
        history: history,
        generationConfig: { 
            maxOutputTokens: 800,
            temperature: 0.7
        }
    });

    try {
        const result = await chat.sendMessage(message);
        return result.response.text();
    } catch (error) {
        console.error("Gemini SDK Error:", error.message);
        throw new Error("API Rate Limit exceeded or connection failed.");
    }
}

function buildPayload(data) {
    return {
        HighBP: data.HighBP || 0,
        HighChol: data.HighChol || 0,
        BMI: data.BMI || 25,
        Smoker: data.Smoker || 0,
        Stroke: data.Stroke || 0,
        HeartDiseaseorAttack: data.HeartDiseaseorAttack || 0,
        PhysActivity: data.PhysActivity || 1,
        Fruits: data.Fruits || 1,
        Veggies: data.Veggies || 1,
        HvyAlcoholConsump: data.HvyAlcoholConsump || 0,
        GenHlth: data.GenHlth || 3,
        MentHlth: data.MentHlth || 0,
        PhysHlth: data.PhysHlth || 0,
        DiffWalk: data.DiffWalk || 0,
        Sex: data.Sex || 0,
        Age: data.Age || 5,
    };
}

export async function GET(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        // Ensure user.id is correctly parsed if it's a string from JWT
        const chat = await Assessment.findOne({ userId: user.id }).sort({ updatedAt: -1 });
        return NextResponse.json(chat || { messages: [] });
    } catch (error) {
        console.error("[GET /api/chat error]:", error.message);
        return NextResponse.json({ message: "Failed to fetch chat history: " + error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { message } = await req.json();
        if (!message) return NextResponse.json({ message: "Message is required" }, { status: 400 });

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

        const history = chat.messages.slice(0, -1).map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        let botReply;
        try {
            botReply = await callGemini(activePrompt, history, message);
        } catch (gemIniError) {
            console.error("Gemini API Error:", gemIniError.message);
            return NextResponse.json({ message: "AI Assistant is currently unavailable." }, { status: 500 });
        }

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
                const mlResponse = await axios.post(`${ML_API_URL}/predict`, payload, { timeout: 8000 });
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
                console.error("ML API Error:", err.message);
                return NextResponse.json({
                    reply: botReply + "\n\n(Note: I'm currently having trouble calculating your risk score. Please try again in a moment.)",
                    riskAssessment: chat.riskAssessment,
                    complete: false
                });
            }
        }

        return NextResponse.json({
            reply: botReply,
            riskAssessment: chat.riskAssessment,
            complete: false
        });

    } catch (error) {
        console.error("Chat Error:", error.message, error.stack);
        return NextResponse.json({ message: "Internal Server Error: " + error.message }, { status: 500 });
    }
}
