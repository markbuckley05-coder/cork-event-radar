const assert = require("node:assert");
const {
  eventMatchesDate,
  eventMatchesQuery,
  extractEventbriteListingEvents,
  filterLearnedSearchEvents,
  learnedSearchTermMatches,
  normalizeSource,
} = require("../server");

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
