---
name: deploy-website
description: Build and deploy the EcuaHuecas static site (SSG) to Firebase Hosting. Use when asked to deploy/publish the website, push the site live, ship the frontend, or refresh the public site after publishing a reseña/hueca in /admin (the public site is build-time static, so new content only appears after a rebuild+deploy).
---

# Deploy the EcuaHuecas website (Firebase Hosting)

Deploys the static SSG site to https://ecuahuecas.web.app.

## Critical project facts
- The Firebase project `ecuahuecas` belongs to **rmatovelle84@gmail.com**. The machine's default account (srparca@gmail.com) has NO access. ALWAYS pass `--account rmatovelle84@gmail.com --project ecuahuecas`.
- The public site is **build-time static** (vite-ssg). `npm run build` runs `scripts/snapshot-sanity.mjs` first, which reads Sanity WITH a token from `../blog-component/.env` (already set up locally). New reseñas/huecas published via /admin only appear after this rebuild + deploy.

## Steps (run in order; STOP and report if any step fails)
1. `npm test` — all tests must pass.
2. `npm run typecheck` — must be clean.
3. `npm run build` — refreshes the Sanity snapshot, then builds `dist/`. Confirm it finishes ("[vite-ssg] Build finished.") and that the snapshot counts look sane (non-zero huecas/resenas).
4. `firebase deploy --only hosting --account rmatovelle84@gmail.com --project ecuahuecas`
5. Verify it's live:
   - `curl -s -o /dev/null -w '%{http_code}\n' https://ecuahuecas.web.app/` → expect 200.
   - Report the live URL: **https://ecuahuecas.web.app**

## Notes
- Do NOT use `git`/CI here — deploys are manual by project decision (no GitHub Actions).
- If `npm run build` fails on the snapshot with 0 docs, the Sanity token is missing — check that `../blog-component/.env` exists (it carries the token).
- This skill deploys ONLY hosting. For Cloud Functions use `/deploy-functions`. For both, use `/deploy-all`.
