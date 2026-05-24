# Deploying Cork Event Radar

## Recommended Option: Render

Render is the simplest path for this app because it can run the Node server and serve the dashboard from one public URL.

### 1. Put The Project On GitHub

Create a new GitHub repository and upload these files:

- `index.html`
- `styles.css`
- `app.js`
- `server.js`
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

### 3. Optional LLM Planning

The dashboard works without an LLM, but the **Teach the Engine** box is much smarter when an OpenAI API key is configured. In Render, open the service settings and add:

```text
OPENAI_API_KEY=your OpenAI API key
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_MODEL` is optional. If it is not set, the app uses `gpt-4.1-mini`.

### 4. Test It

Open the Render URL and click **Enter** or **Scan Sources**.

The engine status should change from ready to running, then to results ready.

## Notes

- The app does not need a database.
- The host must allow outbound HTTPS requests because the event scanner fetches public event pages.
- Some event sites may block automated fetches. Those sources will show as failed in the scan, while the rest continue working.
- The learning engine writes to `learned-sources.json`. This works locally. For a production deployment that must remember learning forever across host restarts/redeploys, move that state into a small database or persistent disk.

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
