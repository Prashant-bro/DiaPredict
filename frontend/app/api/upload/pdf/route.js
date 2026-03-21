import { verifyAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Assessment from "@/lib/models/Assessment";
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        await dbConnect();
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get('report');

        if (!file) {
            return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64PDF = buffer.toString("base64");

        const extractionPrompt = `You are a medical data extraction tool. Extract the following potential diabetes risk factors from this medical report. 
        Output ONLY a JSON object matching these keys (use generic sensible values like or any numeric value whatever is required).
        If user says No then imagine it to 0 and Yes for 1.
        Keys: HighBP, HighChol, BMI, Smoker, Stroke, GenHlth, Sex, Age, HvyAlcoholConsump, PhysActivity, Fruits, Veggies, DiffWalk, MentHlth, PhysHlth`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let result = await model.generateContent([
            extractionPrompt,
            {
                inlineData: {
                    data: base64PDF,
                    mimeType: "application/pdf"
                }
            }
        ]);

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);
        let extractedData = {};

        if (jsonMatch) {
            try {
                extractedData = JSON.parse(jsonMatch[0].replace(/```json|```/g, ''));
            } catch (e) {
                console.error("JSON Parse Error:", e);
            }
        }

        let chat = await Assessment.findOne({ userId: user.id, 'riskAssessment.status': 'pending' }).sort({ updatedAt: -1 });
        if (!chat) {
            chat = new Assessment({ userId: user.id, messages: [] });
        }

        Object.keys(extractedData).forEach(key => {
            if (chat.extractedData[key] !== undefined) {
                chat.extractedData[key] = extractedData[key];
            }
        });

        chat.messages.push({
            role: 'model',
            content: `I have successfully scanned your medical report and extracted several health metrics. I still need a few more details to complete your risk assessment. What is your current physical activity level?`
        });

        await chat.save();
        return NextResponse.json({ 
            message: "Report processed successfully", 
            extractedData 
        });

    } catch (error) {
        console.error("PDF Processing Error:", error);
        return NextResponse.json({ message: "Error processing document" }, { status: 500 });
    }
}
