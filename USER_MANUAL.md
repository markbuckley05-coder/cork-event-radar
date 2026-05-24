# Cork Event Radar User Manual

## What This Is

Cork Event Radar is a local dashboard for finding things happening around Cork, with emphasis on West Cork, Cork City, and wider County Cork.

It tracks broad event classifications such as:

- Food and drink
- Festivals
- Music and gigs
- Irish trad, fleadhs, ceilis, and sessions
- Rugby
- GAA
- Arts and theatre
- Family events
- Agriculture
- Markets

## Best Way To Run It

Run the local server if you want the **Scan Sources** button to fetch live pages:

```powershell
& "C:\Users\Mark\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "C:\Users\Mark\Documents\New project\server.js"
```

Then open:

```text
http://localhost:4173
```

You can also open `C:\Users\Mark\Documents\New project\index.html` directly in a browser, but live scanning will not work from a plain file because browsers block local pages from calling the `/api/events` endpoint.

## How The Dashboard Works

Use the left-hand area filter for:

- All Cork
- West Cork
- Cork City
- Cork County

Use the classification buttons to include or exclude event types.

Use the top filters to search by keyword and date range. For example:

- `Clonakilty`
- `rugby`
- `food`
- `jazz`
- `fleadh`
- `céilí`
- `trad session`
- `agriculture`
- `festival`

Click **Enter** to run the event engine using the current search, area, classification, and date filters. The dot beside the engine status shows:

- Green: ready
- Gold and pulsing: running
- Blue: results are ready
- Red: the local server is not available

## Learning Engine

Every scan now feeds a local learning file called `learned-sources.json`.

The engine looks at events from broad sources such as Eventbrite, Reddit, Skiddle, Meetup, and Pure Cork. When it sees a venue, bar, hall, festival, or recurring local place mentioned in an event, it adds that name as a candidate source. Strong candidates are then used as extra search requisites on future scans, for example:

- `Venue Name events Cork`
- `Venue Name what's on`
- `Venue Name gigs`
- `Venue Name tickets`

This is not full AI training yet. It is a transparent feedback loop: discover, score, remember, and search again. That is safer for this project because you can see what the engine has learned and correct it later.

You can also teach the engine manually from the dashboard. Use the **Teach the engine** prompt box to suggest:

- A venue, such as `Connolly's of Leap`
- A recurring event, such as `Ballydehob Jazz Festival`
- A direct listings page, such as `https://example.com/events`

Direct URLs are fetched and tested. If the page exposes clear event listings, it becomes a learned source. If it loads but is not clearly parseable yet, it is saved as a candidate. Plain venue or event names are added as search requisites for future scans.

You can paste several suggestions at once, separated by commas or new lines. The engine knows common Cork bar aliases such as `Sin E`, `Fred Zeppelins`, and `Crane Lane`, including common misspellings like `frezeppelins`.

## Live Scanning

Click **Scan Sources** to ask the local server to fetch known Cork event sources.

The scanner checks sources such as:

- Pure Cork
- Taste Cork farmers markets
- Explore West Cork food markets
- Skibbereen Farmers Market
- Midleton Farmers Market
- Marina Market
- De Barra's Folk Club
- Levis Corner House
- Cork Fleadh
- Munster Comhaltas
- Comhaltas Cork
- Eventbrite Cork
- Reddit r/cork
- CorkGigs
- Skiddle Cork
- Meetup Cork
- West Cork Music
- Cork Opera House
- The Everyman
- Cyprus Avenue
- Cork GAA fixtures
- Munster Rugby fixtures
- Cork on a Fork
- Cork Midsummer
- Cork Circle

The scraper first looks for structured `schema.org/Event` data. If a page does not expose clean structured event data, it uses conservative page-listing heuristics and marks those results as listing candidates.

Irish traditional music is treated as its own classification. Terms such as `fleadh`, `ceili`, `céilí`, `trad`, `session`, `Comhaltas`, `set dancing`, and `seisiún` are grouped under **Irish Trad & Ceili** while still being searchable as music or festivals.

Always open the source before booking or travelling, because event times, venues, and ticket availability can change.

## Files

- `index.html`: dashboard layout
- `styles.css`: visual design
- `app.js`: filtering, rendering, and scan-button logic
- `server.js`: local web server and source scraper
- `learned-sources.json`: generated learning memory for venue/source candidates
- `package.json`: deployment/start metadata for Node hosts
- `DEPLOYMENT.md`: online deployment checklist
- `USER_MANUAL.md`: this guide

## Notes On Internet Sources

Some event websites change layout, block automated fetches, or publish listings without machine-readable dates. When that happens, Cork Event Radar still gives you source shortcuts, but it will mark weaker results as listing candidates rather than pretending they are confirmed events.

Recurring farmers markets are handled specially because many are standing weekly listings rather than dated event cards. The engine generates upcoming occurrences for known weekly markets such as Skibbereen, Clonakilty, Bantry, Midleton, Mahon Point, and Marina Market, then applies your date filters to those generated dates.
