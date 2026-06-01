# Deploy — ecuahuecas (manual runbook)

This site is a **static (SSG) site** built with `vite-ssg` and hosted on
**Firebase Hosting** at the Firebase default domain **https://ecuahuecas.web.app**.

Deploys are **manual** (no CI/CD). Build and test locally, then deploy with the
Firebase CLI.

---

## Prerequisites

- **Firebase CLI** installed and logged in.
- The **`ecuahuecas` Firebase project belongs to the `rmatovelle84@gmail.com`
  account** — the default `srparca@gmail.com` has **no access**. So every
  Firebase command must pass:

  ```
  --account rmatovelle84@gmail.com --project ecuahuecas
  ```

- The build's Sanity snapshot reads a Sanity token from the sibling
  `../blog-component/.env` locally (already set up). No extra env is needed for a
  local build.

---

## Publish the site

Run from the repo root:

```bash
# 1. Tests must be green.
npm test

# 2. Type check must be clean.
npm run typecheck

# 3. Build: refreshes the Sanity snapshot then bakes the SSG into dist/.
#    (npm run build = node scripts/snapshot-sanity.mjs && vite-ssg build)
npm run build

# 4. Deploy Hosting.
firebase deploy --only hosting --account rmatovelle84@gmail.com --project ecuahuecas

# 5. Verify the live site.
#    https://ecuahuecas.web.app
```

### IMPORTANT — content is build-time static

The public site is **prerendered at build time** (zero-JS for anonymous
readers). After you publish a reseña or hueca in `/admin`, it will **not** appear
for anonymous visitors until you **re-run steps 3–4** (rebuild to refresh the
snapshot, then redeploy).

---

## Cloud Functions (deployed separately)

Functions are **not** part of the Hosting deploy. Deploy a function on its own:

```bash
firebase deploy --only functions:<name> --account rmatovelle84@gmail.com --project ecuahuecas
```

---

## Hosting config reference (`firebase.json`)

```jsonc
"hosting": {
  "public": "dist",
  "cleanUrls": true,      // /resenas/foo  -> serves /resenas/foo.html
  "trailingSlash": false, // canonical URLs without a trailing slash
  "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
  "rewrites": [
    { "source": "**", "destination": "/index.html" } // SPA fallback
  ]
}
```

- **`cleanUrls` + `trailingSlash: false`** make pretty URLs resolve to the flat
  `.html` files that `vite-ssg` emits (e.g. `/resenas/foo` -> `/resenas/foo.html`).
  Firebase serves a matching static file **before** applying rewrites, so every
  pre-rendered page is served as static SSG HTML — good for SEO and per-page OG.
- The **catch-all rewrite `** -> /index.html`** is a SPA fallback for routes
  with no matching static file: client-only routes (`/admin/**`, `/login`) and
  dynamic slugs published since the last build. The Vue router renders those
  client-side until the next rebuild bakes them in.

---

## Optional: GCP budget alert (recommended)

For free-tier cost containment, configure a **$5/month budget alert** in the
**GCP Console → Billing → Budgets & alerts** for project `ecuahuecas`. This is a
manual, console-only step.
