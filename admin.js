const adminTokenInput = document.querySelector("#adminToken");
const saveTokenButton = document.querySelector("#saveToken");
const manualInvestigation = document.querySelector("#manualInvestigation");
const manualInvestigateButton = document.querySelector("#manualInvestigateButton");
const manualStatus = document.querySelector("#manualStatus");
const suggestionAdminList = document.querySelector("#suggestionAdminList");
const candidateList = document.querySelector("#candidateList");
const approveSourcesButton = document.querySelector("#approveSourcesButton");
const approvedSourceList = document.querySelector("#approvedSourceList");
const adminStatus = document.querySelector("#adminStatus");

let currentSuggestionId = "";
let currentCandidates = [];

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function adminHeaders() {
  const token = localStorage.getItem("corkEventRadarAdminToken") || "";
  return {
    "content-type": "application/json",
    ...(token ? { "x-admin-token": token } : {}),
  };
}

function setStatus(message, type = "") {
  adminStatus.textContent = message;
  adminStatus.className = `suggestion-status ${type}`.trim();
  if (manualStatus) {
    manualStatus.textContent = message;
    manualStatus.className = `suggestion-status ${type}`.trim();
  }
}

async function adminFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...adminHeaders(),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

function renderSuggestions(suggestions) {
  if (!suggestions.length) {
    suggestionAdminList.innerHTML = '<p class="empty-state">No suggestions yet.</p>';
    return;
  }

  suggestionAdminList.innerHTML = suggestions
    .map(
      (suggestion) => `
        <article class="admin-item">
          <div>
            <strong>${escapeHtml(suggestion.text)}</strong>
            <p>${escapeHtml(suggestion.status || "new")} · ${escapeHtml(new Date(suggestion.createdAt).toLocaleString())}</p>
          </div>
          <button class="secondary-action" type="button" data-investigate="${escapeHtml(suggestion.id)}">Investigate</button>
        </article>
      `
    )
    .join("");

  suggestionAdminList.querySelectorAll("[data-investigate]").forEach((button) => {
    button.addEventListener("click", () => {
      const suggestion = suggestions.find((item) => item.id === button.dataset.investigate);
      if (suggestion) investigate(suggestion.text, suggestion.id);
    });
  });
}

function renderApprovedSources(sources) {
  if (!sources.length) {
    approvedSourceList.innerHTML = '<p class="empty-state">No runtime-approved sources yet.</p>';
    return;
  }

  approvedSourceList.innerHTML = sources
    .map(
      (source) => `
        <article class="admin-item">
          <div>
            <strong>${escapeHtml(source.name)}</strong>
            <p>${escapeHtml(source.category)} · ${escapeHtml(source.area)}${source.type ? ` · ${escapeHtml(source.type)}` : ""}${source.searchTerm ? ` · ${escapeHtml(source.searchTerm)}` : ""}</p>
            <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.url)}</a>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCandidates(candidates) {
  currentCandidates = candidates;
  if (!candidates.length) {
    candidateList.innerHTML = '<p class="empty-state">No candidate sources found. Try a more specific wording or paste a direct club/listings URL.</p>';
    return;
  }

  candidateList.innerHTML = candidates
    .map(
      (candidate, index) => `
        <label class="admin-candidate">
          <input type="checkbox" value="${index}" ${candidate.eventCount ? "checked" : ""} />
          <span>
            <strong>${escapeHtml(candidate.name)}</strong>
            <small>${escapeHtml(candidate.category)} · ${escapeHtml(candidate.area)}${candidate.type ? ` · ${escapeHtml(candidate.type)}` : ""} · ${candidate.eventCount || 0} events found</small>
            <a href="${escapeHtml(candidate.url)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.url)}</a>
            ${
              candidate.eventCount
                ? ""
                : "<em>This link has not produced dated event records yet. Approve only if it is a strong source, then test it on the dashboard with the right category selected.</em>"
            }
            ${
              candidate.sampleEvents?.length
                ? `<em>${candidate.sampleEvents.map((event) => escapeHtml(event.title)).join("; ")}</em>`
                : ""
            }
          </span>
        </label>
      `
    )
    .join("");
}

async function loadAdmin() {
  try {
    const payload = await adminFetch("/api/admin/suggestions");
    renderSuggestions(payload.suggestions || []);
    renderApprovedSources(payload.approvedSources || []);
    if (!payload.adminProtected) {
      setStatus("Tip: set ADMIN_TOKEN in Render before sharing /admin.html publicly.", "error");
    }
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function investigate(text, suggestionId = "") {
  const suggestion = String(text || "").trim();
  if (suggestion.length < 3) {
    setStatus("Enter a suggestion first, then click Investigate.", "error");
    return;
  }
  currentSuggestionId = suggestionId;
  setStatus(`Investigating "${suggestion}"... This can take up to a minute.`, "");
  candidateList.innerHTML = "";
  manualInvestigateButton.disabled = true;
  const originalButtonText = manualInvestigateButton.textContent;
  manualInvestigateButton.textContent = "Investigating...";
  try {
    const payload = await adminFetch("/api/admin/investigate", {
      method: "POST",
      body: JSON.stringify({ suggestion }),
    });
    renderCandidates(payload.candidates || []);
    const count = (payload.candidates || []).length;
    const searched = payload.searchAttempts?.length ? ` Searched ${payload.searchAttempts.length} web query page${payload.searchAttempts.length === 1 ? "" : "s"}.` : "";
    setStatus(
      count
        ? `Found ${count} candidate source${count === 1 ? "" : "s"}.${searched} Tick useful ones below, then approve.`
        : `No candidates found for "${suggestion}".${searched} Try a direct club/listings URL.`,
      count ? "success" : "error"
    );
  } catch (error) {
    const message = error.message === "Admin token required."
      ? "Admin token required. Enter your ADMIN_TOKEN above, click Save token, then try again."
      : error.message;
    setStatus(message, "error");
  } finally {
    manualInvestigateButton.disabled = false;
    manualInvestigateButton.textContent = originalButtonText;
  }
}

async function approveCheckedSources() {
  const indexes = [...candidateList.querySelectorAll('input[type="checkbox"]:checked')].map((input) => Number(input.value));
  const sources = indexes.map((index) => currentCandidates[index]).filter(Boolean);
  if (!sources.length) {
    setStatus("Tick at least one source to approve.", "error");
    return;
  }
  const zeroEventCount = sources.filter((source) => !source.eventCount).length;

  approveSourcesButton.disabled = true;
  try {
    const payload = await adminFetch("/api/admin/approve", {
      method: "POST",
      body: JSON.stringify({ suggestionId: currentSuggestionId, sources }),
    });
    const warning = zeroEventCount
      ? ` ${zeroEventCount} approved source${zeroEventCount === 1 ? " has" : "s have"} not produced dated events yet.`
      : "";
    setStatus(`${payload.message}${warning}`, zeroEventCount ? "error" : "success");
    renderCandidates([]);
    await loadAdmin();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    approveSourcesButton.disabled = false;
  }
}

adminTokenInput.value = localStorage.getItem("corkEventRadarAdminToken") || "";
saveTokenButton.addEventListener("click", () => {
  localStorage.setItem("corkEventRadarAdminToken", adminTokenInput.value.trim());
  setStatus("Admin token saved in this browser.", "success");
  loadAdmin();
});
manualInvestigateButton.addEventListener("click", () => investigate(manualInvestigation.value));
approveSourcesButton.addEventListener("click", approveCheckedSources);

loadAdmin();
