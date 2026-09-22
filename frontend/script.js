/* =========================================================
   AI SOC ASSISTANT — DASHBOARD LOGIC
   Talks only to the real FastAPI backend at API_BASE.
   No mock predictions, no mock AI analysis are ever created
   client-side — every value shown comes from a real response.
========================================================= */

/* API_BASE, HEALTH_TIMEOUT_MS, HISTORY_KEY, MAX_HISTORY, el(), and the
   health-check + incident-store functions now live in common.js, which
   is loaded before this file on every page — including this one. */
const PREDICT_TIMEOUT_MS = 300000; // RAG + local LLM can be slow

/* ---------------------------------------------------------
   1. FEATURE SCHEMA
   ---------------------------------------------------------
   This is the standard CIC-IDS2017 / CICFlowMeter 78-feature
   set (the schema prepare_features.py's X = df.drop(columns=
   ["Label","Class"]) produces on the MachineLearningCVE
   files). Because the raw CSVs were not available to generate
   this file, the exact column names/order have NOT been
   verified against your training data.

   To guarantee an exact match with your trained model, use
   "Load schema from CSV" and pick X_train.csv or X.csv from
   your data/ folder — the dashboard will read its header row
   and rebuild the form from your real column names, in order.
--------------------------------------------------------- */

const FEATURE_GROUPS = [
  {
    name: "Flow identity & volume",
    fields: [
      "Destination Port", "Flow Duration",
      "Total Fwd Packets", "Total Backward Packets",
      "Total Length of Fwd Packets", "Total Length of Bwd Packets"
    ]
  },
  {
    name: "Packet length statistics",
    fields: [
      "Fwd Packet Length Max", "Fwd Packet Length Min", "Fwd Packet Length Mean", "Fwd Packet Length Std",
      "Bwd Packet Length Max", "Bwd Packet Length Min", "Bwd Packet Length Mean", "Bwd Packet Length Std",
      "Min Packet Length", "Max Packet Length", "Packet Length Mean", "Packet Length Std", "Packet Length Variance",
      "Average Packet Size", "Avg Fwd Segment Size", "Avg Bwd Segment Size"
    ]
  },
  {
    name: "Rate & throughput",
    fields: ["Flow Bytes/s", "Flow Packets/s", "Fwd Packets/s", "Bwd Packets/s"]
  },
  {
    name: "Inter-arrival time (IAT)",
    fields: [
      "Flow IAT Mean", "Flow IAT Std", "Flow IAT Max", "Flow IAT Min",
      "Fwd IAT Total", "Fwd IAT Mean", "Fwd IAT Std", "Fwd IAT Max", "Fwd IAT Min",
      "Bwd IAT Total", "Bwd IAT Mean", "Bwd IAT Std", "Bwd IAT Max", "Bwd IAT Min"
    ]
  },
  {
    name: "TCP flags",
    fields: [
      "Fwd PSH Flags", "Bwd PSH Flags", "Fwd URG Flags", "Bwd URG Flags",
      "FIN Flag Count", "SYN Flag Count", "RST Flag Count", "PSH Flag Count",
      "ACK Flag Count", "URG Flag Count", "CWE Flag Count", "ECE Flag Count"
    ]
  },
  {
    name: "Header & segment",
    fields: ["Fwd Header Length", "Bwd Header Length", "Fwd Header Length.1", "min_seg_size_forward", "act_data_pkt_fwd"]
  },
  {
    name: "Bulk & subflow",
    fields: [
      "Down/Up Ratio",
      "Fwd Avg Bytes/Bulk", "Fwd Avg Packets/Bulk", "Fwd Avg Bulk Rate",
      "Bwd Avg Bytes/Bulk", "Bwd Avg Packets/Bulk", "Bwd Avg Bulk Rate",
      "Subflow Fwd Packets", "Subflow Fwd Bytes", "Subflow Bwd Packets", "Subflow Bwd Bytes"
    ]
  },
  {
    name: "Window & activity timing",
    fields: [
      "Init_Win_bytes_forward", "Init_Win_bytes_backward",
      "Active Mean", "Active Std", "Active Max", "Active Min",
      "Idle Mean", "Idle Std", "Idle Max", "Idle Min"
    ]
  }
];

// A realistic-shaped sample flow, clearly labeled as a test/demo
// vector in the UI. Values are illustrative CICFlowMeter-style
// numbers, not captured from a real network.
const SAMPLE_FLOW = {
  "Destination Port": 6689,
  "Flow Duration": 78,
  "Total Fwd Packets": 1,
  "Total Backward Packets": 1,
  "Total Length of Fwd Packets": 2,
  "Total Length of Bwd Packets": 6,
  "Fwd Packet Length Max": 2,
  "Fwd Packet Length Min": 2,
  "Fwd Packet Length Mean": 2,
  "Fwd Packet Length Std": 0,
  "Bwd Packet Length Max": 6,
  "Bwd Packet Length Min": 6,
  "Bwd Packet Length Mean": 6,
  "Bwd Packet Length Std": 0,
  "Flow Bytes/s": 102564.1026,
  "Flow Packets/s": 25641.02564,
  "Flow IAT Mean": 78,
  "Flow IAT Std": 0,
  "Flow IAT Max": 78,
  "Flow IAT Min": 78,
  "Fwd IAT Total": 0,
  "Fwd IAT Mean": 0,
  "Fwd IAT Std": 0,
  "Fwd IAT Max": 0,
  "Fwd IAT Min": 0,
  "Bwd IAT Total": 0,
  "Bwd IAT Mean": 0,
  "Bwd IAT Std": 0,
  "Bwd IAT Max": 0,
  "Bwd IAT Min": 0,
  "Fwd PSH Flags": 0,
  "Bwd PSH Flags": 0,
  "Fwd URG Flags": 0,
  "Bwd URG Flags": 0,
  "Fwd Header Length": 24,
  "Bwd Header Length": 20,
  "Fwd Packets/s": 12820.51282,
  "Bwd Packets/s": 12820.51282,
  "Min Packet Length": 2,
  "Max Packet Length": 6,
  "Packet Length Mean": 3.333333333,
  "Packet Length Std": 2.309401077,
  "Packet Length Variance": 5.333333333,
  "FIN Flag Count": 0,
  "SYN Flag Count": 0,
  "RST Flag Count": 0,
  "PSH Flag Count": 1,
  "ACK Flag Count": 0,
  "URG Flag Count": 0,
  "CWE Flag Count": 0,
  "ECE Flag Count": 0,
  "Down/Up Ratio": 1,
  "Average Packet Size": 5,
  "Avg Fwd Segment Size": 2,
  "Avg Bwd Segment Size": 6,
  "Fwd Header Length.1": 24,
  "Fwd Avg Bytes/Bulk": 0,
  "Fwd Avg Packets/Bulk": 0,
  "Fwd Avg Bulk Rate": 0,
  "Bwd Avg Bytes/Bulk": 0,
  "Bwd Avg Packets/Bulk": 0,
  "Bwd Avg Bulk Rate": 0,
  "Subflow Fwd Packets": 1,
  "Subflow Fwd Bytes": 2,
  "Subflow Bwd Packets": 1,
  "Subflow Bwd Bytes": 6,
  "Init_Win_bytes_forward": 1024,
  "Init_Win_bytes_backward": 0,
  "act_data_pkt_fwd": 0,
  "min_seg_size_forward": 24,
  "Active Mean": 0,
  "Active Std": 0,
  "Active Max": 0,
  "Active Min": 0,
  "Idle Mean": 0,
  "Idle Std": 0,
  "Idle Max": 0,
  "Idle Min": 0
};

// Mutable copy of the active schema — replaced when a CSV header is loaded
let activeFeatureGroups = FEATURE_GROUPS;
let isAnalyzing = false;

/* ---------------------------------------------------------
   2. DOM REFERENCES
   (el() itself comes from common.js)
--------------------------------------------------------- */
const featureGroupsEl = el("featureGroups");
const schemaNoteEl = el("schemaNote");
const schemaFileInput = el("schemaFileInput");
const loadSampleBtn = el("loadSampleBtn");
const clearFormBtn = el("clearFormBtn");
const analyzeBtn = el("analyzeBtn");
const errorBanner = el("errorBanner");
const errorTitle = el("errorTitle");
const errorMessage = el("errorMessage");

const resultPanel = el("resultPanel");
const resultStatusLine = el("resultStatusLine");
const emptyInline = el("emptyInline");
const resultBody = el("resultBody");
const reportCard = el("reportCard");
const recommendCard = el("recommendCard");

/* ---------------------------------------------------------
   3. BUILD THE FEATURE FORM
--------------------------------------------------------- */
function buildFeatureForm(groups) {
  featureGroupsEl.innerHTML = "";

  groups.forEach((group, groupIndex) => {
    const wrap = document.createElement("div");
    wrap.className = "feature-group";

    const head = document.createElement("button");
    head.type = "button";
    head.className = "feature-group-head";
    head.innerHTML = `<span>${group.name}</span><span class="count">${group.fields.length} fields</span>`;

    const body = document.createElement("div");
    body.className = "feature-group-body";
    // First two groups open by default so the form isn't fully collapsed
    // All groups start collapsed — this section is deliberately kept
    // compact since it now lives below the fold, past the pipeline.
    body.style.display = "none";

    head.addEventListener("click", () => {
      body.style.display = body.style.display === "none" ? "grid" : "none";
    });

    group.fields.forEach((fieldName) => {
      const field = document.createElement("div");
      field.className = "feature-field";

      const label = document.createElement("label");
      label.textContent = fieldName;
      label.setAttribute("for", fieldId(fieldName));

      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.id = fieldId(fieldName);
      input.name = fieldName;
      input.placeholder = "0";

      field.appendChild(label);
      field.appendChild(input);
      body.appendChild(field);
    });

    wrap.appendChild(head);
    wrap.appendChild(body);
    featureGroupsEl.appendChild(wrap);
  });
}

function fieldId(name) {
  // Stable, collision-free id from a raw feature name
  return "f_" + name.replace(/[^a-zA-Z0-9]/g, "_");
}

function allFieldNames(groups) {
  return groups.flatMap((g) => g.fields);
}

function readFormValues(groups) {
  const values = {};
  const missing = [];

  allFieldNames(groups).forEach((name) => {
    const input = el(fieldId(name));
    input.classList.remove("field-missing");

    if (input.value === "" || input.value === null) {
      missing.push(name);
      input.classList.add("field-missing");
      return;
    }

    const num = Number(input.value);
    if (Number.isNaN(num)) {
      missing.push(name);
      input.classList.add("field-missing");
      return;
    }

    values[name] = num;
  });

  return { values, missing };
}

function fillForm(dataObject) {
  Object.entries(dataObject).forEach(([name, value]) => {
    const input = el(fieldId(name));
    if (input) {
      input.value = value;
      input.classList.remove("field-missing");
    }
  });
}

function clearForm(groups) {
  allFieldNames(groups).forEach((name) => {
    const input = el(fieldId(name));
    if (input) {
      input.value = "";
      input.classList.remove("field-missing");
    }
  });
}

/* ---------------------------------------------------------
   4. LOAD SCHEMA FROM A REAL CSV HEADER (X_train.csv / X.csv)
   This is the safest way to guarantee the JSON keys sent to
   /predict exactly match what your model was trained on.
--------------------------------------------------------- */
schemaFileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const firstLine = text.split(/\r?\n/)[0];
    const columns = parseCsvHeaderLine(firstLine)
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && c.toLowerCase() !== "label" && c.toLowerCase() !== "class");

    if (columns.length === 0) {
      throw new Error("No usable columns found in the CSV header row.");
    }

    activeFeatureGroups = [{ name: `Loaded from ${file.name}`, fields: columns }];
    buildFeatureForm(activeFeatureGroups);
    schemaNoteEl.textContent = `Using ${columns.length} columns loaded from ${file.name}`;
    hideError();
  } catch (err) {
    showError("Could not read schema file", err.message || String(err));
  } finally {
    schemaFileInput.value = "";
  }
});

function parseCsvHeaderLine(line) {
  // Minimal CSV split that respects simple quoted headers
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/* ---------------------------------------------------------
   5. TOOLBAR ACTIONS
--------------------------------------------------------- */
loadSampleBtn.addEventListener("click", async () => {
  if (isAnalyzing) return;

  hideError();
  setAnalyzing(true);
  showLoadingState();

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/incidents/next/full-analysis`,
      {
        method: "GET"
      },
      PREDICT_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.features) {
      throw new Error("Backend did not return incident features.");
    }

    const features = { ...result.features };

    delete features.Label;

    fillForm(features);

    renderThreatResult(result);

    renderAiReport(result.ai_analysis);

    addIncident({
      incident_id: result.incident_id,
      dataset_attack_type: result.dataset_attack_type,
      threat_class: result.threat_class,
      confidence: result.confidence,
      risk_score: result.risk_score,
      ai_analysis: result.ai_analysis,
      features: features
    });

    renderHistory();

  } catch (err) {

    if (err.name === "AbortError") {
      showError(
        "Request timed out",
        "The local Llama 3.2 analysis took too long. Check the FastAPI and Ollama terminals."
      );
    } else {
      showError(
        "Could not load incident",
        err.message || String(err)
      );
    }

  } finally {

    hideLoadingState();
    setAnalyzing(false);
  }
});
clearFormBtn.addEventListener("click", () => {
  clearForm(activeFeatureGroups);
  hideError();
});

/* Health checks (chips + refresh button) are wired automatically by
   common.js on every page, including this one — nothing to do here. */

/* ---------------------------------------------------------
   7. ANALYZE INCIDENT  (POST /predict)
--------------------------------------------------------- */
analyzeBtn.addEventListener("click", async () => {
  if (isAnalyzing) return; // guard against duplicate concurrent requests

  hideError();

  const { values, missing } = readFormValues(activeFeatureGroups);

  if (missing.length > 0) {
    showError(
      "Missing or invalid feature values",
      `${missing.length} field(s) are empty or not numeric. They're highlighted in the form. ` +
      `Load the sample flow or fill in every field before analyzing.`
    );
    return;
  }

  setAnalyzing(true);
  showLoadingState();

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/predict`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      },
      PREDICT_TIMEOUT_MS
    );

    if (!response.ok) {
      let detail = "";
      try {
        const errJson = await response.json();
        detail = errJson.detail ? JSON.stringify(errJson.detail) : "";
      } catch (_) { /* body wasn't JSON */ }
      throw new Error(`Backend returned HTTP ${response.status}. ${detail}`);
    }

    let result;
    try {
      result = await response.json();
    } catch (err) {
      throw new Error("The backend response was not valid JSON.");
    }

    validatePredictionShape(result);

    renderThreatResult(result);
    renderAiReport(result.ai_analysis);
    // Stored via common.js's shared incident store — this is what
    // powers the Dashboard, Incident History, Threat Analytics and
    // AI Analysis pages. "values" is the exact feature vector sent.
    addIncident({
      threat_class: result.threat_class,
      confidence: result.confidence,
      risk_score: result.risk_score,
      ai_analysis: result.ai_analysis,
      features: values
    });
    renderHistory();
    hideLoadingState();

  } catch (err) {
    hideLoadingState();
    // Only fall back to the empty message if nothing has ever been
    // analyzed successfully yet — a failed retry shouldn't erase a
    // perfectly good previous result, just show the error banner.
    if (resultBody.hidden) {
      showEmptyState();
    }

    if (err.name === "AbortError") {
      showError(
        "Request timed out",
        "The backend did not respond in time. RAG + local LLM inference can be slow on CPU — try again, or check the FastAPI server logs."
      );
    } else if (err instanceof TypeError) {
      // fetch() throws a generic TypeError on network/CORS failures
      showError(
        "Cannot reach the backend",
        `Could not connect to ${API_BASE}/predict. Either the FastAPI server isn't running, or the browser blocked the ` +
        `request due to CORS. See the CORS note in the project README.`
      );
    } else {
      showError("Analysis failed", err.message || String(err));
    }
  } finally {
    setAnalyzing(false);
  }
});

function validatePredictionShape(result) {
  const requiredKeys = ["threat_class", "confidence", "risk_score", "ai_analysis"];
  const missingKeys = requiredKeys.filter((k) => !(k in result));
  if (missingKeys.length > 0) {
    throw new Error(`Response is missing expected field(s): ${missingKeys.join(", ")}`);
  }
}

function setAnalyzing(state) {
  isAnalyzing = state;
  analyzeBtn.disabled = state;
  loadSampleBtn.disabled = state; // prevent "Load Next Incident" racing a manual Analyze, and vice versa
  analyzeBtn.textContent = state ? "Analyzing…" : "";
  if (!state) {
    analyzeBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1V4M7.5 11V14M1 7.5H4M11 7.5H14M3.3 3.3L5.4 5.4M9.6 9.6L11.7 11.7M11.7 3.3L9.6 5.4M5.4 9.6L3.3 11.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> Analyze incident`;
  } else {
    analyzeBtn.textContent = "Analyzing…";
  }
}

/* ---------------------------------------------------------
   8. RESULT VIEW STATE MACHINE

   Design: the Threat Result panel is always on screen. Before
   any analysis has run, it shows a short empty message. While
   a request is in flight, a small inline status strip appears
   at the top of that SAME panel — the previous result (if any)
   stays visible underneath instead of being wiped out. Only a
   real new result replaces it.
--------------------------------------------------------- */
function showEmptyState() {
  emptyInline.hidden = false;
  resultBody.hidden = true;
  resultStatusLine.hidden = true;
  el("resultTime").textContent = "Not analyzed yet";
}

function showLoadingState() {
  resultStatusLine.hidden = false;
  el("resultTime").textContent = "Analyzing…";
  // Deliberately NOT touching resultBody/emptyInline here — whatever
  // was already showing (empty message or a previous result) stays
  // visible under the status strip until the new result is ready.
}

function hideLoadingState() {
  resultStatusLine.hidden = true;
}

/* ---------------------------------------------------------
   9. RENDER THREAT RESULT
--------------------------------------------------------- */
const SEVERITY_MAP = {
  BENIGN: { css: "sev-benign", barColor: "var(--benign)" },
  SUSPICIOUS: { css: "sev-suspicious", barColor: "var(--suspicious)" },
  MALICIOUS: { css: "sev-malicious", barColor: "var(--malicious)" }
};

function renderThreatResult(result) {
  emptyInline.hidden = true;
  resultBody.hidden = false;

  const threatClass = String(result.threat_class || "").toUpperCase();
  const confidencePct = (Number(result.confidence) * 100).toFixed(2);
  const riskScore = Number(result.risk_score);

  el("resultTime").textContent = new Date().toLocaleString();

  // Attack Type comes ONLY from the backend's dataset_attack_type field
  // (present when the incident was loaded via "Load Next Incident").
  // Manual /predict calls don't return a labeled attack type — we show
  // that honestly instead of guessing it from the threat class.
  const attackTypeEl = el("attackTypeValue");
  const cleanedAttackType = cleanAttackTypeDisplay(result.dataset_attack_type);
  if (cleanedAttackType) {
    attackTypeEl.textContent = cleanedAttackType;
    attackTypeEl.classList.remove("not-available");
  } else {
    attackTypeEl.textContent = "Not available (manual /predict result has no dataset label)";
    attackTypeEl.classList.add("not-available");
  }

  el("metricConfidence").textContent = `${confidencePct}%`;
  el("metricRisk").textContent = `${riskScore.toFixed(2)} / 100`;

  const sev = SEVERITY_MAP[threatClass] || { css: "", barColor: "var(--text-low)" };
  const tag = el("severityTag");
  tag.textContent = threatClass || "UNKNOWN";
  tag.className = `severity-tag ${sev.css}`;
  el("threatClassCard").className = `result-card ${sev.css}`;

  // Risk bar color follows the numeric risk value itself (0-30 green,
  // 30-70 amber, 70-100 red) — a separate signal from the threat class.
  const fill = el("riskBarFill");
  fill.style.width = `${Math.min(Math.max(riskScore, 0), 100)}%`;
  fill.style.background = riskBarColor(riskScore);

  // Light up the pipeline to show where the result came from
  document.querySelectorAll(".pipe-step-num").forEach((step) => step.classList.add("active"));
}

function riskBarColor(score) {
  if (score >= 70) return "var(--malicious)";
  if (score >= 30) return "var(--suspicious)";
  return "var(--benign)";
}

/* ---------------------------------------------------------
   10. RENDER AI SOC ANALYSIS
   REPORT_SECTIONS and parseReportSections() live in common.js
   now, shared with the AI Analysis page.
--------------------------------------------------------- */
// The backend's "INVESTIGATION STEPS" section is the actionable part
// of the report, so it gets pulled into its own Recommended Actions
// card instead of being buried inside the general narrative.
const RECOMMENDATION_SECTION_TITLE = "INVESTIGATION STEPS";

function renderAiReport(rawText) {
  const body = el("reportBody");
  const recBody = el("recommendBody");
  body.innerHTML = "";
  recBody.innerHTML = "";

  if (!rawText || typeof rawText !== "string") {
    reportCard.hidden = false;
    recommendCard.hidden = true;
    body.innerHTML = `<p class="report-raw">No analysis text was returned by the backend.</p>`;
    return;
  }

  const parsed = parseReportSections(rawText);

  if (parsed.length === 0) {
    // Backend text didn't match the expected headings — show it verbatim
    reportCard.hidden = false;
    recommendCard.hidden = true;
    const raw = document.createElement("div");
    raw.className = "report-raw";
    raw.textContent = rawText;
    body.appendChild(raw);
    return;
  }

  let hasRecommendation = false;

  parsed.forEach(({ title, content }) => {
    const isRecommendation = title === RECOMMENDATION_SECTION_TITLE;

    const section = document.createElement("div");
    section.className = "report-section";
    section.dataset.section = title; // lets CSS color-code each heading by its actual title

    const heading = document.createElement("h4");
    heading.textContent = title;

    const text = document.createElement("p");
    text.textContent = content.trim();

    section.appendChild(heading);
    section.appendChild(text);

    if (isRecommendation) {
      recBody.appendChild(section);
      hasRecommendation = true;
    } else {
      body.appendChild(section);
    }
  });

  reportCard.hidden = false;
  recommendCard.hidden = !hasRecommendation;
}

/* ---------------------------------------------------------
   11. INCIDENT HISTORY — quick local list on this page.
   Storage itself (loadIncidents/addIncident/clearIncidents) lives
   in common.js and is shared with the Dashboard, full Incident
   History page, Threat Analytics and AI Analysis pages.
--------------------------------------------------------- */
function renderHistory() {
  const history = loadIncidents().slice(0, 25); // this panel is a quick recent list, not the full log
  const tbody = el("historyBody");
  tbody.innerHTML = "";

  if (history.length === 0) {
    tbody.innerHTML = `<tr class="history-empty-row"><td colspan="5">No incidents analyzed yet</td></tr>`;
    return;
  }

  history.forEach((entry) => {
    const row = document.createElement("tr");
    const attackType = cleanAttackTypeDisplay(entry.attack_type);
    row.innerHTML = `
      <td>${fmtTimeShort(entry.time)}</td>
      <td>${attackType ? attackType : '<span class="not-available">—</span>'}</td>
      <td class="class-${severityKey(entry.threat_class)}">${severityDot(entry.threat_class)}${entry.threat_class}</td>
      <td>${fmtPct(entry.confidence)}</td>
      <td>${fmtRisk(entry.risk_score)}</td>
    `;
    tbody.appendChild(row);
  });
}

el("clearHistoryBtn").addEventListener("click", () => {
  clearIncidents();
  renderHistory();
});

/* ---------------------------------------------------------
   12. ERROR BANNER HELPERS
--------------------------------------------------------- */
function showError(title, message) {
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  errorBanner.hidden = false;
}

function hideError() {
  errorBanner.hidden = true;
}

/* ---------------------------------------------------------
   13. INIT
--------------------------------------------------------- */
function init() {
  buildFeatureForm(activeFeatureGroups);
  renderHistory();
  // Health check itself is triggered once by common.js on DOMContentLoaded.
}

init();