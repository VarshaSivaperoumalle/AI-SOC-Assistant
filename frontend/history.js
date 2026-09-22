/* =========================================================
   INCIDENT HISTORY LOGIC
   Reads/writes the shared incident store from common.js. All
   data shown is a real past /predict result — nothing invented.
========================================================= */

const searchInput = el("searchInput");
const classFilter = el("classFilter");
const riskFilter = el("riskFilter");
const sortOrder = el("sortOrder");
const tbody = el("historyTableBody");
const detailPanel = el("detailPanel");
const detailBody = el("detailBody");
const detailTitle = el("detailTitle");

function riskBucket(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  if (n >= 70) return "high";
  if (n >= 40) return "medium";
  return "low";
}

function getFilteredIncidents() {
  let list = loadIncidents();

  const query = searchInput.value.trim().toLowerCase();
  if (query) {
    list = list.filter((i) => i.id.toLowerCase().includes(query));
  }

  const cls = classFilter.value;
  if (cls) {
    list = list.filter((i) => String(i.threat_class || "").toUpperCase() === cls);
  }

  const risk = riskFilter.value;
  if (risk) {
    list = list.filter((i) => riskBucket(i.risk_score) === risk);
  }

  list = list.slice().sort((a, b) => {
    const ta = new Date(a.time).getTime();
    const tb = new Date(b.time).getTime();
    return sortOrder.value === "asc" ? ta - tb : tb - ta;
  });

  return list;
}

function renderTable() {
  const list = getFilteredIncidents();
  tbody.innerHTML = "";

  if (list.length === 0) {
    const totalStored = loadIncidents().length;
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${
      totalStored === 0 ? "No incidents recorded yet." : "No incidents match the current filters."
    }</td></tr>`;
    return;
  }

  list.forEach((inc) => {
    const row = document.createElement("tr");
    const attackType = cleanAttackTypeDisplay(inc.attack_type);
    row.innerHTML = `
      <td><code>${inc.id}</code></td>
      <td>${fmtTime(inc.time)}</td>
      <td>${attackType ? attackType : '<span class="not-available">—</span>'}</td>
      <td class="class-${severityKey(inc.threat_class)}">${severityDot(inc.threat_class)}${inc.threat_class}</td>
      <td>${fmtPct(inc.confidence)}</td>
      <td>${fmtRisk(inc.risk_score)}</td>
      <td>
        <select class="status-select" data-id="${inc.id}" data-status="${inc.status || "New"}">
          ${["New", "Investigating", "Resolved", "False Positive"].map((s) =>
            `<option value="${s}" ${s === (inc.status || "New") ? "selected" : ""}>${s}</option>`
          ).join("")}
        </select>
      </td>
      <td><button class="text-btn view-btn" data-id="${inc.id}">View</button></td>
    `;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      updateIncidentStatus(id, e.target.value);
      e.target.dataset.status = e.target.value;
    });
  });

  tbody.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => showDetail(btn.dataset.id));
  });
}

function showDetail(id) {
  const inc = getIncidentById(id);
  if (!inc) return;

  detailPanel.hidden = false;
  detailTitle.textContent = `Incident detail — ${inc.id}`;

  const featureCount = inc.features ? Object.keys(inc.features).length : 0;

  detailBody.innerHTML = `
    <div class="info-grid">
      <div class="info-card">
        <h3>Overview</h3>
        <p><strong>Attack type:</strong> ${cleanAttackTypeDisplay(inc.attack_type) || '<span class="not-available">Not available (manual entry)</span>'}</p>
        <p><strong>Threat class:</strong> <span class="class-${severityKey(inc.threat_class)}">${inc.threat_class}</span></p>
        <p><strong>Confidence:</strong> ${fmtPct(inc.confidence)}</p>
        <p><strong>Risk score:</strong> ${fmtRisk(inc.risk_score)} / 100</p>
        <p><strong>Status:</strong> ${inc.status || "New"}</p>
        <p><strong>Timestamp:</strong> ${fmtTime(inc.time)}</p>
      </div>
      <div class="info-card">
        <h3>Evidence</h3>
        ${featureCount > 0
          ? `<p>${featureCount} CICFlowMeter feature values were captured for this incident. See the AI Analysis page for the full breakdown, or export below.</p>
             <button class="text-btn" id="exportFeaturesBtn">Export feature vector (JSON)</button>`
          : `<p class="not-available">Feature vector not stored for this incident (it may predate this version of the frontend).</p>`}
      </div>
    </div>
    <div class="info-card" style="margin-top:14px;">
      <h3>AI SOC analysis</h3>
      ${inc.ai_analysis
        ? `<p style="white-space:pre-wrap;">${escapeHtml(inc.ai_analysis)}</p>`
        : `<p class="not-available">No analysis text stored for this incident.</p>`}
    </div>
  `;

  const exportBtn = el("exportFeaturesBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(inc.features, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inc.id}_features.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  detailPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

el("closeDetailBtn").addEventListener("click", () => { detailPanel.hidden = true; });

el("clearAllBtn").addEventListener("click", () => {
  if (!confirm("Clear all locally stored incident history? This cannot be undone.")) return;
  clearIncidents();
  detailPanel.hidden = true;
  renderTable();
});

[searchInput, classFilter, riskFilter, sortOrder].forEach((elm) => {
  elm.addEventListener("input", renderTable);
  elm.addEventListener("change", renderTable);
});

document.addEventListener("DOMContentLoaded", renderTable);
