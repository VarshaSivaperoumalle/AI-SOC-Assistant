import pandas as pd
import xgboost as xgb
from pathlib import Path
import joblib

print("Loading training data...")

X_train = pd.read_csv("data/X_train.csv")
y_train = pd.read_csv("data/y_train.csv").squeeze()

print("Training samples:", len(X_train))
print("Features:", X_train.shape[1])

print("\nStarting XGBoost training...")

model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=8,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="multi:softprob",
    num_class=3,
    eval_metric="mlogloss",
    tree_method="hist",
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

print("\nTraining completed!")

# Create model directory
Path("models").mkdir(exist_ok=True)

# Save model
model_path = "models/xgboost_threat_classifier.joblib"
joblib.dump(model, model_path)

print("\nModel saved to:")
print(model_path)