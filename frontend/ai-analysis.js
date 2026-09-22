/* =========================================================
   AI ANALYSIS PAGE LOGIC
   Shows the most recent stored incident's full pipeline detail.
   Anything the backend's /predict response does not include
   (e.g. the raw retrieved RAG chunks) is shown as "Not available"
   rather than invented — see the note in the RAG section below.
========================================================= */

function renderAiAnalysisPage() {
  const incidents = loadIncidents();
  const container = el("aiAnalysisContent");

  if (incidents.length === 0) {
    container.innerHTML = `<div class="chart-empty">No incident analyzed yet. Run one on the Incident Analysis page.</div>`;
    return;
  }

  const inc = incidents[0]; // most recent
  document.querySelectorAll("#pipeline .pipe-step-num").forEach((s) => s.classList.add("active"));

  const parsed = parseReportSections(inc.ai_analysis);
  const mitre = parsed.find((s) => s.title === "MITRE ATT&CK CONTEXT");
  const investigation = parsed.find((s) => s.title === "INVESTIGATION STEPS");
  const finalAssessment = parsed.find((s) => s.title === "FINAL ASSESSMENT");
  const whyItMatters = parsed.find((s) => s.title === "WHY IT MATTERS");

  container.innerHTML = `
    <p style="font-size:11.5px; color:var(--text-low); margin-bottom:14px;">
      Showing incident <code>${inc.id}</code>, analyzed ${fmtTime(inc.time)}.
      <a href="history.html">View all incidents →</a>
    </p>

    <div class="info-grid" style="margin-bottom:18px;">
      <div class="info-card">
        <h3>ML prediction</h3>
        <p><strong>Attack type:</strong> ${cleanAttackTypeDisplay(inc.attack_type) || '<span class="not-available">Not available (manual entry)</span>'}</p>
        <p><strong>Class:</strong> <span class="class-${severityKey(inc.threat_class)}">${inc.threat_class}</span></p>
        <p><strong>Confidence:</strong> ${fmtPct(inc.confidence)}</p>
        <p><strong>Risk score:</strong> ${fmtRisk(inc.risk_score)} / 100</p>
      </div>

      <div class="info-card">
        <h3>FAISS retrieval</h3>
        <p class="not-available">
          Your backend's <code>/predict</code> response does not currently return the raw retrieved
          knowledge chunks separately from the generated report — only the final combined text.
        </p>
        <p style="font-size:11.5px;">
          To show the actual retrieved passages here, add a <code>retrieved_context</code> field
          (e.g. a list of the top FAISS matches) to your FastAPI response, alongside
          <code>ai_analysis</code>.
        </p>
      </div>

      <div class="info-card">
        <h3>MITRE ATT&CK context</h3>
        ${mitre
          ? `<p style="white-space:pre-wrap;">${escapeHtmlAI(mitre.content)}</p>`
          : `<p class="not-available">No MITRE ATT&CK section was found in this incident's report text.</p>`}
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <h3>Why it matters</h3>
        ${whyItMatters
          ? `<p style="white-space:pre-wrap;">${escapeHtmlAI(whyItMatters.content)}</p>`
          : `<p class="not-available">Not present in this incident's report.</p>`}
      </div>

      <div class="info-card">
        <h3>Investigation steps</h3>
        ${investigation
          ? `<p style="white-space:pre-wrap;">${escapeHtmlAI(investigation.content)}</p>`
          : `<p class="not-available">Not present in this incident's report.</p>`}
      </div>

      <div class="info-card">
        <h3>Final assessment</h3>
        ${finalAssessment
          ? `<p style="white-space:pre-wrap;">${escapeHtmlAI(finalAssessment.content)}</p>`
          : `<p class="not-available">Not present in this incident's report.</p>`}
      </div>
    </div>
  `;
}

function escapeHtmlAI(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", renderAiAnalysisPage);
