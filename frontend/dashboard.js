/* =========================================================
   DASHBOARD LOGIC
   Everything here is computed from real incidents stored by
   the Incident Analysis page after actual /predict responses.
========================================================= */

function renderDashboard() {
  const incidents = loadIncidents();

  const total = incidents.length;
  const counts = { BENIGN: 0, SUSPICIOUS: 0, MALICIOUS: 0 };
  let riskSum = 0;
  let riskCount = 0;

  incidents.forEach((inc) => {
    const cls = String(inc.threat_class || "").toUpperCase();
    if (counts[cls] !== undefined) counts[cls]++;
    const risk = Number(inc.risk_score);
    if (Number.isFinite(risk)) { riskSum += risk; riskCount++; }
  });

  el("statTotal").textContent = total;
  el("statBenign").textContent = counts.BENIGN;
  el("statSuspicious").textContent = counts.SUSPICIOUS;
  el("statMalicious").textContent = counts.MALICIOUS;
  el("statAvgRisk").textContent = riskCount > 0 ? (riskSum / riskCount).toFixed(1) : "—";

  renderRecentTable(incidents.slice(0, 8));
  renderDistributionChart(counts, total);
  renderRiskOverview(riskCount > 0 ? riskSum / riskCount : null);
}

function renderRecentTable(incidents) {
  const tbody = el("recentBody");
  tbody.innerHTML = "";

  if (incidents.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No incidents recorded yet. Run an analysis on the Incident Analysis page.</td></tr>`;
    return;
  }

  incidents.forEach((inc) => {
    const row = document.createElement("tr");
    const key = severityKey(inc.threat_class);
    const attackType = cleanAttackTypeDisplay(inc.attack_type);
    row.innerHTML = `
      <td>${fmtTimeShort(inc.time)}</td>
      <td>${attackType ? attackType : '<span class="not-available">—</span>'}</td>
      <td class="class-${key}">${severityDot(inc.threat_class)}${inc.threat_class}</td>
      <td>${fmtPct(inc.confidence)}</td>
      <td>${fmtRisk(inc.risk_score)}</td>
      <td>${inc.status || "New"}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderDistributionChart(counts, total) {
  const container = el("distChart");
  if (total === 0) {
    container.innerHTML = `<div class="chart-empty">No data available.</div>`;
    return;
  }

  const rows = [
    { label: "Benign", key: "benign", value: counts.BENIGN },
    { label: "Suspicious", key: "suspicious", value: counts.SUSPICIOUS },
    { label: "Malicious", key: "malicious", value: counts.MALICIOUS }
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));

  container.innerHTML = `<div class="hbar-chart">${rows.map((r) => `
    <div class="hbar-row">
      <span class="hbar-label">${r.label}</span>
      <div class="hbar-track"><div class="hbar-fill ${r.key}" style="width:${(r.value / max) * 100}%"></div></div>
      <span class="hbar-count">${r.value}</span>
    </div>
  `).join("")}</div>`;
}

function renderRiskOverview(avgRisk) {
  const fill = el("dashRiskFill");
  const note = el("riskOverviewNote");

  if (avgRisk === null) {
    fill.style.width = "0%";
    fill.style.background = "var(--border)";
    note.textContent = "No incidents analyzed yet.";
    return;
  }

  fill.style.width = `${Math.min(Math.max(avgRisk, 0), 100)}%`;
  fill.style.background =
    avgRisk >= 70 ? "var(--malicious)" : avgRisk >= 40 ? "var(--suspicious)" : "var(--benign)";
  note.textContent = `Average risk across ${loadIncidents().length} analyzed incident(s): ${avgRisk.toFixed(1)} / 100`;
}

document.addEventListener("DOMContentLoaded", renderDashboard);
