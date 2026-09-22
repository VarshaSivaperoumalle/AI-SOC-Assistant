/* =========================================================
   AI SOC ASSISTANT — SHARED LOGIC
   Loaded on every page. Handles:
   - health checks (fills the status chips in the topbar)
   - the incident store (localStorage — real predictions only)
   - active-nav-link highlighting
   No mock data is ever generated here. Every incident stored
   came from a real POST /predict response.
========================================================= */

const API_BASE = "https://ai-soc-assistant-7dh3.onrender.com";
const HEALTH_TIMEOUT_MS = 4000;
const HISTORY_KEY = "soc_incident_history";
const MAX_HISTORY = 200;

const el = (id) => document.getElementById(id);

/* ---------------------------------------------------------
   INCIDENT STORE
   Each incident: { id, time, threat_class, confidence,
   risk_score, ai_analysis, status, features }
   "features" and "ai_analysis" are only present for incidents
   created after this multi-page version — older localStorage
   entries from the single-page version may be missing them,
   and every page here handles that gracefully.
--------------------------------------------------------- */
function loadIncidents() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (_) {
    return [];
  }
}

function saveIncidents(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function makeIncidentId(existingCount) {
  const seq = String(existingCount + 1).padStart(4, "0");
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `INC-${seq}-${suffix}`;
}

function addIncident({ threat_class, confidence, risk_score, ai_analysis, features, dataset_attack_type, incident_id }) {
  const list = loadIncidents();
  const incident = {
    id: makeIncidentId(list.length),
    time: new Date().toISOString(),
    threat_class: threat_class,
    confidence: confidence,
    risk_score: risk_score,
    ai_analysis: ai_analysis || "",
    attack_type: dataset_attack_type || null,       // real backend field, only present via "Load Next Incident"
    source_incident_id: incident_id || null,         // backend's own incident_id, kept alongside our local id
    status: "New",
    features: features || null
  };
  list.unshift(incident);
  saveIncidents(list.slice(0, MAX_HISTORY));
  return incident;
}

// Cleans ONLY the display text (e.g. a stray U+FFFD replacement
// character from dataset encoding) — never touches the underlying
// prediction data, and never guesses/invents an attack type.
function cleanAttackTypeDisplay(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw).replace(/\uFFFD/g, "-").replace(/\s+/g, " ").trim();
}

function updateIncidentStatus(id, status) {
  const list = loadIncidents();
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  list[idx].status = status;
  saveIncidents(list);
  return list[idx];
}

function getIncidentById(id) {
  return loadIncidents().find((i) => i.id === id) || null;
}

function clearIncidents() {
  localStorage.removeItem(HISTORY_KEY);
}

/* ---------------------------------------------------------
   FORMATTERS (shared so every page renders numbers the same way)
--------------------------------------------------------- */
function fmtPct(x) {
  const n = Number(x);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—";
}
function fmtRisk(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}
function fmtTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
function fmtTimeShort(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function severityKey(cls) {
  const key = String(cls || "").toLowerCase();
  return ["benign", "suspicious", "malicious"].includes(key) ? key : "unknown";
}

// A small colored dot to prefix a threat-class label in tables.
function severityDot(cls) {
  return `<span class="sev-dot sev-dot-${severityKey(cls)}"></span>`;
}

/* ---------------------------------------------------------
   HEALTH CHECK — shared by every page's topbar chips
--------------------------------------------------------- */
async function fetchWithTimeout(url, options = {}, timeoutMs = HEALTH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function setChipState(id, state) {
  const chip = el(id);
  if (chip) chip.dataset.state = state;
}

let lastHealthResult = null;

async function checkHealth() {
  const chipIds = ["chip-api", "chip-xgb", "chip-rag", "chip-llm"];
  chipIds.forEach((id) => setChipState(id, "checking"));

  const noteEl = el("healthNote");
  if (noteEl) noteEl.textContent = `Checking connection to ${API_BASE}…`;

  try {
    const rootRes = await fetchWithTimeout(`${API_BASE}/`);
    if (!rootRes.ok) throw new Error(`Root endpoint returned HTTP ${rootRes.status}`);
    await rootRes.json();

    const healthRes = await fetchWithTimeout(`${API_BASE}/health`);
    if (!healthRes.ok) throw new Error(`/health returned HTTP ${healthRes.status}`);
    const health = await healthRes.json();
    const apiOnline = health.status === "healthy";

    chipIds.forEach((id) => setChipState(id, apiOnline ? "online" : "offline"));

    if (noteEl) {
      noteEl.textContent = apiOnline
        ? `Backend reports: model=${health.model || "—"}, llm=${health.llm || "—"}, rag=${health.rag || "—"}`
        : "Backend responded but did not report a healthy status.";
    }

    lastHealthResult = { ok: apiOnline, health, checkedAt: new Date() };
  } catch (err) {
    chipIds.forEach((id) => setChipState(id, "offline"));
    if (noteEl) {
      noteEl.textContent = `Could not reach ${API_BASE}. Confirm the FastAPI server is running (uvicorn main:app) and reachable from this browser.`;
    }
    lastHealthResult = { ok: false, health: null, checkedAt: new Date() };
  }

  const tsEl = el("healthTimestamp");
  if (tsEl) tsEl.textContent = `checked ${new Date().toLocaleTimeString()}`;

  // Let the current page react if it wants to (e.g. System page).
  document.dispatchEvent(new CustomEvent("soc:health", { detail: lastHealthResult }));

  return lastHealthResult;
}

function wireRefreshButton() {
  const btn = el("refreshHealthBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    btn.classList.add("spinning");
    checkHealth().finally(() => btn.classList.remove("spinning"));
  });
}

/* ---------------------------------------------------------
   AI REPORT PARSING (shared by the Analysis and AI Analysis pages)
   Parses the backend's markdown-style section headings; the
   text itself is never altered, only split up for display.
--------------------------------------------------------- */
const REPORT_SECTIONS = [
  "THREAT ASSESSMENT",
  "WHY IT MATTERS",
  "INVESTIGATION STEPS",
  "MITRE ATT&CK CONTEXT",
  "FINAL ASSESSMENT"
];

function parseReportSections(text) {
  if (!text || typeof text !== "string") return [];

  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:\\d+\\.\\s*)?(${REPORT_SECTIONS.join("|")})\\s*\\n`,
    "gi"
  );
  const matches = [...text.matchAll(pattern)];
  if (matches.length === 0) return [];

  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    sections.push({
      title: matches[i][1].toUpperCase(),
      content: text.slice(start, end).trim()
    });
  }
  return sections;
}

function getReportSection(text, titleWanted) {
  return parseReportSections(text).find((s) => s.title === titleWanted) || null;
}

/* ---------------------------------------------------------
   NAV ACTIVE STATE
   Each page sets <body data-page="..."> and each sidebar link
   sets data-page="..." to match — this is the only thing that
   needs to stay consistent when adding a new page.
--------------------------------------------------------- */
function highlightActiveNav() {
  const current = document.body.dataset.page;
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === current);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  highlightActiveNav();
  wireRefreshButton();
  checkHealth();
});
