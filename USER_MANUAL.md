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

## Source Coverage

Every scan now feeds a local learning file called `learned-sources.json`.

The engine looks at events from broad sources such as Eventbrite, Reddit, Skiddle, Meetup, and Pure Cork. When it sees a venue, bar, hall, festival, or recurring local place mentioned in an event, it adds that name as a source candidate. Strong candidates are then used as extra search requisites on future scans, for example:

- `Venue Name events Cork`
- `Venue Name what's on`
- `Venue Name gigs`
- `Venue Name tickets`

This is not AI training. It is a transparent deterministic feedback loop: discover, score, remember, and search again.

Visitors can request coverage from the dashboard. Use the **Enter desired event / activity** box to suggest:

- A venue, such as `Connolly's of Leap`
- A recurring event, such as `Ballydehob Jazz Festival`
- A direct listings page, such as `https://example.com/events`

Suggestions are saved to `suggestions-inbox.json`, and can also be emailed to the site owner when SMTP settings are configured. Public suggestions do not automatically change the scraper.

## Admin approval

Open `/admin.html` to review suggestions and investigate new source candidates. The page lets you:

- view visitor suggestions
- investigate a term such as `volleyball`, `hill walking`, or `art house cinema`
- tick useful Cork-relevant source links
- approve them into `approved-sources.json`

Approved sources are used by future scans without changing GitHub or redeploying Render. On Render, use `ADMIN_TOKEN` to protect the admin page and `DATA_DIR` with a persistent disk if you want runtime approvals to survive redeploys.

For stronger admin investigations, configure `BRAVE_SEARCH_API_KEY` in Render. The admin builder uses it to search Cork-focused queries, score regional relevance, and inspect likely source pages before showing candidates. Without it, the admin builder uses a public search fallback that may be less reliable.

To add new coverage manually, edit `manual-sources.json`, add a reliable source page with a category, area, and optional search terms, then commit, push, and redeploy.

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
- `manual-sources.json`: manually managed source list for activities, venues, fixtures, and listing pages
- `learned-sources.json`: generated learning memory for venue/source candidates
- `suggestions-inbox.json`: runtime visitor requests, ignored by Git
- `approved-sources.json`: runtime admin-approved sources, ignored by Git
- `package.json`: deployment/start metadata for Node hosts
- `DEPLOYMENT.md`: online deployment checklist
- `USER_MANUAL.md`: this guide

## Notes On Internet Sources

Some event websites change layout, block automated fetches, or publish listings without machine-readable dates. When that happens, Cork Event Radar still gives you source shortcuts, but it will mark weaker results as listing candidates rather than pretending they are confirmed events.

Recurring farmers markets are handled specially because many are standing weekly listings rather than dated event cards. The engine generates upcoming occurrences for known weekly markets such as Skibbereen, Clonakilty, Bantry, Midleton, Mahon Point, and Marina Market, then applies your date filters to those generated dates.
