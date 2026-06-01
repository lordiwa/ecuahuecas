---
name: deploy-functions
description: Deploy the EcuaHuecas Firebase Cloud Functions (auth/role callables + AI reseña draft + Sanity publish). Use when asked to deploy/redeploy the functions, push backend/Cloud Function changes, or after editing anything under functions/.
---

# Deploy the EcuaHuecas Cloud Functions

Deploys the Functions v2 (Node 22, us-central1) on project `ecuahuecas`.

## Critical project facts
- Project `ecuahuecas` belongs to **rmatovelle84@gmail.com** (default account has no access). ALWAYS pass `--account rmatovelle84@gmail.com --project ecuahuecas`.
- Functions: `bootstrapAdmin`, `grantCriticoRole`, `revokeCriticoRole`, `listCriticos` (admin-only) and `generateResenaDraft`, `publishResena` (crítico/admin-only).
- **Secrets:** `SANITY_WRITE_TOKEN` + `ANTHROPIC_API_KEY` live in **Google Secret Manager** (`defineSecret`, bound via the onCall `secrets:[]` option). `ANTHROPIC_MODEL` + `ADMIN_EMAIL` are `defineString` read from `functions/.env`.
  - GOTCHA 1: a `defineSecret` key must NOT be an active line in `functions/.env` — those two secret lines are intentionally commented (`#moved-to-secret-manager ...`). Keep them commented or the deploy refuses.
  - GOTCHA 2: never put a `defineString` param (like `ANTHROPIC_MODEL`) inside an onCall `secrets:[]` array — the CLI then tries to resolve a secret literally named `{{ params.X }}` and fails.

## Steps (STOP and report if any fails)
1. `npm test` — runs the functions' pure-logic tests (portableText, resolveHueca) + the rest. Must pass.
2. `npm run typecheck` — must be clean.
3. Deploy (all functions, or pass specific ones):
   - All: `firebase deploy --only functions --account rmatovelle84@gmail.com --project ecuahuecas --force`
   - Specific (faster): `firebase deploy --only functions:publishResena,functions:generateResenaDraft --account rmatovelle84@gmail.com --project ecuahuecas --force`
4. If a NEW callable was created (not just updated), verify the gen2 invoker is public + the auth gate runs:
   - `curl -s -o /dev/null -w '%{http_code}\n' -X POST https://us-central1-ecuahuecas.cloudfunctions.net/<fnName> -H 'Content-Type: application/json' -d '{"data":{}}'`
   - Expect **401** (reachable; our `unauthenticated` guard ran). A **403** = missing `allUsers` run.invoker → re-add it (`gcloud run services add-iam-policy-binding ... --member allUsers --role roles/run.invoker`) or delete+recreate the function.
5. Report which functions deployed.

## Notes
- This deploys ONLY functions (not the website). For hosting use `/deploy-website`; for both, `/deploy-all`.
- Cloud Functions changes do NOT require a website rebuild.
