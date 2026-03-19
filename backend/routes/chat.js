const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Assessment = require('../models/Assessment');
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');

// Initialize Gemini SDK inside the route or dynamically to ensure dotenv is loaded first
const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

const SYSTEM_PROMPT = `You are a friendly, professional medical assistant chatbot for a diabetes risk screening tool.
Your ONLY job is to collect health data from the user so our ML model can predict their diabetes risk.
Ask exactly ONE question at a time. DO NOT list multiple questions. DO NOT ask a question if the user has already provided the information.

CRITICAL RULES:
- NEVER tell the user to "visit a clinic", "see a doctor", "get tested", or any similar medical advice.
- NEVER attempt to diagnose or assess their risk yourself.
- NEVER say things like "based on what you've told me, you should get checked."
- Your ONLY purpose is to collect data. The ML model will do the prediction, NOT you.
- When you have collected enough data, simply say something like "Thank you! I now have enough information to run your risk assessment. Let me calculate your score now."

Collect these features naturally (conversational):
- HighBP (High Blood Pressure history: 0=No, 1=Yes)
- HighChol (High Cholesterol history: 0=No, 1=Yes)
- CholCheck (Cholesterol checked in 5 years: 0=No, 1=Yes)
- BMI (Body Mass Index - you can calculate this if they give height/weight)
- Smoker (Smoked 100+ cigarettes in life: 0=No, 1=Yes)
- Stroke (History of stroke: 0=No, 1=Yes)
- HeartDiseaseorAttack (Coronary Heart Disease or Myocardial Infarction: 0=No, 1=Yes)
- PhysActivity (Physical activity in past 30 days: 0=No, 1=Yes)
- Fruits (Consumes fruit 1+ times/day: 0=No, 1=Yes)
- Veggies (Consumes veggies 1+ times/day: 0=No, 1=Yes)
- HvyAlcoholConsump (Heavy drinker: 0=No, 1=Yes)
- GenHlth (General Health rating 1-5 where 1=Excellent, 5=Poor)
- Sex (0=Female, 1=Male)
- Age (Categorical 1-13 where 1=18-24 ... 13=80+)

Always maintain empathy and clarify you are an AI screening tool, not a doctor.
At the END of every message you send, output a secret JSON block enclosed in \`\`\`json\`\`\` containing keys for any of the above variables you have extracted so far as numbers (0 or 1 usually, or specific bins for age/health). If a value is unknown, omit it from the JSON.
When you believe you have collected enough data (at least 5 fields filled), add "ready_to_predict": true to the JSON block. This signals our system to run the ML prediction.`;

const FOLLOWUP_PROMPT = `You are a friendly, professional medical assistant chatbot for a diabetes risk screening tool.
The user has ALREADY completed an initial screening. Their initial result has been shown to them.
Now they want DEEPER INSIGHTS by providing MORE detailed information.

CRITICAL RULES:
- NEVER tell the user to "visit a clinic", "see a doctor", "get tested", or any similar medical advice.
- NEVER attempt to diagnose or assess their risk yourself.
- DO NOT re-ask questions about data already collected. The user already answered the initial screening questions.
- Ask exactly ONE question at a time.
- Your ONLY purpose is to collect ADDITIONAL data so our ML model can give a more accurate prediction.

Now collect these ADDITIONAL features one at a time (these were NOT asked in the initial screening):
- AnyHealthcare (Do you have any form of health coverage/insurance? 0=No, 1=Yes)
- NoDocbcCost (Was there a time in the past 12 months you needed to see a doctor but could not because of cost? 0=No, 1=Yes)
- MentHlth (How many days in the past 30 days was your mental health not good? 0-30)
- PhysHlth (How many days in the past 30 days was your physical health not good? 0-30)
- DiffWalk (Do you have serious difficulty walking or climbing stairs? 0=No, 1=Yes)
- Education (Education level 1-6 where 1=Never attended, 6=College graduate)
- Income (Income level 1-8 where 1=Less than $10k ... 8=$75k+)

At the END of every message, output a secret JSON block enclosed in \`\`\`json\`\`\` with the keys for extracted variables as numbers.
DO NOT add "ready_to_predict": true until you have collected at least 5 of these additional fields. I need lots of detail for the deeper insights flow.`;

// Helper: call Gemini with fallback
async function callGemini(systemPrompt, history, message) {
    try {
        const genAI = getGenAI();
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const model = genAI.getGenerativeModel({ model: modelName });
        const chatLog = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "Understood. I will follow these instructions." }] },
                ...history
            ],
        });
        const result = await chatLog.sendMessage(message);
        return result.response.text();
    } catch (error) {
        console.warn("Primary model failed, attempting fallback to gemini-1.5-pro", error.message);
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const chatLog = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: "Understood." }] },
                ...history
            ],
        });
        const result = await chatLog.sendMessage(message);
        return result.response.text();
    }
}

// Helper: build ML payload from extractedData
function buildPayload(data) {
    return {
        HighBP: data.HighBP ?? 0,
        HighChol: data.HighChol ?? 0,
        CholCheck: data.CholCheck ?? 1,
        BMI: data.BMI ?? 28.0,
        Smoker: data.Smoker ?? 0,
        Stroke: data.Stroke ?? 0,
        HeartDiseaseorAttack: data.HeartDiseaseorAttack ?? 0,
        PhysActivity: data.PhysActivity ?? 1,
        Fruits: data.Fruits ?? 1,
        Veggies: data.Veggies ?? 1,
        HvyAlcoholConsump: data.HvyAlcoholConsump ?? 0,
        AnyHealthcare: data.AnyHealthcare ?? 1,
        NoDocbcCost: data.NoDocbcCost ?? 0,
        GenHlth: data.GenHlth ?? 3,
        MentHlth: data.MentHlth ?? 0,
        PhysHlth: data.PhysHlth ?? 0,
        DiffWalk: data.DiffWalk ?? 0,
        Sex: data.Sex ?? 0,
        Age: data.Age ?? 8,
        Education: data.Education ?? 5,
        Income: data.Income ?? 6
    };
}

// Helper: format risk result message
function formatRiskMessage(results, isFollowup = false) {
    const label = isFollowup ? 'Updated Diabetes Risk Assessment' : 'Diabetes Risk Assessment Results';
    return `\n\n🩺 **${label}:**\n` +
        `• Risk Level: **${results.risk_level}**\n` +
        `• Confidence Score: **${results.confidence_score}**\n` +
        `• Probability: **${(results.probability * 100).toFixed(1)}%**\n\n` +
        (isFollowup 
            ? `_This updated assessment uses more detailed information for improved accuracy. This is still a screening tool, not a medical diagnosis._`
            : `_This is an AI-based screening result and not a medical diagnosis._\n\n💡 **Want more accurate results?** Type "deeper insights" and I'll ask a few more questions to refine your risk score.`);
}

// GET /api/chat (Retrieve history)
router.get('/', protect, async (req, res) => {
    try {
        // Find latest assessment (completed, followup, or pending)
        const chat = await Assessment.findOne(
            { userId: req.user._id },
            null,
            { sort: { updatedAt: -1 } }
        );

        if (!chat) {
            return res.json({ messages: [], riskAssessment: null, extractedData: {} });
        }

        res.json({
            messages: chat.messages,
            riskAssessment: chat.riskAssessment,
            extractedData: chat.extractedData,
            status: chat.riskAssessment.status
        });
    } catch (error) {
        console.error("History Retrieval Error:", error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/', protect, async (req, res) => {
    try {
        const { message } = req.body;

        // Check if user wants deeper insights on a completed assessment
        const wantsDeeper = message.toLowerCase().includes('deeper insight') || 
                            message.toLowerCase().includes('more accurate') ||
                            message.toLowerCase().includes('more detail') ||
                            message.toLowerCase().includes('refine');

        // Find existing assessment - check for non-completed ones first
        let chat = await Assessment.findOne({ 
            userId: req.user._id, 
            'riskAssessment.status': { $in: ['pending', 'followup'] } 
        }, null, { sort: { updatedAt: -1 } });
        
        // If not found, check if most recent completed one should be re-opened for followup
        if (!chat) {
            chat = await Assessment.findOne({ userId: req.user._id }, null, { sort: { updatedAt: -1 } });
            
            // If it's completed and the user wants deeper insights, reopen it
            if (chat && chat.riskAssessment.status === 'completed' && wantsDeeper) {
                chat.riskAssessment.status = 'followup';
                await chat.save();
            } else if (chat && chat.riskAssessment.status === 'completed') {
                // If the user's message is just a "yes/no" or similar, it might be a dangling response
                // after a prediction. Let's start a new one only if the last was more than 30 mins ago.
                const wasRecent = (Date.now() - new Date(chat.updatedAt).getTime()) < 30 * 60 * 1000;
                if (!wasRecent) {
                    chat = null;
                }
            }
        }

        if (!chat) {
            chat = new Assessment({ userId: req.user._id, messages: [] });
        }

        const isFollowup = chat.riskAssessment.status === 'followup';
        const activePrompt = isFollowup ? FOLLOWUP_PROMPT : SYSTEM_PROMPT;

        chat.messages.push({ role: 'user', content: message });

        // Format history for Gemini
        const history = chat.messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        // Call Gemini
        let botReply = await callGemini(activePrompt, history, message);

        // Extract JSON state
        const jsonMatch = botReply.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
        let updatedData = {};
        if (jsonMatch) {
            try {
                updatedData = JSON.parse(jsonMatch[1]);
                botReply = botReply.replace(jsonMatch[0], '').trim();

                // Merge extracted data
                Object.keys(updatedData).forEach(key => {
                    if (key !== 'ready_to_predict' && chat.extractedData[key] !== undefined) {
                        chat.extractedData[key] = updatedData[key];
                    }
                });
            } catch (e) {
                console.error("Failed to parse extracted JSON from bot.", e);
            }
        }

        // AGGRESSIVE CLEANUP: Remove ANY remaining technical markers in case the regex/parser failed
        botReply = botReply.replace(/```json[\s\S]*?```/gi, '');
        botReply = botReply.replace(/```[\s\S]*?```/gi, ''); // Any other code blocks
        botReply = botReply.replace(/```json/gi, ''); // Partial tags
        botReply = botReply.replace(/```/gi, ''); // Remaining backticks
        botReply = botReply.trim();

        chat.messages.push({ role: 'model', content: botReply });
        await chat.save();

        // Check if we should trigger prediction
        const filledFields = Object.values(chat.extractedData).filter(v => v !== null).length;
        const readyToPredict = updatedData.ready_to_predict === true;
        
        // Specifically for followup, count how many followup-specific fields we have
        const followupFields = ['AnyHealthcare', 'NoDocbcCost', 'MentHlth', 'PhysHlth', 'DiffWalk', 'Education', 'Income'];
        const filledFollowup = followupFields.filter(f => chat.extractedData[f] !== null).length;

        const shouldPredict = isFollowup 
            ? (!wantsDeeper && ((readyToPredict && filledFollowup >= 4) || filledFollowup >= 6 || (message.toLowerCase().includes('score') && message.length < 15)))
            : (filledFields >= 5 || readyToPredict || message.toLowerCase().includes('score'));

        if (shouldPredict) {
            const payload = buildPayload(chat.extractedData);

            try {
                const mlResponse = await axios.post(`${ML_API_URL}/predict`, payload);
                const results = mlResponse.data;

                chat.riskAssessment = {
                    status: 'completed',
                    prediction_class: results.prediction_class,
                    probability: results.probability,
                    risk_level: results.risk_level,
                    confidence_score: results.confidence_score
                };
                await chat.save();

                const riskMessage = formatRiskMessage(results, isFollowup);

                return res.json({
                    reply: botReply + riskMessage,
                    riskAssessment: chat.riskAssessment,
                    complete: true
                });

            } catch (mlError) {
                console.error("ML API Error:", mlError.message);
                return res.json({ reply: botReply + "\n\n(Note: I tried to calculate your score, but our risk assessment engine is currently unavailable.)", complete: false });
            }
        }

        res.json({ reply: botReply, complete: false });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
