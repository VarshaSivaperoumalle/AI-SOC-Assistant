import pandas as pd
import joblib


# ============================================================
# Load trained XGBoost model
# ============================================================

model = joblib.load("models/xgboost_threat_classifier.joblib")


# ============================================================
# Threat class names
# ============================================================

CLASS_NAMES = {
    0: "BENIGN",
    1: "SUSPICIOUS",
    2: "MALICIOUS"
}


# ============================================================
# Risk score calculation
# ============================================================

def calculate_risk(predicted_class, confidence):

    if predicted_class == 0:
        # BENIGN: 0-30
        return round(confidence * 30, 2)

    elif predicted_class == 1:
        # SUSPICIOUS: 30-70
        return round(30 + (confidence * 40), 2)

    else:
        # MALICIOUS: 70-100
        return round(70 + (confidence * 30), 2)


# ============================================================
# Threat prediction
# ============================================================

def predict_threat(data):

    # Convert incoming JSON data into a DataFrame
    df = pd.DataFrame([data])

    # --------------------------------------------------------
    # Get the exact feature order used during model training
    # --------------------------------------------------------

    expected_features = model.get_booster().feature_names

    # --------------------------------------------------------
    # Check whether any required features are missing
    # --------------------------------------------------------

    missing_features = [
        feature
        for feature in expected_features
        if feature not in df.columns
    ]

    if missing_features:
        raise ValueError(
            f"Missing required features: {missing_features}"
        )

    # --------------------------------------------------------
    # Reorder incoming features to match the trained model
    # --------------------------------------------------------

    df = df[expected_features]

    # --------------------------------------------------------
    # Make threat prediction
    # --------------------------------------------------------

    prediction = int(model.predict(df)[0])

    # --------------------------------------------------------
    # Get class probabilities
    # --------------------------------------------------------

    probabilities = model.predict_proba(df)[0]

    confidence = float(probabilities[prediction])

    # --------------------------------------------------------
    # Convert numeric class to project class name
    # --------------------------------------------------------

    threat_class = CLASS_NAMES[prediction]

    # --------------------------------------------------------
    # Calculate risk score
    # --------------------------------------------------------

    risk_score = calculate_risk(
        prediction,
        confidence
    )

    # --------------------------------------------------------
    # Return prediction result
    # --------------------------------------------------------

    return {
        "threat_class": threat_class,
        "confidence": round(confidence, 4),
        "risk_score": risk_score
    }


# ============================================================
# Module test message
# ============================================================

print("Prediction module loaded successfully.")