const categories = [
  { id: "food", label: "Food & Drink" },
  { id: "festival", label: "Festivals" },
  { id: "music", label: "Music & Gigs" },
  { id: "trad", label: "Irish Trad & Ceili" },
  { id: "sport", label: "Sport & Matches" },
  { id: "rugby", label: "Rugby" },
  { id: "gaa", label: "GAA" },
  { id: "arts", label: "Arts & Theatre" },
  { id: "family", label: "Family" },
  { id: "agriculture", label: "Agriculture" },
  { id: "markets", label: "Markets" },
];

const sourceDirectory = [
  { name: "Pure Cork", url: "https://www.purecork.ie/whats-on" },
  { name: "Taste Cork Markets", url: "https://www.tastecork.ie/explore-cork/food-markets/farmers-markets/west-cork" },
  { name: "Explore West Cork Markets", url: "https://explorewestcork.ie/food-markets" },
  { name: "Skibbereen Farmers Market", url: "https://skibbereenmarket.com/" },
  { name: "Midleton Farmers Market", url: "https://www.tastecork.ie/food-producers/midleton-farmers-market" },
  { name: "Marina Market", url: "https://www.marinamarket.ie/" },
  { name: "Cork Heritage Pubs", url: "https://corkheritagepubs.com/whats-on/" },
  { name: "Sin É", url: "https://corkheritagepubs.com/sin-e/" },
  { name: "Crane Lane Theatre", url: "https://corkheritagepubs.com/whats-on/" },
  { name: "Fred Zeppelins", url: "https://fredzeppelins.com/" },
  { name: "De Barra's Folk Club", url: "https://debarra.ie/venue/de-barras-folk-club/" },
  { name: "Levis Corner House", url: "https://leviscornerhouse.com/events/" },
  { name: "Cork Fleadh", url: "https://www.corkfleadh.ie/" },
  { name: "Munster Comhaltas", url: "https://www.munstercomhaltas.ie/" },
  { name: "Comhaltas Cork", url: "https://comhaltas.ie/comhaltaslive/locations/cork/" },
  { name: "Eventbrite Cork", url: "https://www.eventbrite.ie/d/ireland--cork/events/" },
  { name: "Reddit r/cork", url: "https://www.reddit.com/r/cork/search/?q=events%20OR%20gigs&restrict_sr=1&sort=new&t=month" },
  { name: "CorkGigs", url: "https://www.corkgigs.com/v2/index.php" },
  { name: "Skiddle Cork", url: "https://www.skiddle.com/whats-on/Cork/" },
  { name: "Meetup Cork", url: "https://www.meetup.com/find/?location=ie--Cork&source=EVENTS" },
  { name: "West Cork Music", url: "https://www.westcorkmusic.ie/events/" },
  { name: "Cork Opera House", url: "https://www.corkoperahouse.ie/whats-on/" },
  { name: "The Everyman", url: "https://everymancork.com/whats-on/" },
  { name: "Cyprus Avenue", url: "https://www.cyprusavenue.ie/whats-on/" },
  { name: "Cork GAA", url: "https://gaacork.ie/fixtures/" },
  { name: "Munster Rugby", url: "https://www.munsterrugby.ie/munster-rugby-fixtures-results/" },
  { name: "Cork on a Fork", url: "https://www.corkcity.ie/en/cork-on-a-fork-fest/" },
  { name: "Cork Midsummer", url: "https://www.corkmidsummer.com/" },
  { name: "Cork Circle", url: "https://corkcircle.ie/" },
];

const starterEvents = [
  {
    title: "Cork Fleadh Cheoil",
    summary: "County fleadh with traditional Irish music, song, dance, sessions, competitions, and ceilis.",
    startDate: "2026-05-04",
    endDate: "2026-05-11",
    location: "Ballincollig, Cork",
    area: "county",
    category: "trad",
    tags: ["trad", "music", "festival", "fleadh", "ceili"],
    source: "Cork Fleadh",
    url: "https://www.corkfleadh.ie/",
    confidence: "Known trad source",
  },
  {
    title: "Skibbereen Farmers Market",
    summary: "Weekly farmers market at the Fair Field with local food, plants, crafts, and West Cork producers.",
    startDate: "2026-05-30",
    location: "Fair Field, Skibbereen",
    area: "west-cork",
    category: "markets",
    tags: ["markets", "food", "west-cork", "farmers market"],
    source: "Skibbereen Farmers Market",
    url: "https://skibbereenmarket.com/",
    confidence: "Recurring market source",
  },
  {
    title: "Clonakilty Farmers Market",
    summary: "Weekly Friday market in Clonakilty with local produce, food stalls, and craft producers.",
    startDate: "2026-05-29",
    location: "Clonakilty, West Cork",
    area: "west-cork",
    category: "markets",
    tags: ["markets", "food", "west-cork", "farmers market"],
    source: "Taste Cork",
    url: "https://www.tastecork.ie/explore-cork/food-markets/farmers-markets/west-cork",
    confidence: "Recurring market source",
  },
  {
    title: "Midleton Farmers Market",
    summary: "Weekly Saturday farmers market in Midleton, one of Cork's best-known producer markets.",
    startDate: "2026-05-30",
    location: "Midleton, County Cork",
    area: "county",
    category: "markets",
    tags: ["markets", "food", "county", "farmers market"],
    source: "Taste Cork",
    url: "https://www.tastecork.ie/food-producers/midleton-farmers-market",
    confidence: "Recurring market source",
  },
  {
    title: "Cork on a Fork Festival",
    summary: "A Cork City food festival with tastings, trails, demos, talks, markets, and city-wide food events.",
    startDate: "2026-08-12",
    endDate: "2026-08-16",
    location: "Cork City",
    area: "city",
    category: "food",
    tags: ["food", "festival", "city", "drink"],
    source: "Cork City Council",
    url: "https://www.corkcity.ie/en/cork-on-a-fork-fest/",
    confidence: "Known annual festival",
  },
  {
    title: "West Cork Chamber Music Festival",
    summary: "Bantry-based classical music festival across concert venues in West Cork.",
    startDate: "2026-06-26",
    endDate: "2026-07-05",
    location: "Bantry, West Cork",
    area: "west-cork",
    category: "music",
    tags: ["music", "festival", "west cork", "arts"],
    source: "West Cork Music",
    url: "https://www.westcorkmusic.ie/",
    confidence: "Source shortcut",
  },
  {
    title: "Open Ear",
    summary: "Independent music and arts festival on Sherkin Island; verify the latest programme before booking.",
    startDate: "2026-05-28",
    endDate: "2026-05-31",
    location: "Sherkin Island, West Cork",
    area: "west-cork",
    category: "festival",
    tags: ["music", "festival", "west cork"],
    source: "Skiddle / venue listings",
    url: "https://www.skiddle.com/whats-on/Cork/",
    confidence: "External listing",
  },
  {
    title: "Cork GAA Fixtures",
    summary: "County and club fixtures change often, so open the official Cork GAA fixture list for match details.",
    startDate: "2026-05-17",
    location: "County Cork",
    area: "county",
    category: "gaa",
    tags: ["gaa", "sport", "match", "fixtures"],
    source: "Cork GAA",
    url: "https://gaacork.ie/fixtures/",
    confidence: "Fixture source",
  },
  {
    title: "Munster Rugby Fixtures",
    summary: "Track Munster fixtures, including Cork games at Virgin Media Park when scheduled.",
    startDate: "2026-05-17",
    location: "Cork and Munster",
    area: "county",
    category: "rugby",
    tags: ["rugby", "sport", "fixtures"],
    source: "Munster Rugby",
    url: "https://www.munsterrugby.ie/munster-rugby-fixtures-results/",
    confidence: "Fixture source",
  },
  {
    title: "Cork City venue gig scan",
    summary: "Open the live venue sources for Cork Opera House, The Everyman, Cyprus Avenue, and city gig listings.",
    startDate: "2026-05-17",
    location: "Cork City",
    area: "city",
    category: "music",
    tags: ["music", "gig", "theatre", "city"],
    source: "Venue sources",
    url: "https://www.purecork.ie/whats-on",
    confidence: "Source bundle",
  },
];

const state = {
  events: starterEvents,
  query: "",
  area: "all",
  categories: new Set(categories.map((category) => category.id)),
  from: "",
  to: "",
  scanning: false,
  learning: {
    topCandidates: [],
    candidateCount: 0,
    learnedSourceCount: 0,
  },
};

const eventList = document.querySelector("#eventList");
const eventTemplate = document.querySelector("#eventTemplate");
const filtersPanel = document.querySelector(".filters");
const mainContent = document.querySelector("main");
const mobileFilterMount = document.querySelector("#mobileFilterMount");
const categoryFilters = document.querySelector("#categoryFilters");
const sourceLinks = document.querySelector("#sourceLinks");
const learningCandidates = document.querySelector("#learningCandidates");
const suggestionInput = document.querySelector("#suggestionInput");
const suggestionButton = document.querySelector("#suggestionButton");
const suggestionStatus = document.querySelector("#suggestionStatus");
const refreshButton = document.querySelector("#refreshButton");
const enterButton = document.querySelector("#enterButton");
const enterButtonText = document.querySelector("#enterButtonText");
const engineStatus = document.querySelector("#engineStatus");
const sourceStatus = document.querySelector("#sourceStatus");
const lastUpdated = document.querySelector("#lastUpdated");
const searchInput = document.querySelector("#searchInput");
const fromDate = document.querySelector("#fromDate");
const toDate = document.querySelector("#toDate");
const clearFilters = document.querySelector("#clearFilters");
const totalEvents = document.querySelector("#totalEvents");
const thisMonth = document.querySelector("#thisMonth");
const westCorkCount = document.querySelector("#westCorkCount");
const weekendCount = document.querySelector("#weekendCount");
let filtersAreDocked = false;

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

function cleanSummary(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/#+\s*/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function previewSummary(value, maxLength = 260) {
  const clean = cleanSummary(value);
  if (clean.length <= maxLength) return clean;
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];
  const preview = sentences.slice(0, 2).join(" ").trim();
  if (preview && preview.length <= maxLength) return preview;
  return `${clean.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateParts(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { month: "TBC", day: "--", full: "Date TBC" };
  return {
    month: date.toLocaleString("en-IE", { month: "short" }),
    day: String(date.getDate()),
    full: date.toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
  };
}

function eventTimestamp(event) {
  const date = new Date(`${event.startDate || ""}T12:00:00`);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function matchesCategory(event) {
  return state.categories.has(event.category) || event.tags?.some((tag) => state.categories.has(tag));
}

function matchesArea(event) {
  if (state.area === "all") return true;
  return event.area === state.area || event.tags?.includes(state.area);
}

function matchesDate(event) {
  const start = event.startDate || "";
  if (!start) return false;
  if (state.from && start && start < state.from) return false;
  if (state.to && start && start > state.to) return false;
  return true;
}

function matchesQuery(event) {
  const query = normalizeSearchText(state.query);
  if (!query) return true;
  const haystack = normalizeSearchText([event.title, event.summary, event.location, event.category, ...(event.tags || [])].join(" "));
  return haystack.includes(query) || haystack.replace(/\s+/g, "").includes(query.replace(/\s+/g, ""));
}

function filteredEvents() {
  return state.events
    .filter(matchesCategory)
    .filter(matchesArea)
    .filter(matchesDate)
    .filter(matchesQuery)
    .sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
}

function renderCategoryFilters() {
  const baseEvents = state.events.filter(matchesArea).filter(matchesDate).filter(matchesQuery);
  const counts = categories.reduce((lookup, category) => {
    lookup[category.id] = baseEvents.filter((event) => event.category === category.id || event.tags?.includes(category.id)).length;
    return lookup;
  }, {});

  categoryFilters.replaceChildren();
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = `category-toggle ${state.categories.has(category.id) ? "active" : ""}`;
    button.type = "button";
    button.dataset.category = category.id;
    button.innerHTML = `<span>${escapeHtml(category.label)}</span><span>${counts[category.id] || 0}</span>`;
    button.addEventListener("click", () => {
      if (state.categories.has(category.id)) {
        state.categories.delete(category.id);
      } else {
        state.categories.add(category.id);
      }
      if (!state.categories.size) state.categories.add(category.id);
      render();
    });
    categoryFilters.append(button);
  });
}

function renderSourceLinks() {
  sourceLinks.replaceChildren();
  sourceDirectory.forEach((source) => {
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.name;
    sourceLinks.append(link);
  });
}

function renderLearning() {
  const candidates = state.learning?.topCandidates || [];
  learningCandidates.replaceChildren();

  if (!candidates.length) {
    const empty = document.createElement("span");
    empty.textContent = "No learned candidates yet";
    learningCandidates.append(empty);
    return;
  }

  candidates.forEach((candidate) => {
    const node = document.createElement("span");
    const planner = candidate.planner ? ` · ${candidate.planner}` : "";
    node.innerHTML = `<strong>${escapeHtml(candidate.name)}</strong> score ${escapeHtml(candidate.score)} · ${escapeHtml(candidate.area || "county")}${escapeHtml(planner)}`;
    learningCandidates.append(node);
  });
}

function renderMetrics(events) {
  const now = new Date();
  const thirtyDays = new Date(now);
  thirtyDays.setDate(now.getDate() + 30);

  totalEvents.textContent = events.length;
  thisMonth.textContent = events.filter((event) => {
    const time = eventTimestamp(event);
    return time >= now.getTime() && time <= thirtyDays.getTime();
  }).length;
  westCorkCount.textContent = events.filter((event) => event.area === "west-cork").length;
  weekendCount.textContent = events.filter((event) => {
    const date = new Date(`${event.startDate || ""}T12:00:00`);
    return !Number.isNaN(date.getTime()) && [0, 6].includes(date.getDay());
  }).length;
}

function renderEvents(events) {
  eventList.replaceChildren();

  if (!events.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No events match those filters. Widen the dates, switch an area, or scan the sources again.";
    eventList.append(empty);
    return;
  }

  events.forEach((event) => {
    const node = eventTemplate.content.cloneNode(true);
    const date = formatDateParts(event.startDate);
    node.querySelector(".month").textContent = date.month;
    node.querySelector(".day").textContent = date.day;
    node.querySelector(".meta").textContent = `${date.full} - ${event.location || "Location TBC"}`;
    node.querySelector("h3").textContent = event.title;
    node.querySelector(".source-badge").textContent = event.source || "Source";
    node.querySelector(".summary").textContent = previewSummary(event.summary || "Open the source for the latest details.");
    node.querySelector(".location").textContent = event.location || "Location TBC";
    node.querySelector(".time").textContent = event.endDate ? `Until ${formatDateParts(event.endDate).full}` : "Time TBC";
    node.querySelector(".confidence").textContent = event.confidence || "Scraped";

    const tagWrap = node.querySelector(".tags");
    [...new Set([event.category, ...(event.tags || [])])].filter(Boolean).forEach((tag) => {
      const tagNode = document.createElement("span");
      tagNode.className = "tag";
      tagNode.dataset.category = tag;
      tagNode.textContent = tag.replace("-", " ");
      tagWrap.append(tagNode);
    });

    const link = node.querySelector(".event-link");
    link.href = event.url || "https://www.purecork.ie/whats-on";
    link.textContent = "Click here to open link";
    eventList.append(node);
  });
}

function render() {
  renderCategoryFilters();
  renderLearning();
  const events = filteredEvents();
  renderMetrics(events);
  renderEvents(events);
}

function setEngineState(status, message, detail) {
  engineStatus.className = `status-card ${status}`;
  sourceStatus.textContent = message;
  if (detail) lastUpdated.textContent = detail;
}

function setScanControls(running) {
  refreshButton.disabled = running;
  enterButton.disabled = running;
  refreshButton.textContent = running ? "Scanning" : "Scan Sources";
  enterButton.classList.toggle("running", running);
  enterButtonText.textContent = running ? "Running" : "Enter";
}

function setSuggestionStatus(message, type = "") {
  suggestionStatus.textContent = message;
  suggestionStatus.className = `suggestion-status ${type}`.trim();
}

function syncFilterPlacement() {
  const shouldDock = window.matchMedia("(max-width: 980px)").matches;
  if (shouldDock && !filtersAreDocked) {
    mobileFilterMount.append(filtersPanel);
    filtersAreDocked = true;
  }

  if (!shouldDock && filtersAreDocked) {
    mainContent.insertBefore(filtersPanel, document.querySelector(".metrics"));
    filtersAreDocked = false;
  }
}

async function submitSuggestion() {
  const suggestion = suggestionInput.value.trim();
  if (!suggestion) {
    suggestionInput.focus();
    setSuggestionStatus("Add a place, event, or source URL first.", "error");
    return;
  }

  suggestionButton.disabled = true;
  suggestionButton.textContent = "Testing";
  setSuggestionStatus("Testing suggestion against the learning model...");

  try {
    const response = await fetch("/api/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        suggestion,
        area: "all",
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "Suggestion failed validation.");

    state.learning = payload.learning || state.learning;
    suggestionInput.value = "";
    setSuggestionStatus(payload.message || "Suggestion accepted.", "success");
    render();
  } catch (error) {
    setSuggestionStatus(error.message || "Suggestion could not be added.", "error");
  } finally {
    suggestionButton.disabled = false;
    suggestionButton.textContent = "Suggest";
  }
}

async function scanSources() {
  if (state.scanning) return;
  state.scanning = true;
  setScanControls(true);
  setEngineState("running", "Engine running", "Scanning Cork sources");

  try {
    const params = new URLSearchParams({
      q: state.query,
      area: state.area,
      from: state.from,
      to: state.to,
    });
    const response = await fetch(`/api/events?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const liveEvents = Array.isArray(payload.events) ? payload.events : [];
    state.learning = payload.learning || state.learning;
    const merged = liveEvents.length ? liveEvents : starterEvents;
    const byKey = new Map();
    merged.forEach((event) => {
      const key = `${event.title}|${event.startDate}|${event.location}`.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, event);
    });
    state.events = [...byKey.values()];
    setEngineState(
      "results",
      liveEvents.length ? "Results ready" : "Ready with starter results",
      liveEvents.length
        ? `${liveEvents.length} live records · ${state.learning.candidateCount || 0} learned candidates - ${new Date().toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" })}`
        : "No live records found"
    );
  } catch (error) {
    setEngineState("error", "Engine needs local server", "Static fallback active");
  } finally {
    state.scanning = false;
    setScanControls(false);
    render();
  }
}

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.area = button.dataset.area;
    render();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

fromDate.addEventListener("input", (event) => {
  state.from = event.target.value;
  render();
});

toDate.addEventListener("input", (event) => {
  state.to = event.target.value;
  render();
});

clearFilters.addEventListener("click", () => {
  state.query = "";
  state.area = "all";
  state.from = "";
  state.to = "";
  state.categories = new Set(categories.map((category) => category.id));
  searchInput.value = "";
  fromDate.value = "";
  toDate.value = "";
  document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item.dataset.area === "all"));
  render();
});

refreshButton.addEventListener("click", scanSources);
enterButton.addEventListener("click", scanSources);
suggestionButton.addEventListener("click", submitSuggestion);
suggestionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) submitSuggestion();
});
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") scanSources();
});

renderSourceLinks();
syncFilterPlacement();
window.addEventListener("resize", syncFilterPlacement);
render();
