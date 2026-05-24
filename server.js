const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const LEARNING_FILE = path.join(ROOT, "learned-sources.json");

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

function getActiveSources() {
  const learning = readLearningState();
  const learnedSources = learning.learnedSources
    .filter((source) => source.status !== "paused" && source.url)
    .map((source) => ({
      name: source.name,
      url: source.url,
      area: source.area || "county",
      category: source.category || "festival",
      learned: true,
    }));
  const searchableCandidates = learning.candidates
    .filter((candidate) => candidate.status !== "ignored" && candidate.score >= 4 && isUsefulVenueName(candidate.name))
    .sort((a, b) => b.score - a.score);
  const priorityCandidates = searchableCandidates.filter(
    (candidate) => isActivitySearchPrompt(candidate.name, candidate.category) || candidate.evidence?.some((item) => item.source === "User suggestion")
  );
  const candidateSearches = [...priorityCandidates, ...searchableCandidates]
    .filter((candidate, index, list) => list.findIndex((item) => normalizeSearchText(item.name) === normalizeSearchText(candidate.name)) === index)
    .slice(0, 16)
    .flatMap((candidate) => {
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
        },
        {
          name: `Learned Eventbrite search: ${candidate.name}`,
          url: `https://www.eventbrite.ie/d/ireland--cork/events/?q=${query}`,
          area: candidate.area || "county",
          category,
          learned: true,
          learnedSearch: true,
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
          },
          {
            name: `Learned Meetup search: ${candidate.name}`,
            url: `https://www.meetup.com/find/?keywords=${query}&location=ie--Cork&source=EVENTS`,
            area: candidate.area || "county",
            category,
            learned: true,
            learnedSearch: true,
          }
        );
      }
      return searches;
    });
  const seen = new Set();
  return [...seedSources, ...learnedSources, ...candidateSearches].filter((source) => {
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

function readRequestJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 16_384) {
        reject(new Error("Suggestion is too long."));
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
  return category !== "festival" && activityTerms.some((term) => containsTerm(text, normalizeSearchText(term)));
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
  if (fallback === "trad" || tradTerms.some((term) => containsTerm(haystack, term))) return "trad";
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
        "badminton",
        "sailing",
        "triathlon",
        "marathon",
        "parkrun",
      ],
    ],
    ["music", ["music", "gig", "concert", "jazz", "band", "dj", "chamber", "folk club"]],
    ["agriculture", ["agriculture", "agri", "farm", "cattle", "ploughing"]],
    ["family", ["family", "children", "kids"]],
    ["arts", ["theatre", "theater", "opera", "comedy", "arts", "film", "exhibition", "kabuki", "drama", "dance performance"]],
    ["festival", ["festival", "fest"]],
  ];
  const match = tests.find(([, words]) => words.some((word) => containsTerm(haystack, word)));
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

async function fetchRedditSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "CorkEventRadar/1.0 (+local personal dashboard)",
        accept: "application/json",
      },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = await response.json();
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
        const posted = post.created_utc ? new Date(post.created_utc * 1000).toISOString().slice(0, 10) : "";
        return {
          title: cleanText(post.title),
          summary: cleanText(post.selftext || "Reddit discussion that may mention a local event. Open the source to verify details.").slice(0, 240),
          startDate: posted,
          location: area === "city" ? "Cork City / Reddit r/cork" : "County Cork / Reddit r/cork",
          area,
          category,
          tags: tagsFor(category, area, source.category),
          source: source.name,
          url: absolutize(post.permalink || source.url, "https://www.reddit.com"),
          confidence: "Community post",
        };
      });
    return { source: source.name, ok: true, events };
  } catch (error) {
    return { source: source.name, ok: false, error: error.message, events: [] };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSource(source) {
  if (source.kind === "reddit") return fetchRedditSource(source);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "CorkEventRadar/1.0 (+local personal dashboard)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const html = await response.text();
    const structured = extractJsonLdEvents(html, source);
    const knownText = extractKnownTextEvents(html, source);
    const heuristic = structured.length ? [] : extractHeuristicEvents(html, source);
    return { source: source.name, ok: true, events: [...knownText, ...structured, ...heuristic] };
  } catch (error) {
    return { source: source.name, ok: false, error: error.message, events: [] };
  } finally {
    clearTimeout(timeout);
  }
}

function eventMatchesQuery(event, params) {
  const q = normalizeSearchText(params.get("q") || "");
  if (!q) return true;
  const haystack = normalizeSearchText([event.title, event.summary, event.location, event.source, event.category, ...(event.tags || [])].join(" "));
  return haystack.includes(q) || haystack.replace(/\s+/g, "").includes(q.replace(/\s+/g, ""));
}

function eventMatchesArea(event, params) {
  const area = params.get("area") || "all";
  return area === "all" || event.area === area || event.tags?.includes(area);
}

function eventMatchesDate(event, params) {
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  if ((from || to) && !event.startDate) return false;
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
      return [
        {
          ...market,
          startDate: new Date().toISOString().slice(0, 10),
          category: "markets",
          tags: tagsFor("markets", market.area, "food"),
          confidence: "Recurring market source",
        },
      ];
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
    existing.suggestedQueries = candidateQueries(existing.name, existing.category);
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
    suggestedQueries: candidateQueries(candidate.name, candidate.category || "festival"),
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
  const activeSources = getActiveSources();
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

async function handleSuggest(request, response) {
  const body = await readRequestJson(request);
  const suggestion = cleanText(body.suggestion || "");
  const area = ["west-cork", "city", "county", "all"].includes(body.area) ? body.area : "county";
  const normalizedArea = area === "all" ? "county" : area;

  if (suggestion.length < 3) {
    sendJson(response, 400, { ok: false, error: "Suggestion is too short." });
    return;
  }

  const learning = readLearningState();
  const parts = splitSuggestions(suggestion);
  const accepted = [];
  const rejected = [];

  for (const part of parts) {
    const canonical = canonicalSuggestion(part, area);
    if (canonical) {
      mergeLearnedSource(
        learning,
        canonical,
        {
          title: `User suggested ${part}`,
          source: "User suggestion",
          url: canonical.url,
          date: "",
          seenAt: new Date().toISOString(),
        }
      );
      const candidate = mergeCandidate(learning, {
        name: canonical.name,
        area: canonical.area,
        category: canonical.category,
        score: 10,
        url: canonical.url,
        evidenceTitle: `User suggested ${part}`,
      });
      accepted.push({ name: candidate.name, category: candidate.category, status: "learned-source" });
      continue;
    }

    const url = findSuggestionUrl(part);
    const name = suggestionName(part, url);
    const category = inferCategory(part, "festival", "User suggestion");

    if (url) {
      const source = {
        name: name || new URL(url).hostname,
        url,
        area: normalizedArea,
        category,
        learned: true,
      };
      const test = await fetchSource(source);
      if (!test.ok) {
        rejected.push({ suggestion: part, error: `Could not fetch source: ${test.error || "unknown error"}` });
        continue;
      }

      if (!test.events.length) {
        const candidate = mergeCandidate(learning, {
          name,
          area: normalizedArea,
          category,
          score: 4,
          url,
          evidenceTitle: "User suggested a fetchable URL without clear event markup",
        });
        accepted.push({ name: candidate.name, category: candidate.category, status: "candidate" });
        continue;
      }

      mergeLearnedSource(
        learning,
        source,
        {
          title: test.events[0].title || "Validated event listing",
          source: "User suggestion",
          url,
          date: test.events[0].startDate || "",
          seenAt: new Date().toISOString(),
        }
      );
      const candidate = mergeCandidate(learning, {
        name,
        area: normalizedArea,
        category,
        score: 8 + Math.min(6, test.events.length),
        url,
        evidenceTitle: `${test.events.length} event record(s) found during validation`,
      });
      accepted.push({ name: candidate.name, category: candidate.category, status: "learned-source" });
      continue;
    }

    if (!isUsefulVenueName(name)) {
      rejected.push({
        suggestion: part,
        error: "Not specific enough. Try a venue, bar, festival, or direct listings URL.",
      });
      continue;
    }

    const candidate = mergeCandidate(learning, {
      name,
      area: normalizedArea,
      category,
      score: 7,
      evidenceTitle: "User suggested venue/event search requisite",
    });
    accepted.push({ name: candidate.name, category: candidate.category, status: "candidate" });
  }

  if (!accepted.length) {
    sendJson(response, 422, {
      ok: false,
      error: rejected[0]?.error || "No suggestions passed validation.",
      rejected,
      learning: topLearningSummary(learning),
    });
    return;
  }

  const saved = writeLearningState(learning);
  const rejectedMessage = rejected.length ? ` ${rejected.length} item(s) need more detail.` : "";
  sendJson(response, 200, {
    ok: true,
    status: accepted.some((item) => item.status === "learned-source") ? "learned-source" : "candidate",
    message: `Accepted ${accepted.map((item) => `"${item.name}" as ${categoryLabel(item.category)}`).join(", ")}.${rejectedMessage}`,
    accepted,
    rejected,
    learning: topLearningSummary(saved),
  });
  return;
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT, `.${pathname}`);

  if (!filePath.startsWith(ROOT)) {
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

  serveStatic(request, response);
});

server.listen(PORT, () => {
  console.log(`Cork Event Radar running at http://localhost:${PORT}`);
});
