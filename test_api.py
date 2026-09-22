import pandas as pd
import json
import urllib.request

# Load one real test sample
X_test = pd.read_csv("data/X_test.csv")

# Take the first row
sample = X_test.iloc[0].to_dict()

# Convert NumPy values to normal Python values
sample = {
    key: float(value)
    for key, value in sample.items()
}

# Convert to JSON
data = json.dumps(sample).encode("utf-8")

# Create API request
request = urllib.request.Request(
    "http://127.0.0.1:8000/predict",
    data=data,
    headers={
        "Content-Type": "application/json"
    },
    method="POST"
)

print("Sending test network flow to API...\n")

try:
    with urllib.request.urlopen(request) as response:
        result = response.read().decode("utf-8")

        print("API Response:")
        print(result)

except Exception as e:
    print("API request failed:")
    print(e)