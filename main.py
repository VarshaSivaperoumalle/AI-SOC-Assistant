from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from predict import predict_threat
from llm_analyzer import analyze_incident
from incident_loader import load_next_incident


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="AI SOC Assistant",
    description="AI-powered security incident threat classification and analysis API",
    version="1.0"
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HOME API
# ============================================================

@app.get("/")
def home():
    return {
        "message": "AI SOC Assistant API is running"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "XGBoost",
        "llm": "Llama 3.2",
        "rag": "FAISS"
    }


# ============================================================
# LOAD NEXT INCIDENT
# ============================================================

@app.get("/incidents/next")
def next_incident():

    incident = load_next_incident()

    return {
        "incident_id": f"INC-{incident['sample_index']:03d}",
        "attack_type": incident["attack_type"],
        "sample_index": incident["sample_index"],
        "features": incident["features"]
    }


# ============================================================
# LOAD + XGBOOST ANALYSIS
# ============================================================

@app.get("/incidents/next/analyze")
def analyze_next_incident():

    # Load next CIC-IDS2017 incident
    incident = load_next_incident()

    # Copy features
    features = incident["features"].copy()

    # Remove original dataset label
    features.pop("Label", None)

    # XGBoost prediction
    prediction = predict_threat(features)

    return {
        "incident_id": f"INC-{incident['sample_index']:03d}",
        "dataset_attack_type": incident["attack_type"],
        "sample_index": incident["sample_index"],
        "threat_class": prediction["threat_class"],
        "confidence": prediction["confidence"],
        "risk_score": prediction["risk_score"]
    }


# ============================================================
# FULL INCIDENT ANALYSIS
# XGBOOST + RISK SCORE + RAG + LLAMA 3.2
# ============================================================

@app.get("/incidents/next/full-analysis")
def full_analysis_next_incident():

    # --------------------------------------------------------
    # Step 1: Load next incident
    # --------------------------------------------------------

    incident = load_next_incident()

    # --------------------------------------------------------
    # Step 2: Copy incident features
    # --------------------------------------------------------

    features = incident["features"].copy()

    # --------------------------------------------------------
    # Step 3: Remove original CIC-IDS2017 label
    # --------------------------------------------------------

    features.pop("Label", None)

    # --------------------------------------------------------
    # Step 4: XGBoost prediction
    # --------------------------------------------------------

    prediction = predict_threat(features)

    # --------------------------------------------------------
    # Step 5: RAG + Llama 3.2 analysis
    # --------------------------------------------------------

    ai_analysis = analyze_incident(
        threat_class=prediction["threat_class"],
        confidence=prediction["confidence"],
        risk_score=prediction["risk_score"]
    )

    # --------------------------------------------------------
    # Step 6: Return complete incident result
    # --------------------------------------------------------

    return {
        "incident_id": f"INC-{incident['sample_index']:03d}",
        "dataset_attack_type": incident["attack_type"],
        "sample_index": incident["sample_index"],
        "threat_class": prediction["threat_class"],
        "confidence": prediction["confidence"],
        "risk_score": prediction["risk_score"],
        "ai_analysis": ai_analysis,
        "features": features
    }


# ============================================================
# MANUAL PREDICTION API
# ============================================================

@app.post("/predict")
def predict(data: dict):

    # --------------------------------------------------------
    # Step 1: XGBoost prediction
    # --------------------------------------------------------

    prediction = predict_threat(data)

    # --------------------------------------------------------
    # Step 2: RAG + Llama 3.2 analysis
    # --------------------------------------------------------

    analysis = analyze_incident(
        threat_class=prediction["threat_class"],
        confidence=prediction["confidence"],
        risk_score=prediction["risk_score"]
    )

    # --------------------------------------------------------
    # Step 3: Return result
    # --------------------------------------------------------

    return {
        "threat_class": prediction["threat_class"],
        "confidence": prediction["confidence"],
        "risk_score": prediction["risk_score"],
        "ai_analysis": analysis
    }