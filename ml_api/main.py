from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import os

app = FastAPI(title="Diabetes Risk Assessment API", version="1.0.0")

# Enable CORS for frontend/backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and feature names (Global cache)
MODEL_PATH = "lightgbm_diabetes_model.pkl"
FEATURES_PATH = "feature_names.pkl"

model = None
feature_names = None

@app.on_event("startup")
def load_artifacts():
    global model, feature_names
    if os.path.exists(MODEL_PATH) and os.path.exists(FEATURES_PATH):
        model = joblib.load(MODEL_PATH)
        feature_names = joblib.load(FEATURES_PATH)
        print("Model and features loaded successfully.")
    else:
        print("Warning: Model artifacts not found. Please train the model first.")

class PatientData(BaseModel):
    HighBP: float
    HighChol: float
    CholCheck: float
    BMI: float
    Smoker: float
    Stroke: float
    HeartDiseaseorAttack: float
    PhysActivity: float
    Fruits: float
    Veggies: float
    HvyAlcoholConsump: float
    AnyHealthcare: float
    NoDocbcCost: float
    GenHlth: float
    MentHlth: float
    PhysHlth: float
    DiffWalk: float
    Sex: float
    Age: float
    Education: float
    Income: float

@app.get("/")
def root():
    return {
        "service": "Diabetes Risk Assessment ML API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "/health": "GET - Health check",
            "/predict": "POST - Predict diabetes risk",
        }
    }

@app.get("/health")
def health_check():
    if model is None:
        return {"status": "unhealthy", "message": "Model not loaded"}
    return {"status": "healthy", "message": "Service is running and model is loaded"}

@app.post("/predict")
def predict_risk(data: PatientData):
    if model is None or feature_names is None:
        raise HTTPException(status_code=503, detail="Model is currently unavailable. Ensure training has completed.")

    try:
        # Convert incoming JSON dict to DataFrame
        input_data = pd.DataFrame([data.dict()])
        
        # Ensure correct column order expected by LightGBM
        input_data = input_data[feature_names]
        
        # Make prediction
        prediction = model.predict(input_data)[0]
        probability = model.predict_proba(input_data)[0][1] # Probability of Class 1 (Yes)
        
        # Calculate risk level conceptually based on probability for chatbot UI
        if probability < 0.3:
            risk_level = "Low Risk"
        elif probability < 0.7:
            risk_level = "Moderate Risk"
        else:
            risk_level = "High Risk"

        return {
            "prediction_class": int(prediction),
            "probability": float(probability),
            "risk_level": risk_level,
            "confidence_score": f"{probability * 100:.2f}%"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
