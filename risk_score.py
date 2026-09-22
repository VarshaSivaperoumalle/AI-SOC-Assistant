import pandas as pd
import joblib
import numpy as np

print("Loading model...")

model = joblib.load("models/xgboost_threat_classifier.joblib")

print("Loading test data...")

X_test = pd.read_csv("data/X_test.csv")
y_test = pd.read_csv("data/y_test.csv").squeeze()

print("Generating predictions...")

predictions = model.predict(X_test)
probabilities = model.predict_proba(X_test)

def calculate_risk(predicted_class, confidence):

    if predicted_class == 0:       # BENIGN
        return confidence * 30

    elif predicted_class == 1:     # SUSPICIOUS
        return 30 + (confidence * 40)

    else:                           # MALICIOUS
        return 70 + (confidence * 30)


risk_scores = []

for prediction, probability in zip(predictions, probabilities):

    confidence = probability[prediction]

    score = calculate_risk(
        prediction,
        confidence
    )

    risk_scores.append(round(score, 2))


results = pd.DataFrame({
    "Actual_Class": y_test,
    "Predicted_Class": predictions,
    "Confidence": np.max(probabilities, axis=1),
    "Risk_Score": risk_scores
})

print("\nSample risk scores:")
print(results.head(10))

print("\nRisk score range:")
print("Minimum:", results["Risk_Score"].min())
print("Maximum:", results["Risk_Score"].max())

results.to_csv(
    "data/predictions_with_risk.csv",
    index=False
)

print("\nSaved:")
print("data/predictions_with_risk.csv")