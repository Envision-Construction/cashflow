# cashflow

Single-page Firebase Hosting financial-forecast app. Reads Procore project data and renders cashflow projections.

## Stack

- **Hosting**: Firebase Hosting (`.vscode/` is the public dir per `firebase.json`)
- **Static site**: vanilla HTML + JS in `.vscode/index.html`
- **Database**: Firestore (rules in `firestore.rules`, indexes in `firestore.indexes.json`)
- **Storage**: Firebase Storage (rules in `storage.rules`)
- **Backend**: Google Apps Script web app (URL hardcoded in `index.html`)

## Local

Firebase emulator suite or `firebase serve` from repo root. `server.js` is a thin Express wrapper for local development.

## Deploy

`firebase deploy --only hosting` (manual). No CI configured.

## Security model

Firebase Web SDK keys (`apiKey`, `authDomain`, `storageBucket`) are **public-by-design** — they identify the project, not authorize access. Security comes from:

- **Firestore rules** (`firestore.rules`) — auth required
- **Storage rules** (`storage.rules`) — auth required
- **GCP API-key restrictions** (must be set in GCP Console → APIs & Services → Credentials → restrict by HTTP referrer to the production hosting domain)

The Google Apps Script web app URL **does ship in the static bundle** — anyone with the deployed site can read it. Mitigation:

- The GAS endpoint should validate Firebase ID tokens before processing requests (verify in the GAS source)
- Rotate the GAS deployment ID periodically

See `SECURITY.md` for outstanding manual actions.
