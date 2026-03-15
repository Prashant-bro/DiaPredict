const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Assessment = require('../models/Assessment');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/pdf', protect, upload.single('report'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Use Gemini to extract medical data directly from the PDF
        const extractionPrompt = `You are a medical data extraction tool. Extract the following potential diabetes risk factors from this medical report. 
        Output ONLY a JSON object matching these keys (use generic sensible values like 0 or 1 for booleans).
        If a value is not found, omit it from the JSON.
        Keys: HighBP, HighChol, BMI, Smoker, Stroke, GenHlth, Sex, Age.`;

        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const model = genAI.getGenerativeModel({ model: modelName }); // Use 2.5-flash for multimodal PDF support

        let result;
        try {
            result = await model.generateContent([
                extractionPrompt,
                {
                    inlineData: {
                        data: req.file.buffer.toString("base64"),
                        mimeType: "application/pdf"
                    }
                }
            ]);
        } catch (genError) {
            console.warn("Primary model failed, attempting fallback to gemini-1.5-pro", genError.message);
            const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
            result = await fallbackModel.generateContent([
                extractionPrompt,
                {
                    inlineData: {
                        data: req.file.buffer.toString("base64"),
                        mimeType: "application/pdf"
                    }
                }
            ]);
        }

        const response = result.response;
        const responseText = response.text();

        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);
        let extractedData = {};

        if (jsonMatch) {
            extractedData = JSON.parse(jsonMatch[0].replace(/```json|```/g, ''));
        }

        // Apply to chat baseline
        let chat = await Assessment.findOne({ userId: req.user._id, 'riskAssessment.status': 'pending' });
        if (!chat) {
            chat = new Assessment({ userId: req.user._id, messages: [] });
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
        res.json({ message: "Report processed successfully", extractedData });

    } catch (error) {
        console.error("PDF Processing Error:", error);
        res.status(500).json({ message: "Error processing document" });
    }
});

module.exports = router;
