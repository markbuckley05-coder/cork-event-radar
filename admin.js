const adminTokenInput = document.querySelector("#adminToken");
const saveTokenButton = document.querySelector("#saveToken");
const manualInvestigation = document.querySelector("#manualInvestigation");
const manualInvestigateButton = document.querySelector("#manualInvestigateButton");
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
            <p>${escapeHtml(source.category)} · ${escapeHtml(source.area)}${source.searchTerm ? ` · ${escapeHtml(source.searchTerm)}` : ""}</p>
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
            <small>${escapeHtml(candidate.category)} · ${escapeHtml(candidate.area)} · ${candidate.eventCount || 0} events found</small>
            <a href="${escapeHtml(candidate.url)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.url)}</a>
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
  currentSuggestionId = suggestionId;
  setStatus("Investigating sources...", "");
  candidateList.innerHTML = "";
  manualInvestigateButton.disabled = true;
  try {
    const payload = await adminFetch("/api/admin/investigate", {
      method: "POST",
      body: JSON.stringify({ suggestion: text }),
    });
    renderCandidates(payload.candidates || []);
    setStatus(`Found ${(payload.candidates || []).length} candidate source${(payload.candidates || []).length === 1 ? "" : "s"}.`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    manualInvestigateButton.disabled = false;
  }
}

async function approveCheckedSources() {
  const indexes = [...candidateList.querySelectorAll('input[type="checkbox"]:checked')].map((input) => Number(input.value));
  const sources = indexes.map((index) => currentCandidates[index]).filter(Boolean);
  if (!sources.length) {
    setStatus("Tick at least one source to approve.", "error");
    return;
  }

  approveSourcesButton.disabled = true;
  try {
    const payload = await adminFetch("/api/admin/approve", {
      method: "POST",
      body: JSON.stringify({ suggestionId: currentSuggestionId, sources }),
    });
    setStatus(payload.message, "success");
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
