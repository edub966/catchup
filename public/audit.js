const metrics = document.querySelector("#metrics");
const auditList = document.querySelector("#auditList");
const exportJson = document.querySelector("#exportJson");
let rows = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function categoryLabel(value) {
  return value || "noise";
}

function renderMetrics() {
  const important = rows.filter((row) => row.appeared_in_important).length;
  const catchup = rows.filter((row) => row.appeared_in_catchup).length;
  const audited = rows.filter((row) => row.manual_rating).length;
  const ratedImportant = rows.filter((row) => row.manual_rating === "important").length;

  metrics.innerHTML = `
    <article class="metric"><strong>${rows.length}</strong><span>recent messages</span></article>
    <article class="metric"><strong>${important}</strong><span>important feed hits</span></article>
    <article class="metric"><strong>${catchup}</strong><span>catch-up eligible</span></article>
    <article class="metric"><strong>${audited ? Math.round((ratedImportant / audited) * 100) : 0}%</strong><span>rated important</span></article>
  `;
}

function renderRows() {
  auditList.innerHTML = rows.map((row) => `
    <article class="audit-card" data-message-id="${row.id}">
      <section>
        <div class="meta">
          <span>${escapeHtml(row.username)}</span>
          <span>${new Date(row.created_at).toLocaleString()}</span>
          <span>${categoryLabel(row.signal_category)}</span>
        </div>
        <p class="message-text">${escapeHtml(row.text)}</p>
        <div class="rules">
          ${row.matched_rules.map((rule) => `<span>${escapeHtml(rule.id)} ${rule.points > 0 ? "+" : ""}${rule.points}</span>`).join("")}
        </div>
      </section>
      <section>
        <div class="score-grid">
          <div><strong>${row.base_score ?? 0}</strong><span>base</span></div>
          <div><strong>${row.reaction_boost ?? 0}</strong><span>boost</span></div>
          <div><strong>${row.final_score ?? 0}</strong><span>final</span></div>
        </div>
        <div class="controls">
          <select data-field="manualRating">
            <option value="">Manual rating</option>
            <option value="important" ${row.manual_rating === "important" ? "selected" : ""}>Important</option>
            <option value="not_important" ${row.manual_rating === "not_important" ? "selected" : ""}>Not important</option>
          </select>
          <select data-field="correctedCategory">
            ${["", "plan", "event", "request", "deadline", "announcement", "question", "logistics", "noise"].map((category) => `
              <option value="${category}" ${row.corrected_category === category ? "selected" : ""}>${category || "Correct category"}</option>
            `).join("")}
          </select>
          <textarea data-field="notes" placeholder="Audit notes"></textarea>
          <button type="button" data-save="${row.id}">Save audit</button>
        </div>
      </section>
    </article>
  `).join("");
}

async function loadRows() {
  const response = await fetch("/api/audit/messages");
  rows = await response.json();
  renderMetrics();
  renderRows();
}

auditList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-save]");
  if (!button) return;

  const card = button.closest("[data-message-id]");
  const body = {
    manualRating: card.querySelector("[data-field='manualRating']").value,
    correctedCategory: card.querySelector("[data-field='correctedCategory']").value,
    notes: card.querySelector("[data-field='notes']").value,
  };

  await fetch(`/api/audit/messages/${button.dataset.save}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  button.textContent = "Saved";
  setTimeout(() => {
    button.textContent = "Save audit";
  }, 1200);
  await loadRows();
});

exportJson.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "catchup-audit.json";
  link.click();
  URL.revokeObjectURL(url);
});

loadRows();
