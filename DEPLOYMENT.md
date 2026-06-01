# Deploying Cork Event Radar

## Recommended Option: Render

Render is the simplest path for this app because it can run the Node server and serve the dashboard from one public URL.

### 1. Put The Project On GitHub

Create a new GitHub repository and upload these files:

- `index.html`
- `styles.css`
- `app.js`
- `server.js`
- `manual-sources.json`
- `package.json`
- `USER_MANUAL.md`

### 2. Create A Render Web Service

1. Go to `https://render.com/`.
2. Create an account or sign in.
3. Choose **New** then **Web Service**.
4. Connect your GitHub account.
5. Select the `cork-event-radar` repository.
6. Use these settings:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
```

Render will provide a public URL ending in `.onrender.com`.

### 3. Optional Suggestion Email

The app does not use an LLM or OpenAI API key. Visitor suggestions are saved to `suggestions-inbox.json`. If you want those suggestions emailed to you, add SMTP settings in Render:

```text
SUGGESTION_EMAIL_TO=you@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your smtp username
SMTP_PASS=your smtp password
SMTP_FROM=you@example.com
SMTP_SECURE=false
```

For port `465`, set `SMTP_SECURE=true`. If email is not configured, suggestions are still saved for review.

### 4. Add Manual Sources

To track a new activity or event type, add a source to `manual-sources.json`, commit, push, and redeploy. Example:

```json
{
  "name": "Example Club Fixtures",
  "url": "https://example.com/fixtures",
  "area": "county",
  "category": "sport",
  "searchTerm": "volleyball",
  "searchTerms": ["volleyball", "cork volleyball"]
}
```

Supported categories include `food`, `festival`, `music`, `trad`, `sport`, `rugby`, `gaa`, `arts`, `family`, `agriculture`, and `markets`.

### 5. Test It

Open the Render URL and click **Enter** or **Scan Sources**.

The engine status should change from ready to running, then to results ready.

## Notes

- The app does not need a database.
- The host must allow outbound HTTPS requests because the event scanner fetches public event pages.
- Some event sites may block automated fetches. Those sources will show as failed in the scan, while the rest continue working.
- Visitor requests write to `suggestions-inbox.json`. For production storage across restarts/redeploys, use a persistent disk or a small database.
- The deterministic scan can still write learned source hints to `learned-sources.json`, but public suggestions no longer add sources automatically.

## Alternative: Railway

Railway can also host it from GitHub. Create a new Railway project from the repo. Railway detects `package.json`; use:

```text
Start Command: npm start
```

## Local Check Before Deploying

From the project folder:

```powershell
npm start
```

Then open:

```text
http://localhost:4173
```
