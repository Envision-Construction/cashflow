# AGENTS.md

Repo orientation for coding agents (Codex, Claude Code, and similar). There is no CLAUDE.md; this file is the agent context for this repo. Org: Envision Construction, portfolio tier 2, role: frontend.

## What this is

"Envision Financial Suite 2.0": a cash flow forecast dashboard (package.json: "Cash Flow Forecast Application") rendering KPI cards, financial statement tables, and pipeline tracking with Chart.js, backed by Firestore.

## Stack and layout (unusual, read first)

- The entire app is ONE vanilla-JS single-file SPA: `.vscode/index.html` (roughly 100 KB, markup + CSS + JS together). `.vscode/` is the web root, not just editor config: `firebase.json` sets `hosting.public: ".vscode"` and `server.js` serves the same dir. Do not relocate it casually; hosting config, server.js, and .gitignore all reference that path.
- No framework, no bundler, no build step. Tailwind, Chart.js (+ annotation plugin), Lucide icons, and Firebase JS SDK v9.22.0 load from CDNs in the `<head>`, so rendering requires network access.
- `server.js`: 16-line Express static server (env `PORT` or 8080) with a catch-all fallback to index.html. Local dev only; production is Firebase Hosting.
- Reads: Firestore collection `CashFlow`, Firebase project `cash-flow-app-46893` (`.firebaserc`), via the client SDK.
- Writes: the client POSTs to a Google Apps Script endpoint (URL const near the top of index.html), not directly to Firestore.

## Repo map

- `.vscode/index.html`: the whole application (edit here)
- `.vscode/settings.json`: actual editor settings, also deployed dir, see above
- `server.js`: local static server; `package.json`: scripts + deps
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`: Firebase config
- `.planning/`: codebase mapping docs (see bottom)

## Commands

- Install: `npm install`
- Run locally: `npm start` (runs `node server.js`, open http://localhost:8080)
- Tests: none. `npm test` is the npm stub and exits 1. No lint or typecheck exists either.
- Build: none; static files are served as-is.

## Deploy

Firebase Hosting, project `cash-flow-app-46893` (`firebase.json`, `.firebaserc`). No deploy script exists in package.json; `firebase-tools` ^13 is a devDependency, so deploys go through the Firebase CLI against `firebase.json` (public dir `.vscode`; `**/*.json` is excluded from upload). Firestore and Storage rules deploy from `firestore.rules` / `storage.rules`.

## Constraints and gotchas

- `firestore.rules`: world-readable, ALL client writes denied. Write paths go through the Apps Script endpoint or Admin SDK. Never "fix" a failing client write by loosening these rules.
- The Firebase web config (apiKey etc.) is hardcoded in index.html, as Firebase web apps do; add no further secrets there. `.gitignore` excludes `.env`, `*.key`, `*.secret`, and a service-account JSON under `.vscode/`. Never commit credentials.
- Known issues are already mapped: `.planning/codebase/CONCERNS.md` flags innerHTML/XSS patterns, the exposed Apps Script URL, and missing input validation. Read it before touching rendering or write paths.
- Editing index.html is surgical string work in a very large file; grep for the relevant `window.*` handler or element id before assuming structure.

## Planning docs

`.planning/codebase/` holds mapped docs (ARCHITECTURE.md, STACK.md, STRUCTURE.md, CONVENTIONS.md, INTEGRATIONS.md, TESTING.md, CONCERNS.md, dated 2026-03-30). No STATE.md or ROADMAP.md exists yet; treat CONCERNS.md and ARCHITECTURE.md as the entry points.
