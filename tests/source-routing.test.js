const assert = require("node:assert");
const {
  dedupe,
  eventMatchesDate,
  eventMatchesQuery,
  extractDataAttributeFixtures,
  extractEventbriteListingEvents,
  extractJsonLdEvents,
  filterLearnedSearchEvents,
  inferCategory,
  isExcludedNightlifeEvent,
  learnedSearchTermMatches,
  normalizeSource,
} = require("../server");

assert.equal(
  inferCategory(
    "Niall McCabe brings self-effacing humour and stories from an Irish island, with lunch available.",
    "festival",
    "Pure Cork"
  ),
  "arts",
  "classifies a comedy and storytelling event as arts rather than sport"
);
assert.equal(
  inferCategory("Kingfishr live in concert at Virgin Media Park", "festival", "Skiddle Cork"),
  "music",
  "does not classify a concert as rugby merely because of its venue"
);
assert.notEqual(
  inferCategory("Micro-Credentials information session at Munster Technological University", "festival", "Eventbrite Cork"),
  "rugby",
  "does not classify every mention of Munster as rugby"
);

const gaaFixtureSource = normalizeSource({
  name: "Cork GAA",
  url: "https://gaacork.ie/fixtures/",
  area: "county",
  category: "gaa",
});
const dataAttributeFixtures = extractDataAttributeFixtures(
  `
    <ul class="fixture"
      data-date="06 Jun 2026"
      data-time="19:00"
      data-hometeam="Clonakilty"
      data-awayteam="Nemo Rangers"
      data-comment="Moved from 07/06"
      data-venue="Clonakilty"
      data-compname="McCarthy Insurance Group Division 1 FL">
    </ul>
    <ul class="fixture"
      data-date="TBC"
      data-hometeam="Team One"
      data-awayteam="Team Two"
      data-venue="County Cork">
    </ul>
  `,
  gaaFixtureSource
);
assert.equal(dataAttributeFixtures.length, 1, "extracts confirmed fixtures and rejects TBC dates");
assert.equal(dataAttributeFixtures[0].title, "Clonakilty v Nemo Rangers");
assert.equal(dataAttributeFixtures[0].startDate, "2026-06-06");
assert.equal(dataAttributeFixtures[0].category, "gaa");
assert(dataAttributeFixtures[0].tags.includes("sport"), "makes GAA fixtures available under Sport & Matches");

const samePageFixtures = dedupe([
  dataAttributeFixtures[0],
  {
    ...dataAttributeFixtures[0],
    title: "Castlelyons v Glengarriffe",
    location: "Enniskeane",
  },
]);
assert.equal(samePageFixtures.length, 2, "keeps distinct fixtures that share an official fixtures-page URL");

const duplicateFixture = {
  ...dataAttributeFixtures[0],
  title: "LCC U15 v Cork County Cricket Club",
  startDate: "2026-06-07",
};
assert.equal(
  dedupe([
    { ...duplicateFixture, location: "Adare Manor" },
    { ...duplicateFixture, location: "The Mardyke" },
  ]).length,
  1,
  "removes duplicate fixture records even when scraped venue text conflicts"
);
assert.equal(
  dedupe([
    {
      ...duplicateFixture,
      title: "LCC U15 MCU League Opponent Cork County Cricket Club Venue Adare Manor 7/6/26",
    },
  ]).length,
  0,
  "rejects raw fixture metadata accidentally presented as an event title"
);

function hillSource(overrides = {}) {
  return normalizeSource({
    name: "Eventbrite Cork search: hill walking",
    url: "https://www.eventbrite.ie/d/ireland--cork/events/?q=hill%20walking",
    area: "county",
    category: "sport",
    searchTerm: "hill walking",
    aliases: ["hillwalk", "hillwalking", "hiking", "guided walk"],
    localityTerms: ["cork", "county cork", "munster", "ballyhoura"],
    ...overrides,
  });
}

const source = hillSource();

const eventbriteItemList = `
  <script type="application/ld+json">
    {
      "@type": "ItemList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "item": {
            "@type": "Event",
            "name": "Cork Harbour Festival Event",
            "startDate": "2026-06-06T10:00:00+01:00",
            "url": "https://www.eventbrite.ie/e/cork-harbour-festival-event-tickets-1",
            "location": {
              "@type": "Place",
              "name": "Cork City Hall",
              "address": {
                "streetAddress": "Anglesea Street",
                "addressLocality": "Cork",
                "addressRegion": "County Cork",
                "addressCountry": "IE"
              }
            }
          }
        }
      ]
    }
  </script>
`;
const itemListEvents = extractJsonLdEvents(eventbriteItemList, normalizeSource({
  name: "Eventbrite Cork",
  url: "https://www.eventbrite.ie/d/ireland--cork/events/",
  area: "county",
  category: "festival",
}));
assert.equal(itemListEvents.length, 1, "extracts events nested inside a JSON-LD ItemList");
assert.equal(itemListEvents[0].title, "Cork Harbour Festival Event");
assert.match(itemListEvents[0].location, /Cork City Hall.*County Cork/i);

const onlineItemListEvents = extractJsonLdEvents(
  `
    <script type="application/ld+json">
      {
        "@type": "ItemList",
        "itemListElement": [{
          "@type": "ListItem",
          "item": {
            "@type": "Event",
            "name": "Remote Career Fair",
            "startDate": "2026-06-06",
            "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
            "location": "Cork"
          }
        }]
      }
    </script>
  `,
  normalizeSource({
    name: "Eventbrite Cork",
    url: "https://www.eventbrite.ie/d/ireland--cork/events/",
    area: "county",
    category: "festival",
  })
);
assert.equal(onlineItemListEvents.length, 0, "excludes online-only recommendations from local event coverage");

assert(isExcludedNightlifeEvent({ title: "CLUB 30 - An Over 30s Evening Club!" }), "excludes numbered evening clubs");
assert(isExcludedNightlifeEvent({ title: "Summer Daylight Disco" }), "excludes discos");
assert(isExcludedNightlifeEvent({ title: "Saturday Night Clubbing at Voodoo" }), "excludes clubbing listings");
assert(!isExcludedNightlifeEvent({ title: "Traditional Set Dancing Social" }), "keeps social dancing");
assert(!isExcludedNightlifeEvent({ title: "Céilí and Social Dancing" }), "keeps ceili dancing");
assert(!isExcludedNightlifeEvent({ title: "Contemporary Dance Performance" }), "keeps dance performances");

const duplicateEvents = dedupe([
  {
    title: "Cork Harbour Festival Event",
    summary: "A complete structured description.",
    startDate: "2026-06-06",
    location: "Cork City Hall, Anglesea Street, Cork",
    url: "https://www.eventbrite.ie/e/cork-harbour-festival-event-tickets-123?aff=search",
    confidence: "Structured event data",
  },
  {
    title: "Cork Harbour Festival Event Share this event: Cork Harbour Festival Event",
    summary: "Page fragment.",
    startDate: "2026-06-06",
    location: "Cork City Hall",
    url: "https://www.eventbrite.ie/e/cork-harbour-festival-event-tickets-123",
    confidence: "Eventbrite text listing",
  },
]);
assert.equal(duplicateEvents.length, 1, "removes duplicate event variants");
assert.equal(duplicateEvents[0].confidence, "Structured event data", "keeps the cleaner structured duplicate");

const eventbriteText = `
  Save this event: Castle Oliver & Ballyhoura Loop with Declan Clancy
  Sun 14 Jun, 10:00
  Ballyorgan · Ballyhoura Mountain Lodges
  From EUR27.79
  Save this event: Featured Featured David Gray - Two Day Tickets
  Sat 13 Jun, 12:00 AM
  Cork City
  From EUR54.00
`;

const extracted = extractEventbriteListingEvents(eventbriteText, source);
assert(
  extracted.some((event) => event.title === "Castle Oliver & Ballyhoura Loop with Declan Clancy" && event.startDate === "2026-06-14"),
  "extracts the real Eventbrite hill-walking listing"
);
assert(!extracted.some((event) => /David Gray/i.test(event.title)), "rejects unrelated Eventbrite concert noise");

assert(
  learnedSearchTermMatches(
    {
      title: "Castle Oliver & Ballyhoura Loop with Declan Clancy",
      summary: "Guided walking loop through the Ballyhoura mountains.",
      location: "Ballyorgan",
      url: "https://www.eventbrite.ie/e/castle-oliver-ballyhoura-loop-tickets-123",
      tags: ["sport", "hillwalking"],
    },
    source
  ),
  "accepts a relevant outdoor walking event"
);

assert(
  learnedSearchTermMatches(
    {
      title: "Castle Oliver & Ballyhoura Loop with Declan Clancy",
      summary: "Guided walking loop through the Ballyhoura mountains.",
      location: "Ballyorgan",
      url: "https://www.eventbrite.ie/e/castle-oliver-ballyhoura-loop-tickets-123",
      tags: ["sport", "hillwalking"],
    },
    hillSource({ localityTerms: [] })
  ),
  "accepts a relevant event from a Cork-scoped source even when the event card omits Cork"
);

assert(
  !learnedSearchTermMatches(
    {
      title: "Saltee Islands Puffin Boat Tour - Day Adventure from Cork",
      summary: "Wildlife boat tour from Cork.",
      location: "Cork",
      url: "https://www.meetup.com/find/?keywords=hillwalking&location=ie--Cork&source=EVENTS",
      tags: ["sport", "hillwalking"],
    },
    hillSource({
      name: "Meetup Cork search: hillwalking",
      url: "https://www.meetup.com/find/?keywords=hillwalking&location=ie--Cork&source=EVENTS",
      searchTerm: "hillwalking",
    })
  ),
  "does not allow learned tags or a search URL to make an unrelated event pass"
);

assert(
  !learnedSearchTermMatches(
    {
      title: "City Walk 11 From Model Farm to Cork City Centre",
      summary: "A relaxed city walk with cool people and coffee.",
      location: "Cork City Council, City Hall",
      url: "https://www.meetup.com/find/?keywords=hillwalking&location=ie--Cork&source=EVENTS",
      tags: ["sport", "hillwalking"],
    },
    hillSource({
      name: "Meetup Cork search: hillwalking",
      url: "https://www.meetup.com/find/?keywords=hillwalking&location=ie--Cork&source=EVENTS",
      searchTerm: "hillwalking",
    })
  ),
  "does not treat a generic city walk as hill walking"
);

assert(
  !learnedSearchTermMatches(
    {
      title: "David Gray - Two Day Tickets",
      summary: "Live music at the Marquee.",
      location: "Cork City",
      url: "https://www.eventbrite.ie/e/david-gray-tickets-123",
      tags: ["sport", "hillwalking"],
    },
    source
  ),
  "rejects concerts from a term-scoped source"
);

const filtered = filterLearnedSearchEvents(
  [
    {
      title: "Castle Oliver & Ballyhoura Loop with Declan Clancy",
      summary: "Guided walking loop through the Ballyhoura mountains.",
      startDate: "2026-06-14",
      location: "Ballyorgan",
      category: "sport",
      tags: ["sport"],
    },
    {
      title: "Saltee Islands Puffin Boat Tour - Day Adventure from Cork",
      summary: "Wildlife boat tour from Cork.",
      startDate: "2026-06-13",
      location: "Cork",
      category: "sport",
      tags: ["sport", "hillwalking"],
    },
  ],
  source
);
assert.equal(filtered.length, 1, "filter keeps only relevant hill-walking events");
assert.equal(filtered[0].title, "Castle Oliver & Ballyhoura Loop with Declan Clancy");

const displayParams = new URLSearchParams({
  q: "hillwalking",
  from: "2026-06-13",
  to: "2026-06-15",
});
const displayEvents = filtered.filter((event) => eventMatchesQuery(event, displayParams)).filter((event) => eventMatchesDate(event, displayParams));
assert.equal(displayEvents.length, 1, "dashboard query/date filters keep the relevant learned activity event visible");

const volleyballSource = normalizeSource({
  name: "Volleyball Cork",
  url: "https://example.com/volleyball",
  area: "county",
  category: "sport",
  searchTerm: "volleyball",
});
assert(
  learnedSearchTermMatches(
    {
      title: "Cork Volleyball Club League Fixture",
      summary: "League match and club fixture.",
      location: "Cork",
      url: "https://example.com/event",
      tags: ["sport"],
    },
    volleyballSource
  ),
  "accepts a separate sport family without hill-walking tuning"
);

const cricketSource = normalizeSource({
  name: "Learned Eventbrite search: cricket",
  url: "https://www.eventbrite.ie/d/ireland--cork/events/?q=cricket",
  area: "county",
  category: "sport",
  searchTerm: "cricket",
});
assert(
  learnedSearchTermMatches(
    {
      title: "Cork Harlequins v Cork County",
      summary: "Cricket fixture at Farmers Cross.",
      location: "Cork",
      url: "https://example.com/cork-cricket-fixture",
      tags: ["sport"],
    },
    cricketSource
  ),
  "accepts a relevant generic learned sport term"
);
assert(
  !learnedSearchTermMatches(
    {
      title: "Data Engineering Bootcamp",
      summary: "Online training session.",
      location: "Cork",
      url: "https://www.eventbrite.ie/d/ireland--cork/events/?q=cricket",
      tags: ["sport", "cricket"],
    },
    cricketSource
  ),
  "does not allow a generic learned sport term to pass from tags or search URL alone"
);

console.log("source routing tests passed");
