---
project_name: ecuahuecas
project_type: web-saas
generated_at: 2026-05-31T03:36:35.725Z
schema_version: 1
---

## Stack
- frontend_framework: vue
- backend_framework: firebase
- database: firestore
- web_deployment_target: firebase-hosting

## Testing conventions
Use the testing tool that fits this stack — the project standard is to keep a fast unit suite runnable via the project's default test command, and to write a failing test before any new behavior lands. Tests live next to the code they exercise (or under a top-level tests/ tree, whichever already exists in this repo); follow the local convention rather than introducing a new one.

## Linting and formatting
Run the project's linter and formatter before every commit. If the repo ships a config (e.g., .eslintrc, ruff.toml, .prettierrc, gofmt defaults), defer to it without arguing; if no config exists yet, use the ecosystem-standard tool and add a minimal config rather than reformatting the whole tree in a drive-by change.

## Type-specific guidance
- Treat the browser and the backend as separate trust boundaries — never assume client-supplied data is well-formed at HTTP entry points.
- Reach for end-to-end tests sparingly; cover routing and frontend state-transition logic with focused integration tests at the boundary.
- Sessions and auth tokens are sensitive — never log them, and isolate any HTTP middleware that touches them behind a small, reviewable surface.
- Performance budgets matter: measure both server latency and browser time-to-interactive when changing data-fetch patterns.
