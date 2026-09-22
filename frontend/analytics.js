/* =========================================================
   THREAT ANALYTICS LOGIC
   Every number here is derived from real incidents in the
   shared local store — nothing is simulated.
========================================================= */

function renderAnalytics() {
  const incidents = loadIncidents();
  const total = incidents.length;

  el("anTotal").textContent = total;

  if (total === 0) {
    el("anAvgRisk").textContent = "—";
    el("anAvgConf").textContent = "—";
    ["classChart", "confChart", "riskChart", "trendChart"].forEach((id) => {
      el(id).innerHTML = `<div class="chart-empty">No data available.</div>`;
    });
    return;
  }

  const riskAvg = incidents.reduce((s, i) => s + (Number(i.risk_score) || 0), 0) / total;
  const confAvg = incidents.reduce((s, i) => s + (Number(i.confidence) || 0), 0) / total;
  el("anAvgRisk").textContent = riskAvg.toFixed(1);
  el("anAvgConf").textContent = fmtPct(confAvg);

  renderClassChart(incidents);
  renderConfidenceChart(incidents);
  renderRiskChart(incidents);
  renderTrendChart(incidents);
}

function renderClassChart(incidents) {
  const counts = { BENIGN: 0, SUSPICIOUS: 0, MALICIOUS: 0 };
  incidents.forEach((i) => {
    const c = String(i.threat_class || "").toUpperCase();
    if (counts[c] !== undefined) counts[c]++;
  });
  const rows = [
    { label: "Benign", key: "benign", value: counts.BENIGN },
    { label: "Suspicious", key: "suspicious", value: counts.SUSPICIOUS },
    { label: "Malicious", key: "malicious", value: counts.MALICIOUS }
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));

  el("classChart").innerHTML = `<div class="hbar-chart">${rows.map((r) => `
    <div class="hbar-row">
      <span class="hbar-label">${r.label}</span>
      <div class="hbar-track"><div class="hbar-fill ${r.key}" style="width:${(r.value / max) * 100}%"></div></div>
      <span class="hbar-count">${r.value}</span>
    </div>
  `).join("")}</div>`;
}

function renderConfidenceChart(incidents) {
  // Buckets: <60%, 60-80%, 80-90%, 90-95%, 95-100%
  const bands = [
    { label: "<60%", test: (c) => c < 0.6 },
    { label: "60–80%", test: (c) => c >= 0.6 && c < 0.8 },
    { label: "80–90%", test: (c) => c >= 0.8 && c < 0.9 },
    { label: "90–95%", test: (c) => c >= 0.9 && c < 0.95 },
    { label: "95–100%", test: (c) => c >= 0.95 }
  ];
  const counts = bands.map((b) => incidents.filter((i) => b.test(Number(i.confidence))).length);
  renderVerticalBars("confChart", bands.map((b) => b.label), counts);
}

function renderRiskChart(incidents) {
  const buckets = ["0–19", "20–39", "40–59", "60–79", "80–100"];
  const counts = [0, 0, 0, 0, 0];
  incidents.forEach((i) => {
    const r = Number(i.risk_score);
    if (!Number.isFinite(r)) return;
    const idx = r >= 80 ? 4 : r >= 60 ? 3 : r >= 40 ? 2 : r >= 20 ? 1 : 0;
    counts[idx]++;
  });
  renderVerticalBars("riskChart", buckets, counts);
}

function renderTrendChart(incidents) {
  const byDay = {};
  incidents.forEach((i) => {
    const d = new Date(i.time);
    if (Number.isNaN(d.getTime())) return;
    const key = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    byDay[key] = (byDay[key] || 0) + 1;
  });

  // Preserve chronological order by re-sorting on the original timestamps
  const dayOrder = [];
  incidents.slice().reverse().forEach((i) => {
    const d = new Date(i.time);
    if (Number.isNaN(d.getTime())) return;
    const key = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (!dayOrder.includes(key)) dayOrder.push(key);
  });

  const last7 = dayOrder.slice(-7);
  renderVerticalBars("trendChart", last7, last7.map((k) => byDay[k] || 0));
}

function renderVerticalBars(containerId, labels, values) {
  const container = el(containerId);
  const max = Math.max(1, ...values);

  container.innerHTML = `<div class="vbar-chart">${labels.map((label, idx) => {
    const v = values[idx];
    const heightPct = (v / max) * 100;
    return `
      <div class="vbar-col">
        <span class="vbar-tick">${v}</span>
        <div class="vbar-bar" style="height:${Math.max(heightPct, v > 0 ? 3 : 0)}%"></div>
        <span class="vbar-tick">${label}</span>
      </div>
    `;
  }).join("")}</div>`;
}

document.addEventListener("DOMContentLoaded", renderAnalytics);
