---
gsd_state_version: 1.0
milestone: m1
milestone_name: Sitio publicable
status: planning
stopped_at: Fase 02 re-planeada como "andamio" (UI primero, Firebase después). PLAN.md escrito con 7 sub-fases A.1–A.7, decisiones D1–D9 tomadas. Listo para ejecutar A.1 (TipTap editor).
last_updated: "2026-05-03T18:30:00.000Z"
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
**Current focus:** Fase 02 — Andamio (Editor + Imágenes + Mapa real, sin Firebase → con Firebase)

## Current Position

Phase: 2 of 4 (Andamio)
Plan: phases/02-andamio/PLAN.md (7 sub-fases A.1–A.7)
Status: Ready to discuss/execute (decisiones D1–D9 tomadas como defaults)
Legacy: phases/_legacy-firebase-first/PLAN.md (plan original Firebase-first, archivado)
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

Decisiones clave del proyecto (ver PROJECT.md y phases/02-andamio/PLAN.md §2):

**Stack base (heredadas Fase 01):**
- Vue 3.5 + Vite 6 + TypeScript strict + vite-ssg, Pinia, CSS plano con tokens
- Estética bloque-imprenta (bordes negros, sombras duras 6px, sin blur ni gradientes)
- SSG primero (SEO + previews sociales)

**Fase 02 — Andamio (D1–D9):**
- D1: Editor = **TipTap** (Vue 3 nativo, MIT, headless) + `tiptap-markdown` para output markdown crudo
- D2: Mapa = **MapLibre GL JS** + tiles MapTiler free tier (rechazado Mapbox y Google Maps)
- D3: Drafts = **localStorage** + blob URLs en memoria mientras no haya backend
- D4: Imágenes = compresión client-side WebP, max 1920px, max 2MB, max 8 fotos/reseña
- D5: Ubicación = picker manual con click en mapa (sin geocoding API)
- D6: Auth = Firebase Auth Google + Email/Password (sin phone, sin signup abierto, custom claims)
- D7: Persistencia = Firestore + Storage; build-time snapshot a JSON para SSG
- D8: Sin queue de moderación (críticos publican directo, soft delete `activa: boolean`)
- D9: Cost containment Firebase free tier + budget alert $5/mes

**Estrategia de ejecución (clave del andamio):**
- A.1–A.4: UI completa funcional sin auth ni backend (drafts en localStorage)
- Checkpoint mayor después de A.4: dogfood UX antes de cablear Firebase
- A.5: login funcional pero sin gate aún
- A.6: gate de auth + roles
- A.7: migración localStorage → Firestore + Storage

### Pending Todos

- Confirmar las 9 decisiones (D1–D9) del PLAN.md de Fase 02 antes de ejecutar A.1
- Crear cuenta MapTiler free tier para A.3 (necesaria antes de empezar)
- Crear proyecto Firebase `ecuahuecas-prod` en consola — solo necesario antes de A.5
- Definir el email admin hardcoded para `bootstrapAdmin` Cloud Function (A.5)
- Migrar a mano coords de los 2 seeds existentes a `{lat, lng}` reales antes de A.3

### Blockers/Concerns

- **Mobile Safari WebP en canvas:** validar en A.2 antes de seguir (probabilidad media de inconsistencias)
- **TipTap bundle size:** mitigar con lazy import en `/admin/**`; revisar bundle al cierre de A.1
- **MapLibre style custom:** estimado 1.5d, riesgo de irse a 2.5d; fallback es `streets-v2` con override mínimo
- **localStorage 5MB cap:** mitigado guardando solo metadata + sha256 de fotos en draft (no blobs)
- **Schema migration coords:** alto impacto en seeds existentes; corre antes de A.3 con backup

## Session Continuity

Last session: 2026-05-03
Stopped at: Fase 02 re-planeada como "andamio". PLAN.md escrito en phases/02-andamio/. Plan legacy Firebase-first archivado en phases/_legacy-firebase-first/. ROADMAP, STATE y REQUIREMENTS actualizados.
Resume file: phases/02-andamio/PLAN.md (empezar por sub-fase A.1 — TipTap editor)
