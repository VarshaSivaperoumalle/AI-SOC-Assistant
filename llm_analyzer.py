import ollama
from rag_retriever import retrieve_knowledge


def analyze_incident(threat_class, confidence, risk_score):

    query = (
        f"{threat_class} security classification, "
        f"investigation guidance, network indicators, "
        f"and incident triage"
    )

    knowledge = retrieve_knowledge(query, top_k=3)

    context = "\n\n--- KNOWLEDGE ITEM ---\n\n".join(
        [item["text"] for item in knowledge]
    )

    prompt = f"""
You are an AI Security Operations Center (SOC) assistant.

Analyze the following machine-learning prediction using ONLY the
retrieved security knowledge.

IMPORTANT:
The predicted threat class is the primary classification.
Only use retrieved information that is relevant to this predicted class.
Do not mix information belonging to other threat classes into the
assessment of this incident.

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

Only describe behavior associated with the predicted class.

If the predicted class is BENIGN, explain it as benign network activity.
Do NOT associate BENIGN with PortScan, Bot, DDoS, DoS, brute force,
SQL injection, XSS, infiltration, Heartbleed, or other attack categories.

If the predicted class is SUSPICIOUS, explain it using information
specifically associated with SUSPICIOUS activity.

If the predicted class is MALICIOUS, explain it using information
specifically associated with MALICIOUS activity.

2. WHY IT MATTERS
Explain why this classification deserves attention according to
the retrieved security knowledge.

Do not introduce an attack category that does not belong to the
predicted class.

For BENIGN activity, do not describe it as an attack or precursor
to an attack unless the retrieved knowledge explicitly supports that
statement.

3. INVESTIGATION STEPS
Give ONLY investigation steps supported by the retrieved knowledge.

Prefer concrete network indicators such as:
- source and destination
- connection frequency
- contacted ports
- timing
- repeated connections
- unusual destination patterns
- related security events

Do NOT add generic investigation steps unless they are explicitly
supported by the retrieved knowledge.

Do NOT invent evidence or assume that an investigation has already
found suspicious activity.

4. MITRE ATT&CK CONTEXT
Use ONLY MITRE ATT&CK information explicitly present in the
retrieved security knowledge.

If the knowledge mentions reconnaissance, network service discovery,
or port scanning but does not provide a specific ATT&CK technique ID,
describe that context without inventing a technique ID.

However, only include such context when it is relevant to the
predicted threat class.

If no relevant ATT&CK information is available, write exactly:

"No MITRE ATT&CK context is available in the retrieved knowledge."

Never invent an ATT&CK tactic, technique, sub-technique, procedure,
or technique ID.

5. FINAL ASSESSMENT
Summarize:
- ML prediction
- confidence
- risk score
- investigation priority

Clearly state that the prediction is an indication and not proof
of an attack.

Do not call the activity a false positive unless the retrieved
security knowledge explicitly supports that conclusion.

Do not claim that the activity is malicious unless the retrieved
knowledge supports that conclusion.

STRICT GROUNDING RULES:

- Use ONLY the retrieved security knowledge.
- Use only knowledge relevant to the predicted threat class.
- The predicted class must remain the primary classification.
- Do NOT mix BENIGN, SUSPICIOUS, and MALICIOUS information.
- Do NOT use outside knowledge.
- Do NOT invent evidence.
- Do NOT invent IP addresses, users, devices, logs, attacks,
  vulnerabilities, or other evidence.
- Do NOT invent MITRE ATT&CK information.
- Do NOT assume SUSPICIOUS means MALICIOUS.
- Do NOT associate BENIGN with PortScan, Bot, or other attack categories.
- PortScan and Bot are SUSPICIOUS classifications in this project.
- Do not describe an unrelated attack category as evidence for
  the predicted class.
- Do not call an activity a false positive unless the retrieved
  knowledge explicitly supports that conclusion.
- A machine-learning prediction is an indication, not proof.
- If information is missing, say:
  "Insufficient information in the available security knowledge."
- Keep the report concise, factual, and suitable for a SOC analyst.
"""

    response = ollama.chat(
        model="llama3.2:3b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response["message"]["content"]


if __name__ == "__main__":

    result = analyze_incident(
        threat_class="SUSPICIOUS",
        confidence=0.9905,
        risk_score=69.62
    )

    print("\n" + "=" * 60)
    print("AI SOC INCIDENT ANALYSIS")
    print("=" * 60)
    print(result)