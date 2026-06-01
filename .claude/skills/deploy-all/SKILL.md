---
name: deploy-all
description: Full deploy of EcuaHuecas — both the Cloud Functions and the static website to Firebase Hosting (project ecuahuecas). Use when asked to deploy everything, do a full/complete deploy, or ship both backend and frontend at once.
---

# Full deploy (functions + website)

Deploys BOTH the Cloud Functions and the SSG site for project `ecuahuecas`. See `/deploy-functions` and `/deploy-website` for the single-target versions; this runs them in the right order.

## Critical project facts
- Project `ecuahuecas` belongs to **rmatovelle84@gmail.com** (default account has no access). ALWAYS pass `--account rmatovelle84@gmail.com --project ecuahuecas`.
- Functions secrets are in Secret Manager; the matching keys in `functions/.env` must stay commented (`#moved-to-secret-manager ...`). See `/deploy-functions` for the gotchas.
- The website is build-time static; `npm run build` refreshes the Sanity snapshot first (token from `../blog-component/.env`).

## Steps (STOP and report if any fails)
1. `npm test` — must pass.
2. `npm run typecheck` — must be clean.
3. **Functions first:** `firebase deploy --only functions --account rmatovelle84@gmail.com --project ecuahuecas --force`
   - If any callable was newly CREATED, curl-check it returns 401 (see `/deploy-functions` step 4).
4. **Build the site:** `npm run build` — confirm "[vite-ssg] Build finished." and sane snapshot counts.
5. **Deploy hosting:** `firebase deploy --only hosting --account rmatovelle84@gmail.com --project ecuahuecas`
6. Verify: `curl -s -o /dev/null -w '%{http_code}\n' https://ecuahuecas.web.app/` → expect 200.
7. Report what deployed + the live URL **https://ecuahuecas.web.app**.

## Notes
- Manual deploys by project decision — no CI/GitHub Actions involved.
- Order matters: deploy functions before the site so a freshly-published reseña (which uses the functions) is consistent with the rebuilt snapshot.
