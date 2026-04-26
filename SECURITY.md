# Security notes

## Public-by-design

The Firebase Web SDK keys in `.vscode/index.html` (`apiKey`, `authDomain`, `storageBucket`) identify the GCP project. They are not secrets and are designed to be exposed in client bundles. Security comes from:

- Firestore + Storage rules (committed in this repo)
- GCP API-key referrer restrictions (configured in GCP Console)

## Outstanding manual actions

These cannot be solved by code changes in this repo:

- [ ] **Verify GCP API-key referrer restrictions** are set on the Firebase Web API key. Console → APIs & Services → Credentials → "Browser key (auto created by Firebase)" → Application restrictions → HTTP referrers → restrict to the production hosting domain.
- [ ] **Rotate the Google Apps Script deployment ID** — the current URL has been in git history since the repo was created. New deployment ID, update `.vscode/index.html` constant, redeploy.
- [ ] **Confirm the GAS web app validates Firebase ID tokens** before processing requests — prevents anyone with the URL from invoking it.

Surfaced by /tmp/repo-audit-2026-04-26/cashflow.md.
