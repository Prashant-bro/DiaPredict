import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [{
        role: { type: String, enum: ['user', 'model'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    extractedData: {
        HighBP: { type: Number, default: null },
        HighChol: { type: Number, default: null },
        CholCheck: { type: Number, default: null },
        BMI: { type: Number, default: null },
        Smoker: { type: Number, default: null },
        Stroke: { type: Number, default: null },
        HeartDiseaseorAttack: { type: Number, default: null },
        PhysActivity: { type: Number, default: null },
        Fruits: { type: Number, default: null },
        Veggies: { type: Number, default: null },
        HvyAlcoholConsump: { type: Number, default: null },
        AnyHealthcare: { type: Number, default: null },
        NoDocbcCost: { type: Number, default: null },
        GenHlth: { type: Number, default: null },
        MentHlth: { type: Number, default: null },
        PhysHlth: { type: Number, default: null },
        DiffWalk: { type: Number, default: null },
        Sex: { type: Number, default: null },
        Age: { type: Number, default: null },
        Education: { type: Number, default: null },
        Income: { type: Number, default: null }
    },
    riskAssessment: {
        risk_level: String,
        probability: Number,
        confidence_score: String,
        status: { type: String, enum: ['pending', 'followup', 'completed'], default: 'pending' },
        lastUpdated: { type: Date, default: Date.now }
    }
}, { timestamps: true });

export default mongoose.models.Assessment || mongoose.model('Assessment', assessmentSchema);
