import json
import os
import urllib.request

from rag_retriever import retrieve_knowledge


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


def analyze_incident(threat_class, confidence, risk_score):

    query = (
        f"{threat_class} security classification, "
        f"investigation guidance, network indicators, "
        f"and incident triage"
    )

    knowledge = retrieve_knowledge(query, top_k=3)

    context = "\n\n--- KNOWLEDGE ITEM ---\n\n".join(
        item["text"] for item in knowledge
    )

    prompt = f"""
You are an AI Security Operations Center (SOC) assistant.

Analyze the following machine-learning prediction using ONLY the
retrieved security knowledge.

IMPORTANT:
The predicted threat class is the primary classification.
Do not mix information belonging to other threat classes.

INCIDENT:
Threat class: {threat_class}
Confidence: {confidence}
Risk score: {risk_score}

RETRIEVED SECURITY KNOWLEDGE:
{context}

Write a concise SOC analyst report using exactly these sections:

1. THREAT ASSESSMENT
Explain what the predicted class means according to the retrieved
security knowledge.

2. WHY IT MATTERS
Explain why this classification matters according to the retrieved
security knowledge.

3. INVESTIGATION STEPS
Give only investigation steps supported by the retrieved knowledge.
Do not invent evidence.

4. MITRE ATT&CK CONTEXT
Use only MITRE ATT&CK information explicitly present in the
retrieved knowledge.
Never invent a technique ID.

If no relevant ATT&CK information is available, write:
"No MITRE ATT&CK context is available in the retrieved knowledge."

5. FINAL ASSESSMENT
Summarize the ML prediction, confidence, risk score, and investigation
priority.

Clearly state that the prediction is an indication and not proof
of an attack.

STRICT RULES:
- Use ONLY the retrieved security knowledge.
- Do not invent evidence.
- Do not invent IP addresses, users, devices, logs, attacks,
  vulnerabilities, or other evidence.
- Do not invent MITRE ATT&CK information.
- Do not assume SUSPICIOUS means MALICIOUS.
- PortScan and Bot are SUSPICIOUS classifications in this project.
- Do not associate BENIGN with attack categories.
- If information is missing, say:
  "Insufficient information in the available security knowledge."
- Keep the report concise and suitable for a SOC analyst.
"""

    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        return (
            "AI analysis unavailable: GROQ_API_KEY is not configured."
        )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a security operations center assistant. "
                    "Follow the supplied security knowledge strictly."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2,
        "max_tokens": 1200
    }

    request = urllib.request.Request(
        GROQ_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))

        return result["choices"][0]["message"]["content"]

    except Exception as error:
        return f"AI analysis unavailable: {error}"


if __name__ == "__main__":
    print(
        analyze_incident(
            threat_class="SUSPICIOUS",
            confidence=0.9905,
            risk_score=69.62
        )
    )
