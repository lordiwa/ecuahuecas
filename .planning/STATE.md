---
gsd_state_version: 1.0
milestone: m1
milestone_name: Sitio publicable
status: planning
stopped_at: Fase 01 cerrada (Vue + Vite + vite-ssg scaffold con contenido markdown). PLAN.md de Fase 02 escrito a mano y listo para ejecutar.
last_updated: "2026-05-03T17:00:00.000Z"
last_activity: 2026-05-03
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (creado 2026-04-29)

**Core value:** Lectores honestos descubren huecas reales (carretillas, mercados, picanterías de barrio) por reseñas escritas en jerga ecuatoriana, sin marketing-speak.
**Current focus:** Fase 02 — Firebase Auth + Reviews Dinámicos + Mapa Real

## Current Position

Phase: 2 of 4 (Firebase Auth + reviews + mapa)
Plan: phases/02-firebase-auth-reviews-mapa/PLAN.md (escrito a mano fuera de GSD; 7 sub-fases definidas)
Status: Ready to execute (decisiones D1–D9 tomadas como defaults; confirmar antes de ejecutar)
Last activity: 2026-05-03

Progress: [██░░░░░░░░] 25%

## Performance Metrics

**Velocity:**

- Total plans completed: 1 (Fase 01, fuera de GSD)
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01    | 1     | -     | -        |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisiones clave del proyecto (ver PROJECT.md para detalle completo):

- **Stack:** Vue 3.5 + Vite 6 + TypeScript strict + vite-ssg, Pinia, CSS plano con tokens
- **Hosting:** Firebase Hosting (planeado, fase 04)
- **Auth + DB:** Firebase Auth + Firestore + Storage (fase 02)
- **Mapa:** MapLibre GL JS + tiles MapTiler/Stadia free tier (rechazado Mapbox y Google Maps por costo/lock-in)
- **SSG primero:** SEO + previews sociales; build-time pull de Firestore
- **Source of truth v2:** Firestore (markdown queda solo como seed inicial)
- **Branding:** estética bloque-imprenta (bordes negros, sombras duras 6px, sin blur ni gradientes)
- **Roles:** Firebase Custom Claims (`critico`, `admin`) — sin registro abierto, solo invitación

### Pending Todos

- Confirmar las 9 decisiones (D1–D9) del PLAN.md de Fase 02 antes de empezar a ejecutar
- Crear `.gitignore` que cubra `.env*`, `secrets/*`, `src/content-snapshot.json`
- Inicializar repo git (proyecto aún no es git repo según verificación inicial)

### Blockers/Concerns

- **Costo Firebase:** mitigar con budget alerts $5/mes, sin Cloud Functions runtime, lecturas cacheadas en build
- **Schema migration:** cambio `coords: {x,y}` → `coords: {lat,lng}` rompe seed markdown existente; versionar `src/content/` antes de migrar
- **MapLibre style custom:** estimado 1 día puede irse a 2; fallback es `streets-v2` default con override de colores básicos
- **Hidratación cliente vs SSG:** riesgo de FOUC; solo hidratar si timestamp Firestore > timestamp build

## Session Continuity

Last session: 2026-05-03
Stopped at: GSD instalado en EcuaHuecas. STATE.md inicializado a partir del ROADMAP existente. Fase 02 PLAN.md ya escrito a mano fuera de GSD — pendiente import o re-plan dentro del flujo GSD.
Resume file: None
