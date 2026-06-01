const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");
const tls = require("tls");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_ROOT = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : ROOT;
const LEARNING_FILE = path.join(ROOT, "learned-sources.json");
const MANUAL_SOURCES_FILE = path.join(ROOT, "manual-sources.json");
const APPROVED_SOURCES_FILE = path.join(DATA_ROOT, "approved-sources.json");
const SUGGESTIONS_FILE = path.join(DATA_ROOT, "suggestions-inbox.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const SUGGESTION_EMAIL_TO = process.env.SUGGESTION_EMAIL_TO || "";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || SUGGESTION_EMAIL_TO;
const SMTP_SECURE = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || SMTP_PORT === 465;

function ensureDataRoot() {
  if (!fs.existsSync(DATA_ROOT)) fs.mkdirSync(DATA_ROOT, { recursive: true });
}

const seedSources = [
  { name: "Pure Cork", url: "https://www.purecork.ie/whats-on", area: "county", category: "festival" },
  { name: "Taste Cork Farmers Markets", url: "https://www.tastecork.ie/explore-cork/food-markets/farmers-markets/west-cork", area: "county", category: "markets" },
  { name: "Explore West Cork Food Markets", url: "https://explorewestcork.ie/food-markets", area: "west-cork", category: "markets" },
  { name: "Skibbereen Farmers Market", url: "https://skibbereenmarket.com/", area: "west-cork", category: "markets" },
  { name: "Midleton Farmers Market", url: "https://www.tastecork.ie/food-producers/midleton-farmers-market", area: "county", category: "markets" },
  { name: "Marina Market", url: "https://www.marinamarket.ie/", area: "city", category: "markets" },
  { name: "Cork Heritage Pubs", url: "https://corkheritagepubs.com/whats-on/", area: "city", category: "music" },
  { name: "Sin É", url: "https://corkheritagepubs.com/sin-e/", area: "city", category: "trad" },
  { name: "Crane Lane Theatre", url: "https://corkheritagepubs.com/whats-on/", area: "city", category: "music" },
  { name: "Fred Zeppelins", url: "https://fredzeppelins.com/", area: "city", category: "music" },
  { name: "De Barra's Folk Club", url: "https://debarra.ie/venue/de-barras-folk-club/", area: "west-cork", category: "music" },
  { name: "De Barra's Folk Club Events", url: "https://debarra.ie/events/", area: "west-cork", category: "music" },
  { name: "Levis Corner House", url: "https://leviscornerhouse.com/events/", area: "west-cork", category: "music" },
  { name: "Levis Corner House", url: "https://leviscornerhouse.com/", area: "west-cork", category: "music" },
  { name: "Cork Fleadh", url: "https://www.corkfleadh.ie/", area: "county", category: "trad" },
  { name: "Munster Comhaltas", url: "https://www.munstercomhaltas.ie/", area: "county", category: "trad" },
  { name: "Comhaltas Cork", url: "https://comhaltas.ie/comhaltaslive/locations/cork/", area: "county", category: "trad" },
  { name: "Eventbrite Cork", url: "https://www.eventbrite.ie/d/ireland--cork/events/", area: "county", category: "festival" },
  {
    name: "Reddit r/cork",
    url: "https://www.reddit.com/r/cork/search.json?q=events%20OR%20gigs%20OR%20festival%20OR%20matches&restrict_sr=1&sort=new&t=month",
    area: "county",
    category: "festival",
    kind: "reddit",
  },
  { name: "CorkGigs", url: "https://www.corkgigs.com/v2/index.php", area: "county", category: "music" },
  { name: "Skiddle Cork", url: "https://www.skiddle.com/whats-on/Cork/", area: "county", category: "music" },
  { name: "Meetup Cork", url: "https://www.meetup.com/find/?location=ie--Cork&source=EVENTS", area: "county", category: "festival" },
  { name: "West Cork Music", url: "https://www.westcorkmusic.ie/events/", area: "west-cork", category: "music" },
  { name: "Cork Opera House", url: "https://www.corkoperahouse.ie/whats-on/", area: "city", category: "arts" },
  { name: "The Everyman", url: "https://everymancork.com/whats-on/", area: "city", category: "arts" },
  { name: "Cyprus Avenue", url: "https://www.cyprusavenue.ie/whats-on/", area: "city", category: "music" },
  { name: "Cork GAA", url: "https://gaacork.ie/fixtures/", area: "county", category: "gaa" },
  {
    name: "Munster Rugby",
    url: "https://www.munsterrugby.ie/munster-rugby-fixtures-results/",
    area: "county",
    category: "rugby",
  },
  { name: "Cork on a Fork", url: "https://www.corkcity.ie/en/cork-on-a-fork-fest/", area: "city", category: "food" },
  { name: "Cork Midsummer", url: "https://www.corkmidsummer.com/", area: "city", category: "festival" },
  { name: "Cork Circle", url: "https://corkcircle.ie/", area: "city", category: "festival" },
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function readLearningState() {
  try {
    const raw = fs.readFileSync(LEARNING_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      learnedSources: Array.isArray(parsed.learnedSources) ? parsed.learnedSources : [],
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
      ignored: Array.isArray(parsed.ignored) ? parsed.ignored : [],
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { learnedSources: [], candidates: [], ignored: [], updatedAt: null };
  }
}

function readManualSources() {
  try {
    const raw = fs.readFileSync(MANUAL_SOURCES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const sources = Array.isArray(parsed) ? parsed : parsed.sources;
    return Array.isArray(sources) ? sources.filter((source) => source?.name && source?.url) : [];
  } catch {
    return [];
  }
}

function readApprovedSources() {
  try {
    const raw = fs.readFileSync(APPROVED_SOURCES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const sources = Array.isArray(parsed) ? parsed : parsed.sources;
    return Array.isArray(sources) ? sources.filter((source) => source?.name && source?.url) : [];
  } catch {
    return [];
  }
}

function writeApprovedSources(sources) {
  ensureDataRoot();
  const payload = {
    sources,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(APPROVED_SOURCES_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function readSuggestionInbox() {
  try {
    const raw = fs.readFileSync(SUGGESTIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  } catch {
    return [];
  }
}

function writeSuggestionInbox(suggestions) {
  ensureDataRoot();
  const payload = {
    suggestions,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SUGGESTIONS_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function writeLearningState(state) {
  const safeState = {
    learnedSources: state.learnedSources || [],
    candidates: (state.candidates || []).filter((candidate) => isUsefulVenueName(candidate.name)),
    ignored: state.ignored || [],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(LEARNING_FILE, `${JSON.stringify(safeState, null, 2)}\n`);
  return safeState;
}

function sourceIdentity(source) {
  return normalizeSearchText(source.url || source.name || "");
}

function activityTermsFor(value, aliases = []) {
  const term = normalizeSearchText(value);
  const builtInAliases = {
    soccer: ["soccer", "football", "football club", "fc", "afc", "league of ireland"],
    football: ["football", "soccer", "football club", "fc", "afc", "league of ireland"],
  };
  return [...new Set([term, ...(builtInAliases[term] || []), ...aliases.map(normalizeSearchText)].filter(Boolean))];
}

function candidateActivityTerms(candidate) {
  return activityTermsFor(candidate.name, [...(candidate.aliases || []), ...(candidate.searchTerms || [])]);
}

function activityDiscoveryQueries(candidate) {
  const name = cleanText(candidate.name);
  const category = candidate.category || "festival";
  const terms = candidateActivityTerms(candidate);
  const planned = dedupeStrings(candidate.positiveQueries || candidate.suggestedQueries || [], 16);
  const templates = {
    sport: (term) => [
      `${term} Cork events`,
      `${term} Cork clubs`,
      `${term} Cork fixtures results`,
      `${term} Cork club fixtures`,
      `${term} Cork calendar`,
      `${term} Munster fixtures results`,
      `${term} Cork matches`,
    ],
    trad: (term) => [`${term} Cork events`, `${term} Cork sessions`, `${term} Cork festival`],
    music: (term) => [`${term} Cork gigs`, `${term} Cork concerts`, `${term} Cork events`],
    arts: (term) => [`${term} Cork theatre`, `${term} Cork performance`, `${term} Cork events`],
    markets: (term) => [`${term} Cork market`, `${term} Cork events`],
  };
  const builder = templates[category] || ((term) => [`${term} Cork events`, `${term} Cork what's on`]);
  return [...planned, ...terms.flatMap((term) => builder(term))];
}

function activityDiscoverySourcesForCandidate(candidate) {
  if (!isActivitySearchPrompt(candidate.name, candidate.category) && !(candidate.positiveQueries || candidate.suggestedQueries || []).length) return [];
  const searchTerms = candidateActivityTerms(candidate);
  return activityDiscoveryQueries(candidate).slice(0, 8).map((query) => ({
    name: `Activity discovery: ${query}`,
    url: `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    area: candidate.area || "county",
    category: candidate.category || "festival",
    kind: "discovery",
    learned: true,
    learnedActivityDiscovery: true,
    searchTerm: candidate.name,
    searchQuery: query,
    searchTerms,
    aliases: candidate.aliases || [],
    negativeTerms: candidate.negativeTerms || [],
    sourceHints: candidate.sourceHints || [],
    likelySourceTypes: candidate.likelySourceTypes || [],
    validationSignals: candidate.validationSignals || [],
    rejectionSignals: candidate.rejectionSignals || [],
    sourceTypes: candidate.sourceTypes || [],
    localityTerms: candidate.localityTerms || [],
  }));
}

function activityCandidateFromQuery(query) {
  const name = cleanText(query);
  const category = inferCategory(name, "festival", "Search query");
  if (!isActivitySearchPrompt(name, category)) return null;
  return {
    name,
    area: "county",
    category,
    score: 99,
    evidence: [{ source: "Search query" }],
  };
}

function getActiveSources(searchQuery = "") {
  const learning = readLearningState();
  const manualSources = [...readManualSources(), ...readApprovedSources()].map((source) => ({
    name: source.name,
    url: source.url,
    area: source.area || "county",
    category: source.category || "festival",
    kind: source.kind || "",
    searchTerm: source.searchTerm || "",
    searchTerms: source.searchTerms || [],
    aliases: source.aliases || [],
    negativeTerms: source.negativeTerms || [],
    validationSignals: source.validationSignals || [],
    rejectionSignals: source.rejectionSignals || [],
    localityTerms: source.localityTerms || [],
    manual: true,
    learnedSearch: Boolean(source.searchTerm),
  }));
  const learnedSources = learning.learnedSources
    .filter((source) => source.status !== "paused" && source.url)
    .map((source) => ({
      name: source.name,
      url: source.url,
      area: source.area || "county",
      category: source.category || "festival",
      searchTerm: source.searchTerm || "",
      searchTerms: source.searchTerms || [],
      aliases: source.aliases || [],
      negativeTerms: source.negativeTerms || [],
      sourceHints: source.sourceHints || [],
      likelySourceTypes: source.likelySourceTypes || [],
      validationSignals: source.validationSignals || [],
      rejectionSignals: source.rejectionSignals || [],
      sourceTypes: source.sourceTypes || [],
      localityTerms: source.localityTerms || [],
      learned: true,
      learnedSearch: Boolean(source.searchTerm),
    }));
  const searchableCandidates = learning.candidates
    .filter((candidate) => candidate.status !== "ignored" && candidate.score >= 4 && isUsefulVenueName(candidate.name))
    .sort((a, b) => b.score - a.score);
  const priorityCandidates = searchableCandidates.filter(
    (candidate) => isActivitySearchPrompt(candidate.name, candidate.category) || candidate.evidence?.some((item) => item.source === "User suggestion")
  );
  const normalizedQuery = normalizeSearchText(searchQuery);
  const queryFocusedCandidates = normalizedQuery
    ? priorityCandidates.filter((candidate) => {
        const terms = candidateActivityTerms(candidate);
        return matchesTerm(candidate.name, normalizedQuery) || terms.some((term) => matchesTerm(term, normalizedQuery) || matchesTerm(normalizedQuery, term));
      })
    : priorityCandidates;
  const queryCandidate = activityCandidateFromQuery(searchQuery);
  const activeCandidates = [...queryFocusedCandidates, queryCandidate, ...(normalizedQuery ? [] : searchableCandidates)]
    .filter(Boolean)
    .filter((candidate, index, list) => list.findIndex((item) => normalizeSearchText(item.name) === normalizeSearchText(candidate.name)) === index)
    .slice(0, 16);
  const activityDiscoverySources = activeCandidates.flatMap(activityDiscoverySourcesForCandidate);
  const candidateSearches = activeCandidates.flatMap((candidate) => {
      const query = encodeURIComponent(candidate.name);
      const category = candidate.category || "festival";
      const searchTerms = encodeURIComponent(categorySearchTerms(category));
      const searches = [
        {
          name: `Learned Reddit search: ${candidate.name}`,
          url: `https://www.reddit.com/r/cork/search.json?q=${query}%20${searchTerms}&restrict_sr=1&sort=new&t=month`,
          area: candidate.area || "county",
          category,
          kind: "reddit",
          learned: true,
          learnedSearch: true,
          searchTerm: candidate.name,
          searchTerms: candidateActivityTerms(candidate),
          negativeTerms: candidate.negativeTerms || [],
          rejectionSignals: candidate.rejectionSignals || [],
        },
        {
          name: `Learned Eventbrite search: ${candidate.name}`,
          url: `https://www.eventbrite.ie/d/ireland--cork/events/?q=${query}`,
          area: candidate.area || "county",
          category,
          learned: true,
          learnedSearch: true,
          searchTerm: candidate.name,
          searchTerms: candidateActivityTerms(candidate),
          negativeTerms: candidate.negativeTerms || [],
          rejectionSignals: candidate.rejectionSignals || [],
        },
      ];
      if (isActivitySearchPrompt(candidate.name, category)) {
        searches.push(
          {
            name: `Learned Skiddle search: ${candidate.name}`,
            url: `https://www.skiddle.com/whats-on/Cork/?keyword=${query}`,
            area: candidate.area || "county",
            category,
            learned: true,
            learnedSearch: true,
            searchTerm: candidate.name,
            searchTerms: candidateActivityTerms(candidate),
            negativeTerms: candidate.negativeTerms || [],
            rejectionSignals: candidate.rejectionSignals || [],
          },
          {
            name: `Learned Meetup search: ${candidate.name}`,
            url: `https://www.meetup.com/find/?keywords=${query}&location=ie--Cork&source=EVENTS`,
            area: candidate.area || "county",
            category,
            learned: true,
            learnedSearch: true,
            searchTerm: candidate.name,
            searchTerms: candidateActivityTerms(candidate),
            negativeTerms: candidate.negativeTerms || [],
            rejectionSignals: candidate.rejectionSignals || [],
          }
        );
      }
      return searches;
    });
  const seen = new Set();
  return [...seedSources, ...manualSources, ...learnedSources, ...activityDiscoverySources, ...candidateSearches].filter((source) => {
    const key = sourceIdentity(source);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, headers);
  response.end(body);
}

function sendJson(response, status, data) {
  send(response, status, JSON.stringify(data, null, 2), { "content-type": "application/json; charset=utf-8" });
}

function adminTokenFrom(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  return request.headers["x-admin-token"] || url.searchParams.get("token") || "";
}

function requireAdmin(request, response) {
  if (!ADMIN_TOKEN) return true;
  if (adminTokenFrom(request) === ADMIN_TOKEN) return true;
  sendJson(response, 401, { ok: false, error: "Admin token required." });
  return false;
}

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 131_072) {
        reject(new Error("Request is too long."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON payload."));
      }
    });
    request.on("error", reject);
  });
}

function cleanText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/\b(?:aria|data|class|id|href|src|style|title|alt|rel|target|role|datetime|content|itemprop|itemtype|itemscope|onclick)[\w-]*=(["']).*?\1/gi, " ")
    .replace(/\b(?:aria|data|class|id|href|src|style|title|alt|rel|target|role|datetime|content|itemprop|itemtype|itemscope|onclick)[\w-]*=[^\s>]+/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "e")
    .replace(/&aacute;/g, "a")
    .replace(/&oacute;/g, "o")
    .replace(/&iacute;/g, "i")
    .replace(/&uacute;/g, "u")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/(?:→|->)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absolutize(url, base) {
  try {
    return new URL(url, base).toString();
  } catch {
    return base;
  }
}

function normalizeDate(value) {
  if (!value) return "";
  const text = cleanText(value).replace(/\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b\.?,?/gi, " ");
  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const slash = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }
  const monthNames = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };
  const dayMonth = text.match(/\b(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)[a-z]*\s*(\d{4})?\b/i);
  if (dayMonth) {
    const year = dayMonth[3] || String(new Date().getFullYear());
    return `${year}-${monthNames[dayMonth[2].toLowerCase().slice(0, 4)] || monthNames[dayMonth[2].toLowerCase().slice(0, 3)]}-${dayMonth[1].padStart(2, "0")}`;
  }
  const monthDay = text.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)[a-z]*\s+(\d{1,2}),?\s*(\d{4})?\b/i);
  if (monthDay) {
    const year = monthDay[3] || String(new Date().getFullYear());
    return `${year}-${monthNames[monthDay[1].toLowerCase().slice(0, 4)] || monthNames[monthDay[1].toLowerCase().slice(0, 3)]}-${monthDay[2].padStart(2, "0")}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function containsTerm(text, term) {
  const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function matchesTerm(text, term) {
  const normalizedTerm = normalizeSearchText(term);
  const compactText = normalizeSearchText(text).replace(/\s+/g, "");
  const compactTerm = normalizedTerm.replace(/\s+/g, "");
  return containsTerm(text, normalizedTerm) || (compactTerm.length >= 5 && compactText.includes(compactTerm));
}

function categorySearchTerms(category) {
  const terms = {
    sport: "fixture OR match OR game OR club OR tournament",
    rugby: "fixture OR match OR game OR tickets",
    gaa: "fixture OR match OR hurling OR football",
    trad: "session OR fleadh OR ceili OR trad",
    music: "gig OR concert OR music OR tickets",
    arts: "show OR theatre OR performance OR exhibition",
    markets: "market OR farmers market OR food",
    food: "food OR dining OR tasting OR market",
    agriculture: "show OR fair OR farm OR agriculture",
    family: "family OR kids OR children",
  };
  return terms[category] || "event OR gig OR festival";
}

function normalizePlannerCategory(value, fallback = "festival") {
  const category = normalizeSearchText(value);
  const allowed = new Set(["food", "festival", "music", "trad", "sport", "rugby", "gaa", "arts", "family", "agriculture", "markets"]);
  return allowed.has(category) ? category : fallback;
}

function dedupeStrings(values, limit = 12) {
  return [...new Set((values || []).map(cleanText).filter(Boolean))].slice(0, limit);
}

function fallbackSuggestionPlan(value, area = "county") {
  const activity = cleanText(value);
  const category = inferCategory(activity, "festival", "User suggestion");
  return {
    activity,
    category,
    aliases: activityTermsFor(activity).filter((term) => term !== normalizeSearchText(activity)),
    positiveQueries: activityDiscoveryQueries({ name: activity, category, area }).slice(0, 12),
    negativeTerms: category === "sport" && /soccer|football/i.test(activity) ? ["gaa", "gaelic football", "hurling", "rugby"] : [],
    sourceHints: [],
    likelySourceTypes: category === "sport" ? ["club website", "fixture page", "league calendar"] : ["event listing", "venue page"],
    validationSignals: ["event", "events", "calendar", "fixtures", "results", "tickets", "programme", "club", "venue"],
    rejectionSignals: ["news article", "historical article", "generic directory", "old result", "unrelated location", ...(category === "sport" && /soccer|football/i.test(activity) ? ["gaa", "gaelic football", "hurling", "rugby"] : [])],
    sourceTypes: category === "sport" ? ["club website", "association website", "league fixture page"] : ["official website", "venue calendar", "listing page"],
    localityTerms: ["Cork", "West Cork", "Cork City", "County Cork", "Munster"],
    confidence: "medium",
  };
}

function extractResponseText(payload) {
  if (payload.output_text) return payload.output_text;
  const texts = [];
  (payload.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.text) texts.push(content.text);
    });
  });
  return texts.join("\n");
}

function isActivitySearchPrompt(value, category) {
  const text = normalizeSearchText(value);
  if (!text) return false;
  const activityTerms = [
    "soccer",
    "football",
    "cricket",
    "rowing",
    "volleyball",
    "basketball",
    "athletics",
    "running",
    "cycling",
    "tennis",
    "swimming",
    "boxing",
    "martial arts",
    "hockey",
    "badminton",
    "sailing",
    "triathlon",
    "kabuki",
    "sean nos",
    "seanos",
    "shanos",
    "ceili",
    "fleadh",
  ];
  return category !== "festival" && activityTerms.some((term) => matchesTerm(text, term));
}

function inferCategory(text, fallback, sourceName = "") {
  if (/cork gaa/i.test(sourceName) || fallback === "gaa") return "gaa";
  if (/munster rugby/i.test(sourceName)) return "rugby";
  if (/cork on a fork/i.test(sourceName) || fallback === "food") return "food";

  const haystack = normalizeSearchText(text || "");
  if (/comedy|stand up|stand-up/i.test(haystack)) return "arts";
  const tradTerms = [
    "irish traditional",
    "traditional irish",
    "trad",
    "fleadh",
    "ceili",
    "ceilí",
    "céilí",
    "ceili mor",
    "céilí mór",
    "session",
    "sessions",
    "seisiun",
    "seisiún",
    "comhaltas",
    "set dancing",
    "sean nos",
    "sean nos singing",
    "seanos",
    "shanos",
    "sean-nós",
    "scoil eigse",
    "scoil éigse",
    "oiche scorai",
    "oiche scoraiocht",
    "oíche scoraíocht",
    "ceol chorcai",
    "ceol chorcaí",
  ];
  if (fallback === "trad" || tradTerms.some((term) => matchesTerm(haystack, term))) return "trad";
  if (/\b(fc|afc|rovers|rangers|united|wanderers|ramblers|athletic)\b/i.test(haystack)) return "sport";

  const tests = [
    ["markets", ["farmers market", "farmer's market", "farmers' market", "market", "craft fair", "food market", "producer market"]],
    ["food", ["food", "fork", "taste", "chef", "market", "dining", "drink", "beer"]],
    ["rugby", ["rugby", "munster", "urc", "virgin media park"]],
    ["gaa", ["gaa", "hurling", "camogie", "gaelic football"]],
    [
      "sport",
      [
        "fixture",
        "fixtures",
        "match",
        "matches",
        "sports",
        "casual games",
        "soccer",
        "football",
        "football club",
        "football match",
        "league of ireland",
        "loi",
        "cork city fc",
        "turners cross",
        "st colman's park",
        "st colmans park",
        "rowing",
        "volleyball",
        "basketball",
        "athletics",
        "running",
        "cycling",
        "tennis",
        "swimming",
        "boxing",
        "martial arts",
        "hockey",
        "cricket",
        "athletic",
        "united",
        "ramblers",
        "rovers",
        "badminton",
        "sailing",
        "triathlon",
        "marathon",
        "parkrun",
        "hill walking",
        "hiking",
        "walking club",
      ],
    ],
    ["music", ["music", "gig", "concert", "jazz", "band", "dj", "chamber", "folk club"]],
    ["agriculture", ["agriculture", "agri", "farm", "cattle", "ploughing"]],
    ["family", ["family", "children", "kids"]],
    ["arts", ["theatre", "theater", "opera", "comedy", "arts", "film", "cinema", "art house", "arthouse", "exhibition", "kabuki", "drama", "dance performance"]],
    ["festival", ["festival", "fest"]],
  ];
  const match = tests.find(([, words]) => words.some((word) => matchesTerm(haystack, word)));
  return match ? match[0] : fallback || "festival";
}

function tagsFor(category, area, fallback) {
  const tags = [category, area].filter(Boolean);
  if (category === "trad") tags.push("music", "festival");
  if (category === "markets") tags.push("food");
  if (category === "gaa" || category === "rugby") tags.push("sport");
  if (fallback && fallback !== category && fallback !== "festival") tags.push(fallback);
  return [...new Set(tags)];
}

function inferArea(text, fallback) {
  const haystack = String(text || "").toLowerCase();
  const westCorkPlaces = [
    "clonakilty",
    "bantry",
    "skibbereen",
    "sherkin",
    "baltimore",
    "kinsale",
    "dunmanway",
    "ballydehob",
    "schull",
    "glandore",
    "union hall",
    "castletownbere",
  ];
  if (westCorkPlaces.some((place) => haystack.includes(place))) return "west-cork";
  if (haystack.includes("cork city") || haystack.includes("maccurtain") || haystack.includes("cyprus avenue")) return "city";
  return fallback || "county";
}

function eventFromJsonLd(item, source) {
  const type = Array.isArray(item["@type"]) ? item["@type"].join(" ") : item["@type"];
  if (!String(type || "").toLowerCase().includes("event")) return null;

  const location = typeof item.location === "string" ? item.location : item.location?.name || item.location?.address?.addressLocality || "";
  const title = item.name || item.headline;
  if (!title) return null;

  const text = [title, item.description, location].join(" ");
  return {
    title: cleanText(title),
    summary: cleanText(item.description || "Open the source for the latest details."),
    startDate: normalizeDate(item.startDate),
    endDate: normalizeDate(item.endDate),
    location: cleanText(location || "Cork"),
    area: inferArea(text, source.area),
    category: inferCategory(text, source.category, source.name),
    tags: tagsFor(inferCategory(text, source.category, source.name), inferArea(text, source.area), source.category),
    source: source.name,
    url: absolutize(item.url || item.mainEntityOfPage || source.url, source.url),
    confidence: "Structured event data",
  };
}

function extractJsonLdEvents(html, source) {
  const events = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html))) {
    const raw = match[1].replace(/<!--|-->/g, "").trim();
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
      nodes.flat().forEach((node) => {
        const event = eventFromJsonLd(node, source);
        if (event) events.push(event);
      });
    } catch {
      // Some sites include non-standard JSON-LD. Ignore and continue with heuristics.
    }
  }
  return events;
}

function extractHeuristicEvents(html, source) {
  const events = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const datePattern =
    /(\d{4}-\d{2}-\d{2})|(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*(\s+\d{4})?)|((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?(\s+\d{4})?)/i;
  const genericLabels = new Set([
    "book",
    "learn more",
    "read more",
    "events",
    "festivals",
    "live music",
    "food & drink events",
    "cinema & film",
    "whats on",
    "what's on",
    "fixtures",
    "show in map",
    "show map",
    "county cork",
    "cork",
    "buy tickets",
    "tickets",
    "master fixture plan",
    "county championship tickets",
    "fixtures & results",
    "view all events",
    "more results",
    "men's team",
    "mens team",
    "women's team",
    "womens team",
    "munster a",
    "urc table",
    "facebook",
    "twitter",
    "instagram",
    "see all listings",
  ]);
  let match;

  while ((match = linkRegex.exec(html)) && events.length < 20) {
    const href = match[1];
    const label = cleanText(match[2]);
    if (label.length < 8 || label.length > 140) continue;
    if (/https?:\/\//i.test(label) || /\bwww\./i.test(label)) continue;
    if (genericLabels.has(label.toLowerCase())) continue;
    if (/\/categories\/|#|mailto:|tel:/i.test(href)) continue;

    const context = cleanText(html.slice(Math.max(0, match.index - 500), match.index + 800));
    const dateMatch = label.match(datePattern) || context.match(datePattern);
    const normalized = normalizeDate(dateMatch?.[0]);
    const eventish =
      /event|what'?s on|fixture|gig|festival|concert|match|show|book|ticket|folk|music|trad|fleadh|ceili|ceilí|céilí|session|seisiún|comhaltas/i.test(
        `${href} ${label} ${context}`
      );
    if (!eventish) continue;
    if (!normalized && !/\/whats-on\/|\/event|\/events\/|fixture|ticket|book|folk-club/i.test(href)) continue;

    const text = `${label} ${context}`;
    const category = inferCategory(text, source.category, source.name);
    const area = inferArea(text, source.area);
    const summary =
      category === "gaa"
        ? "Official Cork GAA fixture listing. Open the source for teams, venue, throw-in time, and fixture status."
        : category === "rugby"
          ? "Official rugby fixture listing. Open the source for venue, kick-off time, and ticket details."
          : context.slice(0, 220) || "Open the source for the latest details.";

    events.push({
      title: label,
      summary,
      startDate: normalized,
      location: inferArea(text, source.area) === "city" ? "Cork City" : "County Cork",
      area,
      category,
      tags: tagsFor(category, area, source.category),
      source: source.name,
      url: absolutize(href, source.url),
      confidence: normalized ? "Page listing" : "Listing candidate",
    });
  }

  return events;
}

function isSportFixtureSource(source) {
  return source.category === "sport" && Boolean(source.searchTerm);
}

function hasCorkClubSignal(text) {
  return /\b(cork|mardyke|farmers cross|farmer's cross|midleton|harlequins|cobh|ramblers|ucc|mtu)\b/i.test(text);
}

function extractSportFixtures(html, source) {
  if (!isSportFixtureSource(source)) return [];
  const text = cleanText(html);
  const events = [];
  const fixturePattern =
    /\b([A-Z][A-Za-z0-9 '&.-]{2,70}?)\s+(MCU\s+.{3,80}?)\s+Opponent\s+(.{3,80}?)\s+Venue\s+(.{3,90}?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}[.:]\d{2}\s*(?:am|pm))/gi;
  const seen = new Set();
  let match;

  while ((match = fixturePattern.exec(text)) && events.length < 40) {
    const [, team, competition, opponent, venue, date, time] = match.map(cleanText);
    const fixtureText = `${team} ${competition} ${opponent} ${venue}`;
    if (!hasCorkClubSignal(fixtureText)) continue;

    const normalizedDate = normalizeDate(date);
    const title = `${team} v ${opponent}`;
    const location = venue.replace(/\s+/g, " ").trim();
    const key = normalizeSearchText(`${title} ${normalizedDate} ${location}`);
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      title,
      summary: `${competition}. ${cleanText(source.searchTerm)} fixture at ${location}, scheduled for ${time}. Open the source to confirm teams, venue, and match status.`,
      startDate: normalizedDate,
      location,
      area: inferArea(location, source.area),
      category: source.category,
      tags: ["sport", source.searchTerm, inferArea(location, source.area), "fixtures"].filter(Boolean),
      source: source.name,
      url: source.url,
      confidence: "Fixture source",
    });
  }

  return events;
}

function extractTableFixtureEvents(html, source) {
  if (source.category !== "sport") return [];
  const events = [];
  const seen = new Set();
  const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
  const datePattern =
    /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)[a-z]*\s+\d{4})\b/i;
  let match;

  while ((match = rowRegex.exec(html)) && events.length < 40) {
    const row = match[0]
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<br\s*\/?>/gi, " | ");
    const text = cleanText(row)
      .replace(/\s*\|\s*/g, " | ")
      .replace(/\s+/g, " ")
      .trim();
    if (!/\b(v|vs|versus)\b/i.test(text)) continue;

    const dateMatch = text.match(datePattern);
    const startDate = normalizeDate(dateMatch?.[0]);
    if (!startDate) continue;

    const parts = text.split("|").map((part) => cleanText(part)).filter(Boolean);
    const standaloneVIndex = parts.findIndex((part) => /^(v|vs|versus)$/i.test(part));
    const fixtureIndex = standaloneVIndex > 0 && parts[standaloneVIndex + 1]
      ? standaloneVIndex - 1
      : parts.findIndex((part) => /\b(v|vs|versus)\b/i.test(part));
    const fixturePart = standaloneVIndex > 0 && parts[standaloneVIndex + 1]
      ? `${parts[standaloneVIndex - 1]} v ${parts[standaloneVIndex + 1]}`
      : parts[fixtureIndex] || text;
    if (/view all events|more results|fixtures & results/i.test(fixturePart)) continue;

    const timePart = parts.find((part) => /\b\d{1,2}[:.]\d{2}\b/.test(part)) || "";
    const competition = parts.find((part) => part !== fixturePart && part !== dateMatch[0] && part !== timePart && !normalizeDate(part)) || "";
    const locationPart = standaloneVIndex > 0 && parts[standaloneVIndex + 2]
      ? parts[standaloneVIndex + 2]
      : parts[fixtureIndex + 1] || "";
    const location = locationPart && !/\b(view|scorecard|report|result)\b/i.test(locationPart) ? locationPart : "County Cork";
    const title = fixturePart.replace(/\s+/g, " ").trim();
    if (!hasCorkClubSignal(`${title} ${location}`)) continue;
    const key = normalizeSearchText(`${title} ${startDate} ${location}`);
    if (!title || seen.has(key)) continue;
    seen.add(key);

    const area = inferArea(`${title} ${location}`, source.area);
    events.push({
      title,
      summary: `${competition ? `${competition}. ` : ""}${cleanText(source.searchTerm || "Sport")} fixture${timePart ? ` at ${timePart}` : ""}. Open the source to confirm venue and match status.`,
      startDate,
      location,
      area,
      category: "sport",
      tags: ["sport", source.searchTerm, area, "fixtures"].filter(Boolean),
      source: source.name,
      url: source.url,
      confidence: "Fixture table",
    });
  }

  return events;
}

async function fetchLinkedFixtureEvents(html, source) {
  if (source.category !== "sport") return [];
  const links = extractFixturePageLinks(html, source.url).slice(0, 6);
  if (!links.length) return [];

  const results = await Promise.all(
    links.map(async (url) => {
      try {
        const linkedHtml = await fetchHtml(url);
        return [
          ...extractSportFixtures(linkedHtml, { ...source, url }),
          ...extractTableFixtureEvents(linkedHtml, { ...source, url }),
        ];
      } catch {
        return [];
      }
    })
  );

  return dedupe(results.flat());
}

function extractKnownTextEvents(html, source) {
  const text = cleanText(html);
  const events = [];

  if (/cork fleadh/i.test(source.name) && /Fleadh Cheoil Chorca/i.test(text)) {
    events.push({
      title: "Fleadh Cheoil Chorcaí 2026",
      summary:
        "Week-long Cork county fleadh with traditional Irish music, ceili dancing, music sessions, street entertainment, competitions, singing, dancing, storytelling, and pub session trails.",
      startDate: "2026-05-04",
      endDate: "2026-05-10",
      location: "Ballincollig and Dunmanway, Cork",
      area: "county",
      category: "trad",
      tags: tagsFor("trad", "county", "festival").concat(["fleadh", "ceili", "session"]),
      source: source.name,
      url: source.url,
      confidence: "Official page text",
    });
  }

  if (/cork fleadh/i.test(source.name) && /Ceol Chorca/i.test(text)) {
    events.push({
      title: "Ceol Chorcaí",
      summary: "A night of Irish traditional music, song, and dance connected with Cork Fleadh.",
      startDate: "2026-03-14",
      location: "Cork City Hall",
      area: "city",
      category: "trad",
      tags: tagsFor("trad", "city", "music").concat(["irish traditional", "song", "dance"]),
      source: source.name,
      url: source.url,
      confidence: "Official page text",
    });
  }

  return events;
}

function learnedSearchTermMatches(event, source) {
  if (!source.learnedSearch || !source.searchTerm) return true;
  const terms = source.searchTerms?.length ? source.searchTerms : activityTermsFor(source.searchTerm);
  const haystack = normalizeSearchText([event.title, event.summary, event.location, event.url, ...(event.tags || [])].join(" "));
  if (isNegativeActivityMatch(haystack, source)) return false;
  const termMatch = terms.some((term) => matchesTerm(haystack, term));
  if (!termMatch) return false;
  if (source.category === "sport" && isActivitySearchPrompt(source.searchTerm, source.category)) {
    const localityTerms = source.localityTerms?.length ? source.localityTerms : ["cork", "west cork", "cork city", "county cork"];
    const location = normalizeSearchText(event.location) === "county cork" ? "" : event.location;
    const eventText = normalizeSearchText([event.title, location].join(" "));
    return localityTerms.some((term) => matchesTerm(eventText, term));
  }
  return true;
}

function filterLearnedSearchEvents(events, source) {
  if (!source.learnedSearch || !source.searchTerm) return events;
  const learnedTags = activityTermsFor(source.searchTerm, source.aliases || []).filter(Boolean);
  return events
    .filter((event) => learnedSearchTermMatches(event, source))
    .map((event) => ({
      ...event,
      searchTerm: source.searchTerm,
      tags: [...new Set([...(event.tags || []), ...learnedTags])],
    }));
}

function isRelevantDiscoveredSource(text, source) {
  const haystack = normalizeSearchText([text, source.url].join(" "));
  const terms = source.searchTerms?.length ? source.searchTerms : activityTermsFor(source.searchTerm);
  const localityTerms = source.localityTerms?.length ? source.localityTerms : ["cork", "munster", "west cork", "cork city", "county cork"];
  const validationSignals = source.validationSignals?.length
    ? source.validationSignals
    : ["fixtures", "results", "matches", "events", "club", "league", "calendar", "whats on", "tickets"];
  const corkSignal = localityTerms.some((term) => matchesTerm(haystack, term));
  const sourceSignal = validationSignals.some((term) => matchesTerm(haystack, term));
  const activitySignal = terms.some((term) => matchesTerm(haystack, term));
  if (isNegativeActivityMatch(haystack, source)) return false;
  return activitySignal && corkSignal && (sourceSignal || source.category === "sport");
}

function isNegativeActivityMatch(haystack, source) {
  if ([...(source.negativeTerms || []), ...(source.rejectionSignals || [])].some((term) => matchesTerm(haystack, term))) return true;
  const term = normalizeSearchText(source.searchTerm || source);
  if (term === "soccer" || term === "football") {
    return /\b(gaa|gaelic|hurling|camogie|rugby|american football)\b/i.test(haystack);
  }
  return false;
}

function sourceNameFromPage(url, pageText, fallback) {
  const title = pageText.match(/\b([A-Z][A-Za-z0-9 '&.-]{2,80}(?:Club|Centre|Center|Fixtures|Results|League|Association|Ireland|Munster|Cork))\b/);
  if (title) return cleanText(title[1]);
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").split(".")[0].replace(/[-_]+/g, " ");
  } catch {
    return cleanText(fallback);
  }
}

function extractDiscoveryLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) && links.length < 8) {
    let href = match[1].replace(/&amp;/g, "&");
    try {
      const parsed = new URL(href, baseUrl);
      if (parsed.hostname.includes("duckduckgo.com") && parsed.pathname === "/l/") {
        const target = parsed.searchParams.get("uddg");
        if (target) href = target;
      } else {
        href = parsed.toString();
      }
      const target = new URL(href);
      const host = target.hostname.replace(/^www\./, "");
      if (/duckduckgo\.com|google\.com|bing\.com|facebook\.com|instagram\.com|youtube\.com|x\.com|twitter\.com/i.test(host)) continue;
      if (!/^https?:$/i.test(target.protocol)) continue;
      const url = target.toString();
      if (seen.has(url)) continue;
      seen.add(url);
      links.push(url);
    } catch {
      // Ignore malformed result links.
    }
  }

  return links;
}

function extractFixturePageLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) && links.length < 8) {
    const href = match[1].replace(/&amp;/g, "&");
    const label = cleanText(match[2]);
    if (!/fixture|match centre|match-center|matches|calendar/i.test(`${href} ${label}`)) continue;
    try {
      const url = new URL(href, baseUrl).toString();
      if (seen.has(url)) continue;
      seen.add(url);
      links.push(url);
    } catch {
      // Ignore malformed fixture links.
    }
  }

  return links;
}

async function fetchHtml(url, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "CorkEventRadar/1.0 (+local personal dashboard)",
        accept,
      },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function discoverySourceFields(source, url) {
  return {
    name: `${source.searchTerm} discovered source`,
    url,
    area: source.area,
    category: source.category,
    learnedSearch: true,
    searchTerm: source.searchTerm,
    searchTerms: source.searchTerms || activityTermsFor(source.searchTerm),
    aliases: source.aliases || [],
    negativeTerms: source.negativeTerms || [],
    sourceHints: source.sourceHints || [],
    likelySourceTypes: source.likelySourceTypes || [],
    validationSignals: source.validationSignals || [],
    rejectionSignals: source.rejectionSignals || [],
    sourceTypes: source.sourceTypes || [],
    localityTerms: source.localityTerms || [],
  };
}

async function inspectDiscoveredUrl(source, found) {
  const url = typeof found === "string" ? found : found.url;
  const discovered = discoverySourceFields(source, url);
  try {
    const html = await fetchHtml(url);
    const pageText = cleanText(html).slice(0, 8000);
    const relevantSource = isRelevantDiscoveredSource(pageText, discovered);
    const sportFixtures = extractSportFixtures(html, discovered);
    const tableFixtures = extractTableFixtureEvents(html, discovered);
    const linkedFixtures = await fetchLinkedFixtureEvents(html, discovered);
    const structured = extractJsonLdEvents(html, discovered);
    const knownText = extractKnownTextEvents(html, discovered);
    const heuristic = structured.length ? [] : extractHeuristicEvents(html, discovered);
    const events = filterLearnedSearchEvents([...sportFixtures, ...tableFixtures, ...linkedFixtures, ...knownText, ...structured, ...heuristic], discovered);
    return {
      events,
      source: relevantSource || events.length
        ? {
            name: found.name || sourceNameFromPage(url, pageText, source.searchTerm),
            url,
            area: inferArea(pageText, source.area),
            category: source.category,
            searchTerm: source.searchTerm,
            searchTerms: source.searchTerms || activityTermsFor(source.searchTerm),
            aliases: source.aliases || [],
            negativeTerms: source.negativeTerms || [],
            sourceHints: source.sourceHints || [],
            likelySourceTypes: source.likelySourceTypes || [],
            validationSignals: source.validationSignals || [],
            rejectionSignals: source.rejectionSignals || [],
            sourceTypes: source.sourceTypes || [],
            localityTerms: source.localityTerms || [],
            evidenceTitle: events[0]?.title || found.reason || `${source.searchTerm} source discovered from search`,
          }
        : null,
    };
  } catch {
    return { events: [], source: null };
  }
}

async function discoveryLinksFromSearchPage(source) {
  const searchHtml = await fetchHtml(source.url);
  return extractDiscoveryLinks(searchHtml, source.url).slice(0, 8);
}

async function fetchDiscoverySource(source) {
  const errors = [];
  let foundSources = [];

  try {
    foundSources = (await discoveryLinksFromSearchPage(source)).map((url) => ({ url }));
  } catch (error) {
    errors.push(`search-page: ${error.message}`);
  }

  if (!foundSources.length) {
    return { source: source.name, ok: false, error: errors.join("; ") || "No discovery links found", events: [] };
  }

  const seen = new Set();
  const uniqueSources = foundSources.filter((found) => {
    const key = normalizeSearchText(found.url);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);

  const results = await Promise.all(uniqueSources.map((found) => inspectDiscoveredUrl(source, found)));
  return {
    source: source.name,
    ok: true,
    error: errors.join("; ") || undefined,
    events: dedupe(results.flatMap((result) => result.events)),
    discoveredSources: results.map((result) => result.source).filter(Boolean),
  };
}

async function fetchRedditSource(source) {
  try {
    const raw = await fetchHtml(source.url, "application/json");
    const payload = JSON.parse(raw);
    const posts = payload?.data?.children || [];
    const events = posts
      .map((item) => item?.data)
      .filter(Boolean)
      .filter((post) => /event|gig|concert|festival|market|match|rugby|gaa|food|weekend|what'?s on/i.test(`${post.title} ${post.selftext || ""}`))
      .slice(0, 20)
      .map((post) => {
        const text = `${post.title} ${post.selftext || ""}`;
        const category = inferCategory(text, source.category, source.name);
        const area = inferArea(text, source.area);
        const eventDate = normalizeDate(text);
        return {
          title: cleanText(post.title),
          summary: cleanText(post.selftext || "Reddit discussion that may mention a local event. Open the source to verify details.").slice(0, 240),
          startDate: eventDate,
          location: area === "city" ? "Cork City / Reddit r/cork" : "County Cork / Reddit r/cork",
          area,
          category,
          tags: tagsFor(category, area, source.category),
          source: source.name,
          url: absolutize(post.permalink || source.url, "https://www.reddit.com"),
          confidence: "Community post",
        };
      });
    return { source: source.name, ok: true, events: filterLearnedSearchEvents(events, source) };
  } catch (error) {
    return { source: source.name, ok: false, error: error.message, events: [] };
  }
}

async function fetchSource(source) {
  if (source.kind === "discovery") return fetchDiscoverySource(source);
  if (source.kind === "reddit") return fetchRedditSource(source);

  try {
    const html = await fetchHtml(source.url);
    const sportFixtures = extractSportFixtures(html, source);
    const tableFixtures = extractTableFixtureEvents(html, source);
    const linkedFixtures = await fetchLinkedFixtureEvents(html, source);
    const structured = extractJsonLdEvents(html, source);
    const knownText = extractKnownTextEvents(html, source);
    const heuristic = structured.length ? [] : extractHeuristicEvents(html, source);
    return { source: source.name, ok: true, events: filterLearnedSearchEvents([...sportFixtures, ...tableFixtures, ...linkedFixtures, ...knownText, ...structured, ...heuristic], source) };
  } catch (error) {
    return { source: source.name, ok: false, error: error.message, events: [] };
  }
}

function eventMatchesQuery(event, params) {
  const q = normalizeSearchText(params.get("q") || "");
  if (!q) return true;
  const haystack = normalizeSearchText([event.title, event.summary, event.location, event.category, event.searchTerm, ...(event.tags || [])].join(" "));
  return haystack.includes(q) || haystack.replace(/\s+/g, "").includes(q.replace(/\s+/g, ""));
}

function eventMatchesArea(event, params) {
  const area = params.get("area") || "all";
  return area === "all" || event.area === area || event.tags?.includes(area);
}

function eventMatchesDate(event, params) {
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  if (!event.startDate) return false;
  if (from && event.startDate < from) return false;
  if (to && event.startDate > to) return false;
  return true;
}

function dedupe(events) {
  const seen = new Set();
  return events.filter((event) => {
    const key = `${event.title}|${event.startDate}|${event.location}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const recurringMarkets = [
  {
    title: "Skibbereen Farmers Market",
    day: 6,
    summary: "Weekly farmers market at the Fair Field with local food, plants, crafts, and West Cork producers.",
    location: "Fair Field, Skibbereen",
    area: "west-cork",
    url: "https://skibbereenmarket.com/",
    source: "Skibbereen Farmers Market",
  },
  {
    title: "Clonakilty Farmers Market",
    day: 5,
    summary: "Weekly Friday market in Clonakilty with local produce, food stalls, and craft producers.",
    location: "Clonakilty, West Cork",
    area: "west-cork",
    url: "https://www.tastecork.ie/explore-cork/food-markets/farmers-markets/west-cork",
    source: "Taste Cork",
  },
  {
    title: "Bantry Market",
    day: 5,
    summary: "Weekly Friday market in Bantry with food, produce, plants, crafts, and local traders.",
    location: "Bantry, West Cork",
    area: "west-cork",
    url: "https://explorewestcork.ie/food-markets",
    source: "Explore West Cork",
  },
  {
    title: "Midleton Farmers Market",
    day: 6,
    summary: "Weekly Saturday farmers market in Midleton, one of Cork's best-known producer markets.",
    location: "Midleton, County Cork",
    area: "county",
    url: "https://www.tastecork.ie/food-producers/midleton-farmers-market",
    source: "Taste Cork",
  },
  {
    title: "Mahon Point Farmers Market",
    day: 4,
    summary: "Weekly Thursday farmers market at Mahon Point with local food producers and stalls.",
    location: "Mahon Point, Cork City",
    area: "city",
    url: "https://www.tastecork.ie/explore-cork/food-markets",
    source: "Taste Cork",
  },
  {
    title: "Marina Market",
    day: null,
    summary: "Indoor food market and event space in Cork City. Open regularly; check source for exact traders and events.",
    location: "Marina Market, Cork City",
    area: "city",
    url: "https://www.marinamarket.ie/",
    source: "Marina Market",
  },
];

function nextDateForDay(day, offsetWeeks = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const daysUntil = (day - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + daysUntil + offsetWeeks * 7);
  return date.toISOString().slice(0, 10);
}

function generatedMarketEvents() {
  return recurringMarkets.flatMap((market) => {
    if (market.day === null) {
      return [];
    }

    return [0, 1, 2, 3].map((week) => ({
      ...market,
      startDate: nextDateForDay(market.day, week),
      category: "markets",
      tags: tagsFor("markets", market.area, "food"),
      confidence: "Recurring weekly market",
    }));
  });
}

function isAggregatorSource(sourceName) {
  return /eventbrite|reddit|skiddle|meetup|pure cork|cork circle|corkgigs/i.test(sourceName || "");
}

function isUsefulVenueName(value) {
  const name = cleanText(value);
  const normalized = normalizeSearchText(name);
  if (name.length < 4 || name.length > 80) return false;
  const wordCount = normalized.split(" ").filter(Boolean).length;
  if (/^(cork|county cork|cork city|west cork|ireland|online|location tbc|venue tbc)$/i.test(name)) return false;
  if (/^(folk|music|concert|gig|show|tickets?)$/i.test(name)) return false;
  if (/\b(killarney|portumna|galway|dublin|limerick|waterford)\b/i.test(name)) return false;
  if (/reddit|eventbrite|skiddle|meetup|facebook|instagram|twitter|tickets|source|listing|events|festival$/i.test(name)) return false;
  if (/\b(gift vouchers?|booking|overview|council facilities|help|security|usually finish|lost my id|consultation|in general|coming|this coming|weekend|this class|complicated tech|mortal kombat|preferred option|commuter rail|all day parking|over\s+\d+s|evening|cinema club|two door cinema|millennium)\b/i.test(name)) return false;
  if (/\b(events?|gigs?|tickets?|whats on|what's on)$/i.test(name)) return false;
  if (wordCount > 7) return false;
  if (wordCount > 5 && !/\b(pub|bar|hotel|house|club|theatre|hall|centre|center|venue|brewery|distillery|market|cinema|park|field|cafe|church|library|bookshop)\b/i.test(name)) return false;
  if (seedSources.some((source) => normalizeSearchText(source.name) === normalized)) return false;
  return true;
}

function tidyVenueName(value) {
  return cleanText(value)
    .replace(/\b(events?|gigs?|tickets?|whats on|what's on)$/i, "")
    .replace(/\b(on|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|weekend)\b.*$/i, "")
    .replace(/\s+usually\s+.*$/i, "")
    .replace(/\s+announces\s+.*$/i, "")
    .replace(/\s+this\s+.*$/i, "")
    .replace(/[.,;:-]+$/g, "")
    .trim();
}

function venueNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (!/skiddle\.com$/i.test(parsed.hostname.replace(/^www\./, ""))) return "";
    const parts = parsed.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
    const irelandIndex = parts.findIndex((part) => normalizeSearchText(part) === "ireland");
    if (irelandIndex === -1 || !parts[irelandIndex + 1]) return "";
    return tidyVenueName(parts[irelandIndex + 1].replace(/-/g, " ").replace(/\s*,\s*/g, ", "));
  } catch {
    return "";
  }
}

function extractVenueNames(event) {
  const names = new Set();
  const urlVenue = venueNameFromUrl(event.url);
  if (isUsefulVenueName(urlVenue)) names.add(urlVenue);

  const location = tidyVenueName(cleanText(event.location || "").replace(/\s*\/.*$/, ""));
  if (isUsefulVenueName(location)) names.add(location);

  const text = cleanText([event.title, event.summary].join(" "));
  const patterns = [
    /\b(?:@|live at|live in)\s+([A-Z][A-Za-z0-9 '&.-]{3,70})/g,
    /\b([A-Z][A-Za-z0-9 '&.-]{3,45})\s+(?:Bar|Pub|Hotel|House|Club|Theatre|Theater|Hall|Centre|Center|Venue|Brewery|Distillery)\b/g,
  ];
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text))) {
      const candidate = tidyVenueName(match[1]);
      if (isUsefulVenueName(candidate)) names.add(candidate);
    }
  });

  return [...names];
}

function candidateQueries(name, category = "festival") {
  const categoryQueries = {
    sport: [`${name} fixtures Cork`, `${name} matches Cork`, `${name} club Cork`],
    rugby: [`${name} rugby fixtures Cork`, `${name} rugby matches Cork`],
    gaa: [`${name} GAA fixtures Cork`, `${name} hurling football Cork`],
    trad: [`${name} trad Cork`, `${name} session Cork`, `${name} fleadh ceili Cork`],
    music: [`${name} gigs Cork`, `${name} concerts Cork`],
    arts: [`${name} theatre Cork`, `${name} performance Cork`, `${name} show Cork`],
    markets: [`${name} market Cork`, `${name} farmers market Cork`],
    food: [`${name} food Cork`, `${name} tasting Cork`],
    agriculture: [`${name} agriculture Cork`, `${name} farm show Cork`],
    family: [`${name} family Cork`, `${name} kids Cork`],
  };
  return [
    ...(categoryQueries[category] || []),
    `${name} events Cork`,
    `${name} what's on`,
    `${name} gigs`,
    `${name} tickets`,
  ];
}

function topLearningSummary(learning) {
  return {
    candidateCount: learning.candidates.length,
    learnedSourceCount: learning.learnedSources.length,
    topCandidates: learning.candidates.slice(0, 8),
  };
}

function healthSummary() {
  const learning = readLearningState();
  const suggestions = readSuggestionInbox();
  return {
    ok: true,
    aiEnabled: false,
    manualSourceCount: readManualSources().length,
    approvedSourceCount: readApprovedSources().length,
    suggestionCount: suggestions.length,
    learnedSourceCount: learning.learnedSources.length,
    candidateCount: learning.candidates.length,
    updatedAt: learning.updatedAt || "",
    now: new Date().toISOString(),
  };
}

function categoryLabel(category) {
  const labels = {
    food: "Food & Drink",
    festival: "Festivals",
    music: "Music & Gigs",
    trad: "Irish Trad & Ceili",
    sport: "Sport & Matches",
    rugby: "Rugby",
    gaa: "GAA",
    arts: "Arts & Theatre",
    family: "Family",
    agriculture: "Agriculture",
    markets: "Markets",
  };
  return labels[category] || "Events";
}

function findSuggestionUrl(value) {
  const match = String(value || "").match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return "";
  try {
    return new URL(match[0]).toString();
  } catch {
    return "";
  }
}

function suggestionName(value, url) {
  const withoutUrl = cleanText(String(value || "").replace(url || "", ""));
  if (withoutUrl && withoutUrl.length >= 3) return tidyVenueName(withoutUrl);
  if (!url) return tidyVenueName(value);
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").split(".")[0].replace(/[-_]+/g, " ");
  } catch {
    return tidyVenueName(value);
  }
}

function sourceUrlVariants(url) {
  try {
    const parsed = new URL(url);
    const root = `${parsed.origin}/`;
    return [
      url,
      root,
      new URL("events/", root).toString(),
      new URL("fixtures/", root).toString(),
      new URL("resultsfixtures/", root).toString(),
      new URL("fixtures-results/", root).toString(),
      new URL("whats-on/", root).toString(),
    ].filter((item, index, list) => list.indexOf(item) === index);
  } catch {
    return [url];
  }
}

async function testSuggestedSource(source) {
  const variants = sourceUrlVariants(source.url);
  const attempts = [];

  for (const url of variants) {
    const candidate = { ...source, url };
    const result = await fetchSource(candidate);
    attempts.push({ url, ok: result.ok, error: result.error || "", count: result.events?.length || 0 });
    if (result.ok && result.events.length) return { source: candidate, result, attempts };
  }

  const firstOk = attempts.find((attempt) => attempt.ok);
  return {
    source: firstOk ? { ...source, url: firstOk.url } : source,
    result: {
      ok: Boolean(firstOk),
      error: firstOk ? "" : attempts[0]?.error || "Could not fetch source",
      events: [],
    },
    attempts,
  };
}

function sourceFromCandidate(candidate) {
  const name = cleanText(candidate.name || suggestionName(candidate.url || "", candidate.url || ""));
  const url = cleanText(candidate.url || "");
  const category = normalizePlannerCategory(candidate.category || inferCategory(name, "festival", name), "festival");
  return {
    name,
    url,
    area: ["west-cork", "city", "county"].includes(candidate.area) ? candidate.area : "county",
    category,
    searchTerm: cleanText(candidate.searchTerm || ""),
    searchTerms: dedupeStrings(candidate.searchTerms || [], 12),
    aliases: dedupeStrings(candidate.aliases || [], 12),
    negativeTerms: dedupeStrings(candidate.negativeTerms || [], 12),
    validationSignals: dedupeStrings(candidate.validationSignals || [], 12),
    rejectionSignals: dedupeStrings(candidate.rejectionSignals || [], 12),
    localityTerms: dedupeStrings(candidate.localityTerms || [], 10),
  };
}

function adminSourceSummary(source) {
  return {
    name: source.name,
    url: source.url,
    area: source.area || "county",
    category: source.category || "festival",
    searchTerm: source.searchTerm || "",
  };
}

function directSourceCandidateFromUrl(text, area = "county") {
  const url = findSuggestionUrl(text);
  if (!url) return null;
  const name = suggestionName(text, url);
  const category = inferCategory(text, "festival", name);
  const plan = fallbackSuggestionPlan(name, area);
  return {
    name,
    url,
    area,
    category,
    searchTerm: isActivitySearchPrompt(name, category) ? name : "",
    searchTerms: plan.positiveQueries ? activityTermsFor(name, plan.aliases) : [],
    aliases: plan.aliases,
    negativeTerms: plan.negativeTerms,
    validationSignals: plan.validationSignals,
    rejectionSignals: plan.rejectionSignals,
    localityTerms: plan.localityTerms,
    reason: "Direct URL supplied",
  };
}

async function investigateSuggestionText(text) {
  const activity = cleanText(text);
  const direct = directSourceCandidateFromUrl(activity);
  const plan = fallbackSuggestionPlan(activity, "county");
  const sourceTemplate = {
    name: `Admin discovery: ${plan.activity}`,
    area: "county",
    category: plan.category,
    searchTerm: plan.activity,
    searchTerms: activityTermsFor(plan.activity, plan.aliases),
    aliases: plan.aliases,
    negativeTerms: plan.negativeTerms,
    validationSignals: plan.validationSignals,
    rejectionSignals: plan.rejectionSignals,
    localityTerms: plan.localityTerms,
    sourceHints: plan.sourceHints,
    likelySourceTypes: plan.likelySourceTypes,
    sourceTypes: plan.sourceTypes,
  };
  const directTemplate = direct
    ? {
        ...sourceTemplate,
        ...sourceFromCandidate(direct),
        learnedSearch: Boolean(direct.searchTerm),
      }
    : null;

  const searchUrls = activityDiscoveryQueries({ name: plan.activity, category: plan.category, area: "county" })
    .slice(0, 5)
    .map((query) => `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  const foundUrls = [];

  for (const url of searchUrls) {
    try {
      const html = await fetchHtml(url);
      foundUrls.push(...extractDiscoveryLinks(html, url));
    } catch {
      // Search providers can throttle; keep any links already found.
    }
  }

  const seen = new Set();
  const uniqueUrls = [direct?.url, ...foundUrls]
    .filter(Boolean)
    .filter((url) => {
      const key = normalizeSearchText(url);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);

  const inspections = await Promise.all(
    uniqueUrls.map(async (url) => {
      const template = directTemplate && sourceIdentity({ url }) === sourceIdentity(directTemplate) ? directTemplate : sourceTemplate;
      const result = await inspectDiscoveredUrl(template, { url, reason: `Found while investigating ${plan.activity}` });
      if (result.source) return result;
      const fallbackSource = sourceFromCandidate({
        ...template,
        name: sourceNameFromPage(url, "", plan.activity),
        url,
      });
      return { events: [], source: fallbackSource };
    })
  );

  const candidates = inspections
    .filter((item) => item.source)
    .map((item, index) => ({
      ...sourceFromCandidate(item.source),
      id: `cand_${index}_${Buffer.from(item.source.url).toString("base64url").slice(0, 12)}`,
      eventCount: item.events?.length || 0,
      sampleEvents: (item.events || []).slice(0, 3).map((event) => ({
        title: event.title,
        date: event.startDate,
        location: event.location,
      })),
    }));

  return {
    ok: true,
    suggestion: activity,
    planner: {
      activity: plan.activity,
      category: plan.category,
      queries: activityDiscoveryQueries({ name: plan.activity, category: plan.category, area: "county" }).slice(0, 5),
    },
    candidates,
  };
}

function splitSuggestions(value) {
  return cleanText(value)
    .split(/\n|;/)
    .flatMap((line) => line.split(/\s*,\s*(?=[A-Za-z0-9À-ž])/))
    .map((item) => tidyVenueName(item))
    .filter((item) => !/^(cork|cork city|county cork|west cork)$/i.test(item))
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex((other) => normalizeSearchText(other) === normalizeSearchText(item)) === index);
}

function canonicalSuggestion(value, area) {
  const normalized = normalizeSearchText(value);
  const cityArea = area === "all" ? "city" : area;
  const mappings = [
    {
      patterns: ["sin e", "sine", "sin"],
      source: { name: "Sin É", url: "https://corkheritagepubs.com/sin-e/", area: "city", category: "trad" },
    },
    {
      patterns: ["fred zeppelins", "fred zeppelin", "frezeppelins", "fredzep", "fred zepplins", "freds"],
      source: { name: "Fred Zeppelins", url: "https://fredzeppelins.com/", area: "city", category: "music" },
    },
    {
      patterns: ["crane lane", "crane lane cork", "crane lane theatre"],
      source: { name: "Crane Lane Theatre", url: "https://corkheritagepubs.com/whats-on/", area: "city", category: "music" },
    },
  ];
  const match = mappings.find((mapping) => mapping.patterns.some((pattern) => normalized.includes(pattern)));
  if (!match) return null;
  return {
    ...match.source,
    area: match.source.area || cityArea,
  };
}

function mergeCandidate(learning, candidate) {
  const key = normalizeSearchText(candidate.name);
  const existing = learning.candidates.find((item) => normalizeSearchText(item.name) === key);
  const now = new Date().toISOString();
  const evidence = {
    title: candidate.evidenceTitle || candidate.name,
    source: "User suggestion",
    url: candidate.url || "",
    date: "",
    seenAt: now,
  };

  if (existing) {
    existing.score = Math.max(existing.score || 0, candidate.score || 6);
    existing.evidenceCount = (existing.evidenceCount || 0) + 1;
    existing.lastSeenAt = now;
    existing.status = existing.status || "candidate";
    existing.area = candidate.area || existing.area || "county";
    existing.category = candidate.category || existing.category || "festival";
    existing.aliases = dedupeStrings([...(existing.aliases || []), ...(candidate.aliases || [])], 12);
    existing.negativeTerms = dedupeStrings([...(existing.negativeTerms || []), ...(candidate.negativeTerms || [])], 12);
    existing.sourceHints = dedupeStrings([...(existing.sourceHints || []), ...(candidate.sourceHints || [])], 12);
    existing.likelySourceTypes = dedupeStrings([...(existing.likelySourceTypes || []), ...(candidate.likelySourceTypes || [])], 8);
    existing.validationSignals = dedupeStrings([...(existing.validationSignals || []), ...(candidate.validationSignals || [])], 12);
    existing.rejectionSignals = dedupeStrings([...(existing.rejectionSignals || []), ...(candidate.rejectionSignals || [])], 12);
    existing.sourceTypes = dedupeStrings([...(existing.sourceTypes || []), ...(candidate.sourceTypes || [])], 8);
    existing.localityTerms = dedupeStrings([...(existing.localityTerms || []), ...(candidate.localityTerms || [])], 10);
    existing.confidence = candidate.confidence || existing.confidence || "medium";
    existing.suggestedQueries = dedupeStrings([...(candidate.suggestedQueries || []), ...(candidate.positiveQueries || []), ...candidateQueries(existing.name, existing.category)], 16);
    existing.evidence = [evidence, ...(existing.evidence || [])].slice(0, 5);
    return existing;
  }

  const created = {
    name: candidate.name,
    area: candidate.area || "county",
    category: candidate.category || "festival",
    score: candidate.score || 6,
    evidenceCount: 1,
    evidence: [evidence],
    aliases: dedupeStrings(candidate.aliases || [], 12),
    negativeTerms: dedupeStrings(candidate.negativeTerms || [], 12),
    sourceHints: dedupeStrings(candidate.sourceHints || [], 12),
    likelySourceTypes: dedupeStrings(candidate.likelySourceTypes || [], 8),
    validationSignals: dedupeStrings(candidate.validationSignals || [], 12),
    rejectionSignals: dedupeStrings(candidate.rejectionSignals || [], 12),
    sourceTypes: dedupeStrings(candidate.sourceTypes || [], 8),
    localityTerms: dedupeStrings(candidate.localityTerms || [], 10),
    confidence: candidate.confidence || "medium",
    suggestedQueries: dedupeStrings([...(candidate.suggestedQueries || []), ...(candidate.positiveQueries || []), ...candidateQueries(candidate.name, candidate.category || "festival")], 16),
    discoveredAt: now,
    lastSeenAt: now,
    status: "candidate",
  };
  learning.candidates.unshift(created);
  return created;
}

function mergeLearnedSource(learning, source, evidence) {
  const key = sourceIdentity(source);
  const existing = learning.learnedSources.find((item) => sourceIdentity(item) === key);
  const now = new Date().toISOString();

  if (existing) {
    existing.name = source.name || existing.name;
    existing.area = source.area || existing.area || "county";
    existing.category = source.category || existing.category || "festival";
    existing.searchTerm = source.searchTerm || existing.searchTerm || "";
    existing.searchTerms = source.searchTerms || existing.searchTerms || [];
    existing.aliases = source.aliases || existing.aliases || [];
    existing.negativeTerms = source.negativeTerms || existing.negativeTerms || [];
    existing.sourceHints = source.sourceHints || existing.sourceHints || [];
    existing.likelySourceTypes = source.likelySourceTypes || existing.likelySourceTypes || [];
    existing.validationSignals = source.validationSignals || existing.validationSignals || [];
    existing.rejectionSignals = source.rejectionSignals || existing.rejectionSignals || [];
    existing.sourceTypes = source.sourceTypes || existing.sourceTypes || [];
    existing.localityTerms = source.localityTerms || existing.localityTerms || [];
    existing.lastValidatedAt = now;
    existing.status = "active";
    existing.evidence = [evidence, ...(existing.evidence || [])].slice(0, 5);
    return existing;
  }

  const created = {
    name: source.name,
    url: source.url,
    area: source.area || "county",
    category: source.category || "festival",
    searchTerm: source.searchTerm || "",
    searchTerms: source.searchTerms || [],
    aliases: source.aliases || [],
    negativeTerms: source.negativeTerms || [],
    sourceHints: source.sourceHints || [],
    likelySourceTypes: source.likelySourceTypes || [],
    validationSignals: source.validationSignals || [],
    rejectionSignals: source.rejectionSignals || [],
    sourceTypes: source.sourceTypes || [],
    localityTerms: source.localityTerms || [],
    status: "active",
    sourceType: "user-suggested",
    discoveredAt: now,
    lastValidatedAt: now,
    evidence: [evidence],
  };
  learning.learnedSources.unshift(created);
  return created;
}

function learnFromScan(results) {
  const learning = readLearningState();
  const candidateMap = new Map((learning.candidates || []).map((candidate) => [normalizeSearchText(candidate.name), candidate]));
  const now = new Date().toISOString();

  results.forEach((result) => {
    (result.discoveredSources || []).forEach((source) => {
      mergeLearnedSource(
        learning,
        {
          name: source.name,
          url: source.url,
          area: source.area || "county",
          category: source.category || "festival",
          searchTerm: source.searchTerm || "",
          searchTerms: source.searchTerms || [],
          aliases: source.aliases || [],
          negativeTerms: source.negativeTerms || [],
          sourceHints: source.sourceHints || [],
          likelySourceTypes: source.likelySourceTypes || [],
          validationSignals: source.validationSignals || [],
          rejectionSignals: source.rejectionSignals || [],
          sourceTypes: source.sourceTypes || [],
          localityTerms: source.localityTerms || [],
        },
        {
          title: source.evidenceTitle || "Discovered from learned activity search",
          source: result.source || "Activity discovery",
          url: source.url,
          date: "",
          seenAt: now,
        }
      );
    });

    (result.events || []).forEach((event) => {
      const names = extractVenueNames(event);
      names.forEach((name) => {
        const key = normalizeSearchText(name);
        if (!key) return;
        const existing = candidateMap.get(key) || {
          name,
          area: event.area || "county",
          category: event.category || "festival",
          score: 0,
          evidenceCount: 0,
          evidence: [],
          suggestedQueries: candidateQueries(name, event.category || "festival"),
          discoveredAt: now,
          status: "candidate",
        };

        const boost =
          (isAggregatorSource(result.source) ? 2 : 1) +
          (["music", "trad", "arts", "festival", "food", "sport", "rugby", "gaa"].includes(event.category) ? 1 : 0) +
          (event.area === "west-cork" ? 1 : 0) +
          (event.startDate ? 1 : 0);

        existing.score = Math.min(99, (existing.score || 0) + boost);
        existing.evidenceCount = (existing.evidenceCount || 0) + 1;
        existing.area = existing.area === "west-cork" || event.area !== "west-cork" ? existing.area : event.area;
        existing.category = existing.category || event.category || "festival";
        existing.lastSeenAt = now;
        existing.suggestedQueries = candidateQueries(existing.name, existing.category);
        existing.evidence = [
          {
            title: event.title,
            source: result.source,
            url: event.url,
            date: event.startDate || "",
            seenAt: now,
          },
          ...(existing.evidence || []),
        ].slice(0, 5);
        candidateMap.set(key, existing);
      });
    });
  });

  learning.candidates = [...candidateMap.values()]
    .filter((candidate) => isUsefulVenueName(candidate.name))
    .sort((a, b) => b.score - a.score)
    .slice(0, 80);
  return writeLearningState(learning);
}

async function handleApiEvents(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const activeSources = getActiveSources(url.searchParams.get("q") || "");
  const results = await Promise.all(activeSources.map(fetchSource));
  const learning = learnFromScan(results);
  const events = dedupe([...results.flatMap((result) => result.events), ...generatedMarketEvents()])
    .filter((event) => eventMatchesQuery(event, url.searchParams))
    .filter((event) => eventMatchesArea(event, url.searchParams))
    .filter((event) => eventMatchesDate(event, url.searchParams))
    .sort((a, b) => String(a.startDate || "9999").localeCompare(String(b.startDate || "9999")));

  sendJson(response, 200, {
    scannedAt: new Date().toISOString(),
    learning: topLearningSummary(learning),
    sources: results.map(({ source, ok, error, events: sourceEvents }) => ({
      source,
      ok,
      error,
      count: sourceEvents.length,
    })),
    events,
  });
}

function smtpCommand(socket, command, expect = /^[23]/) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || "";
      if (!/^\d{3}[ -]/.test(last)) return;
      if (/^\d{3}-/.test(last)) return;
      socket.off("data", onData);
      if (!expect.test(last)) {
        reject(new Error(last));
        return;
      }
      resolve(buffer);
    };
    socket.on("data", onData);
    if (command) socket.write(`${command}\r\n`);
  });
}

function encodeBase64(value) {
  return Buffer.from(String(value), "utf8").toString("base64");
}

function formatEmailMessage(suggestion) {
  const subject = `Cork Event Radar suggestion: ${suggestion.text.slice(0, 70)}`;
  const body = [
    "A visitor submitted a desired event/activity for Cork Event Radar.",
    "",
    `Suggestion: ${suggestion.text}`,
    `Submitted: ${suggestion.createdAt}`,
    `Page: ${suggestion.referer || "unknown"}`,
    `User agent: ${suggestion.userAgent || "unknown"}`,
    "",
    "Manual next step:",
    "1. Find a reliable source page for this activity or venue.",
    "2. Add it to manual-sources.json.",
    "3. Commit, push, and redeploy.",
  ].join("\n");
  return [
    `From: ${SMTP_FROM}`,
    `To: ${SUGGESTION_EMAIL_TO}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
}

async function sendSuggestionEmail(suggestion) {
  if (!SMTP_HOST || !SUGGESTION_EMAIL_TO || !SMTP_FROM) return { sent: false, reason: "Email is not configured." };

  let socket = SMTP_SECURE
    ? tls.connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST })
    : net.connect({ host: SMTP_HOST, port: SMTP_PORT });

  await smtpCommand(socket, null);
  await smtpCommand(socket, `EHLO ${SMTP_HOST}`);

  if (!SMTP_SECURE) {
    await smtpCommand(socket, "STARTTLS", /^220/);
    socket = tls.connect({ socket, servername: SMTP_HOST });
    await smtpCommand(socket, `EHLO ${SMTP_HOST}`);
  }

  if (SMTP_USER && SMTP_PASS) {
    await smtpCommand(socket, "AUTH LOGIN", /^334/);
    await smtpCommand(socket, encodeBase64(SMTP_USER), /^334/);
    await smtpCommand(socket, encodeBase64(SMTP_PASS), /^235/);
  }

  await smtpCommand(socket, `MAIL FROM:<${SMTP_FROM}>`);
  await smtpCommand(socket, `RCPT TO:<${SUGGESTION_EMAIL_TO}>`);
  await smtpCommand(socket, "DATA", /^354/);
  await smtpCommand(socket, `${formatEmailMessage(suggestion)}\r\n.`, /^250/);
  await smtpCommand(socket, "QUIT", /^221/).catch(() => {});
  socket.end();
  return { sent: true };
}

async function handleSuggest(request, response) {
  const body = await readRequestJson(request);
  const text = cleanText(body.suggestion || "");

  if (text.length < 3) {
    sendJson(response, 400, { ok: false, error: "Enter an activity, event type, venue, or listings page." });
    return;
  }

  const suggestion = {
    id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
    status: "new",
    createdAt: new Date().toISOString(),
    referer: request.headers.referer || "",
    userAgent: request.headers["user-agent"] || "",
  };

  const inbox = readSuggestionInbox();
  const saved = writeSuggestionInbox([suggestion, ...inbox].slice(0, 500));
  let email = { sent: false, reason: "Email is not configured." };
  try {
    email = await sendSuggestionEmail(suggestion);
  } catch (error) {
    email = { sent: false, reason: error.message };
  }

  sendJson(response, 200, {
    ok: true,
    message: email.sent
      ? "Thanks. Your suggestion has been sent for review."
      : "Thanks. Your suggestion has been saved for review.",
    suggestion,
    email,
    suggestionCount: saved.suggestions.length,
    learning: topLearningSummary(readLearningState()),
  });
}

function adminSuggestionsPayload() {
  return {
    ok: true,
    suggestions: readSuggestionInbox(),
    approvedSources: readApprovedSources().map(adminSourceSummary),
    adminProtected: Boolean(ADMIN_TOKEN),
  };
}

async function handleAdminSuggestions(request, response) {
  if (!requireAdmin(request, response)) return;
  sendJson(response, 200, adminSuggestionsPayload());
}

async function handleAdminInvestigate(request, response) {
  if (!requireAdmin(request, response)) return;
  const body = await readRequestJson(request);
  const text = cleanText(body.suggestion || body.text || "");
  if (text.length < 3) {
    sendJson(response, 400, { ok: false, error: "Enter a suggestion to investigate." });
    return;
  }
  const result = await investigateSuggestionText(text);
  sendJson(response, 200, result);
}

async function handleAdminApprove(request, response) {
  if (!requireAdmin(request, response)) return;
  const body = await readRequestJson(request);
  const incomingSources = Array.isArray(body.sources) ? body.sources : [];
  const approved = readApprovedSources();
  const seen = new Set(approved.map(sourceIdentity));
  const added = [];

  incomingSources.map(sourceFromCandidate).forEach((source) => {
    const key = sourceIdentity(source);
    if (!source.name || !source.url || !key || seen.has(key)) return;
    seen.add(key);
    added.push({
      ...source,
      approvedAt: new Date().toISOString(),
      approvedBy: "admin",
    });
  });

  const saved = writeApprovedSources([...added, ...approved].slice(0, 500));

  if (body.suggestionId) {
    const suggestions = readSuggestionInbox().map((suggestion) =>
      suggestion.id === body.suggestionId
        ? { ...suggestion, status: "approved", approvedAt: new Date().toISOString(), approvedCount: added.length }
        : suggestion
    );
    writeSuggestionInbox(suggestions);
  }

  sendJson(response, 200, {
    ok: true,
    added,
    approvedSourceCount: saved.sources.length,
    message: added.length ? `${added.length} source${added.length === 1 ? "" : "s"} approved.` : "No new sources were added.",
  });
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT, `.${pathname}`);

  if (!filePath.startsWith(ROOT)) {
    send(response, 403, "Forbidden", { "content-type": "text/plain; charset=utf-8" });
    return;
  }

  if (["suggestions-inbox.json", "approved-sources.json"].includes(path.basename(filePath))) {
    send(response, 403, "Forbidden", { "content-type": "text/plain; charset=utf-8" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(response, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
      return;
    }

    const type = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    send(response, 200, data, { "content-type": type });
  });
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith("/api/health")) {
    sendJson(response, 200, healthSummary());
    return;
  }

  if (request.url.startsWith("/api/events")) {
    handleApiEvents(request, response).catch((error) => {
      sendJson(response, 500, { error: error.message });
    });
    return;
  }

  if (request.url.startsWith("/api/suggest")) {
    if (request.method !== "POST") {
      sendJson(response, 405, { ok: false, error: "Use POST for suggestions." });
      return;
    }
    handleSuggest(request, response).catch((error) => {
      sendJson(response, 500, { ok: false, error: error.message });
    });
    return;
  }

  if (request.url.startsWith("/api/admin/suggestions")) {
    if (request.method !== "GET") {
      sendJson(response, 405, { ok: false, error: "Use GET for admin suggestions." });
      return;
    }
    handleAdminSuggestions(request, response).catch((error) => {
      sendJson(response, 500, { ok: false, error: error.message });
    });
    return;
  }

  if (request.url.startsWith("/api/admin/investigate")) {
    if (request.method !== "POST") {
      sendJson(response, 405, { ok: false, error: "Use POST for investigation." });
      return;
    }
    handleAdminInvestigate(request, response).catch((error) => {
      sendJson(response, 500, { ok: false, error: error.message });
    });
    return;
  }

  if (request.url.startsWith("/api/admin/approve")) {
    if (request.method !== "POST") {
      sendJson(response, 405, { ok: false, error: "Use POST for approval." });
      return;
    }
    handleAdminApprove(request, response).catch((error) => {
      sendJson(response, 500, { ok: false, error: error.message });
    });
    return;
  }

  serveStatic(request, response);
});

server.listen(PORT, () => {
  console.log(`Cork Event Radar running at http://localhost:${PORT}`);
});
