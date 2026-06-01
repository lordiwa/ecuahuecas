# Deploy & CI — ecuahuecas

This site is a **static (SSG) site** built with `vite-ssg` and hosted on
**Firebase Hosting** at the Firebase default domain **https://ecuahuecas.web.app**.

`npm run build` runs two steps:

1. `node scripts/snapshot-sanity.mjs` — reads the published `hueca` / `critico` /
   `resena` documents from Sanity **with a read token** (anonymous reads of the
   migrated docs return 0) and writes `src/content-snapshot.json`.
2. `vite-ssg build` — bakes per-route static HTML + per-page OG tags into `dist/`
   as flat files (e.g. `dist/resenas/<slug>.html`, `dist/huecas/<slug>.html`,
   `dist/buscar.html`, `dist/index.html`).

Anonymous readers therefore get fully prerendered, zero-JS pages.

---

## Hosting config (`firebase.json`)

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

Rationale (JSON can't hold comments, so it lives here):

- **`cleanUrls: true` + `trailingSlash: false`** make pretty URLs resolve to the
  flat `.html` files that `vite-ssg` emits. Firebase serves a matching static
  file **before** applying rewrites, so every pre-rendered page is served as
  static SSG HTML — good for SEO and per-page OG.
- The **catch-all rewrite `** -> /index.html`** is a SPA fallback. It only kicks
  in when no static file matches, i.e. for:
  - **client-only routes** that are not meaningfully pre-rendered: `/admin/**`,
    `/login`;
  - **dynamic param routes whose NEW slugs** don't yet exist as static files
    (a reseña/hueca published since the last build). The Vue router takes over
    and renders them client-side until the next rebuild bakes them in.
- The `functions` block is unchanged. **Functions are NOT deployed by the CI
  workflows** below — deploy them separately with `firebase deploy --only functions`.

---

## GitHub Actions workflows

Two workflows in `.github/workflows/`, both Node 22 + `npm ci`, both deploy to
Firebase Hosting channel `live` via `FirebaseExtended/action-hosting-deploy@v0`
targeting projectId `ecuahuecas`:

| Workflow      | Trigger                                  | Purpose                                                                 |
| ------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| `deploy.yml`  | push to `main`, `workflow_dispatch`      | Build + deploy on every change to `main`.                               |
| `rebuild.yml` | `schedule` `0 11 * * *`, `workflow_dispatch` | Daily rebuild so newly published Sanity content appears for anon readers. |

**Cron chosen:** `0 11 * * *` = **11:00 UTC daily** = **06:00 America/Guayaquil**
(ECT, UTC-5). Adjust if a different local time is desired.

The two workflows share the same build+deploy steps (factored by copy).

---

## Required GitHub repo configuration

Set these under **Settings → Secrets and variables → Actions**.

### Secrets (encrypted)

| Secret                              | What it is                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `SANITY_READ_TOKEN`                 | A Sanity **Viewer / Read** token for project `gvc4yjqj`, dataset `production`. Used by the snapshot to read the migrated docs. |
| `FIREBASE_SERVICE_ACCOUNT_ECUAHUECAS` | The **full JSON** of a GCP service account with the **Firebase Hosting Admin** role (see below). |

`GITHUB_TOKEN` is provided automatically by Actions — do **not** create it.

#### Creating `SANITY_READ_TOKEN`

1. https://www.sanity.io/manage → project `gvc4yjqj` → **API → Tokens**.
2. **Add API token** → name `ecuahuecas-ci-read` → permission **Viewer** → Save.
3. Copy the token value and paste it as the `SANITY_READ_TOKEN` secret.

#### Creating `FIREBASE_SERVICE_ACCOUNT_ECUAHUECAS`

Console route:

1. Google Cloud Console → project **ecuahuecas** → **IAM & Admin → Service Accounts**.
2. **Create service account** (e.g. `gh-actions-hosting`).
3. Grant role **Firebase Hosting Admin** (`roles/firebasehosting.admin`).
4. Open the account → **Keys → Add key → Create new key → JSON** → download.
5. Paste the **entire JSON file contents** as the `FIREBASE_SERVICE_ACCOUNT_ECUAHUECAS` secret.

gcloud route (equivalent):

```bash
PROJECT=ecuahuecas
SA=gh-actions-hosting

gcloud iam service-accounts create "$SA" \
  --project="$PROJECT" --display-name="GitHub Actions Hosting deploy"

gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${SA}@${PROJECT}.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"

gcloud iam service-accounts keys create key.json \
  --iam-account="${SA}@${PROJECT}.iam.gserviceaccount.com"
# Paste the contents of key.json into the secret, then delete the local file.
```

> Tip: `firebase init hosting:github` can generate and store this service account
> secret for you automatically.

### Variables (public / bundle-safe)

These VITE_* values ship inside the client bundle anyway, so they live as
**Variables**, not Secrets.

| Variable                            | Value / source                                  |
| ----------------------------------- | ----------------------------------------------- |
| `VITE_SANITY_PROJECT_ID`            | `gvc4yjqj`                                       |
| `VITE_SANITY_DATASET`               | `production`                                     |
| `VITE_FIREBASE_API_KEY`             | from the Firebase web app config                 |
| `VITE_FIREBASE_AUTH_DOMAIN`         | from the Firebase web app config                 |
| `VITE_FIREBASE_PROJECT_ID`          | `ecuahuecas`                                     |
| `VITE_FIREBASE_STORAGE_BUCKET`      | from the Firebase web app config                 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | from the Firebase web app config                 |
| `VITE_FIREBASE_APP_ID`              | from the Firebase web app config                 |

`VITE_SITE_URL` is **hardcoded to `https://ecuahuecas.web.app`** in both
workflows (matches the default in `src/lib/og.ts`), so it does **not** need to be
configured as a Variable.

> Get the `VITE_FIREBASE_*` values from Firebase Console → Project settings →
> Your apps → SDK setup and configuration → Config. They are the same values
> currently in your local `.env.local`.

---

## Manual first deploy (before CI)

The first production deploy is done manually by the orchestrator:

```bash
# Build with the public VITE_* in .env.local and a Sanity read token in env:
SANITY_READ_TOKEN=<read-token> npm run build
npx firebase deploy --only hosting --project ecuahuecas
```

After verifying https://ecuahuecas.web.app, push the CI workflows so subsequent
deploys are automatic.

---

## Budget alert (manual, GCP console)

A **$5/month budget alert** (free-tier cost containment) is configured in the
**GCP Console → Billing → Budgets & alerts** for project `ecuahuecas`. This is a
console-only step; the orchestrator guides it. It is **not** created by these
workflows.
