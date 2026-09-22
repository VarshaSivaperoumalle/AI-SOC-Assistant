/* =========================================================
   SYSTEM / HEALTH PAGE LOGIC
========================================================= */

const COMPONENTS = [
  { key: "api", label: "FastAPI backend", endpoint: "GET /health", desc: "The REST API that receives feature vectors and returns predictions." },
  { key: "xgb", label: "XGBoost classifier", endpoint: "in-process", desc: "Loaded model that classifies a flow as BENIGN, SUSPICIOUS, or MALICIOUS." },
  { key: "rag", label: "FAISS retrieval index", endpoint: "in-process", desc: "Vector index over the security knowledge base, searched per prediction." },
  { key: "llm", label: "Ollama / Llama 3.2", endpoint: "local Ollama runtime", desc: "Generates the grounded SOC analyst report from the retrieved context." }
];

function renderComponentGrid(healthResult) {
  const grid = el("componentGrid");
  const online = healthResult && healthResult.ok;
  const health = healthResult ? healthResult.health : null;

  grid.innerHTML = COMPONENTS.map((c) => {
    const statusLabel = healthResult === null ? "Checking…" : online ? "ONLINE" : "OFFLINE";
    const statusColor = healthResult === null ? "var(--text-low)" : online ? "var(--benign)" : "var(--malicious)";
    const extra = health && health[c.key] ? String(health[c.key]) : null;

    return `
      <div class="info-card">
        <h3 style="display:flex; align-items:center; justify-content:space-between;">
          <span>${c.label}</span>
          <span style="font-size:11px; font-weight:700; color:${statusColor};">${statusLabel}</span>
        </h3>
        <p><strong>Endpoint / service:</strong> ${c.endpoint}</p>
        <p>${c.desc}</p>
        ${extra ? `<p><strong>Backend reports:</strong> ${extra}</p>` : ""}
      </div>
    `;
  }).join("");
}

function renderSessionMetrics() {
  el("sysIncidentCount").textContent = loadIncidents().length;
}

document.addEventListener("soc:health", (e) => {
  renderComponentGrid(e.detail);
  const ts = el("sysLastCheck");
  if (ts && e.detail && e.detail.checkedAt) ts.textContent = e.detail.checkedAt.toLocaleTimeString();
});

document.addEventListener("DOMContentLoaded", () => {
  renderComponentGrid(null); // "checking…" until common.js's first checkHealth() resolves
  renderSessionMetrics();
});
