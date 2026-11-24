# OpenERLC

A chat-style ERLCPedia for Emergency Response: Liberty County. Unofficial fan project.

## Open it in VS Code
1. File > Open Folder and pick the `openerlc` folder.
2. Install the "Live Server" extension, then right-click `index.html` and choose "Open with Live Server".
   (You can also just double-click `index.html`.)

## Files
- `index.html`: the page.
- `styles.css`: white theme and layout.
- `knowledge.js`: all the answers. Edit this file to update the data.
- `app.js`: chat logic and search.

## How answers work
Outside claude.ai there is no Claude to write answers, so the page shows the closest matching entries from `knowledge.js`. Add keywords to an entry's `t` field to make it easier to find.

## Updating
Add or edit entries in `knowledge.js`. Knowledge last refreshed: 24 Nov 2026.

## Hosting
It is plain static files, so it works on Vercel, GitHub Pages or Netlify. Do not put Discord tokens or API keys in these files.
