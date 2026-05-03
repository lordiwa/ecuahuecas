# Requirements: EcuaHuecas

**Defined:** 2026-05-03
**Core Value:** Lectores honestos descubren huecas reales (carretillas, mercados, picanterías de barrio) por reseñas escritas en jerga ecuatoriana, sin marketing-speak.

## Milestone 1 — Sitio publicable

Requirements para el primer release público (Quito + Guayaquil).

### Scaffold + Contenido estático (Fase 01 — ✅ completada)

- [x] **SCAF-01**: Vue 3.5 + Vite 6 + TypeScript strict + vite-ssg con build SSG funcional
- [x] **SCAF-02**: Design tokens (paleta bandera EC, sombras duras 6px, tipografías Bowlby/Fraunces/DM Sans/JetBrains Mono) en `src/styles/tokens.css`
- [x] **SCAF-03**: Routing manual con Vue Router (index, top10, buscar, mapa, HuecaDetail, ResenaDetail, CriticoDetail)
- [x] **SCAF-04**: Contenido en markdown con frontmatter YAML, validado con Zod (`src/types/content.ts`, `src/lib/content.ts`)
- [x] **SCAF-05**: Seed mínimo: 2 huecas + 2 críticos + 1 reseña en `src/content/`
- [x] **SCAF-06**: 9 páginas pre-renderizadas en `dist/`

### Firebase Auth + Reviews dinámicos + Mapa real (Fase 02 — 🔜 próxima)

- [ ] **AUTH-01**: Login con Firebase Auth (Google + Email/Password); sin phone, sin signup abierto
- [ ] **AUTH-02**: Roles vía Firebase Custom Claims (`critico`, `admin`); admin bootstrap por email hardcoded
- [ ] **AUTH-03**: Cloud Function `grantCriticoRole` callable solo por admin
- [ ] **DATA-01**: Migración total markdown → Firestore via `scripts/seed-firestore.ts` (idempotente, slug = doc ID)
- [ ] **DATA-02**: Tres colecciones — `huecas`, `resenas`, `criticos` — con schemas migrados (coords lat/lng, timestamps, soft delete)
- [ ] **SSG-01**: Build-time snapshot de Firestore a `src/content-snapshot.json` (gitignored); `vite.config.ts` `includedRoutes` lee del snapshot
- [ ] **SSG-02**: Cron en GitHub Actions hace rebuild cada 6 horas + on-demand
- [ ] **UI-01**: Wizard de 4 pasos para crear/editar reseñas en `/admin/resenas/nueva` (hueca, rating, body, fotos)
- [ ] **UI-02**: Componente `<PhotoUploader>` con compresión client-side a WebP, resize ≤1920px, max 2MB
- [ ] **MAP-01**: Mapa real con MapLibre GL JS + tiles MapTiler free tier; estilo custom respetando paleta (papel/amarillo, líneas negras)
- [ ] **MAP-02**: Pines SVG custom (rojo bandera, sombra dura) clickeables → popup con nombre + rating + link
- [ ] **MAP-03**: Bottom sheet mobile sincronizada con pines del mapa
- [ ] **SEC-01**: Firestore rules — `huecas` y `criticos` write solo admin; `resenas` create si claim `critico`, update solo propia o admin
- [ ] **SEC-02**: Storage rules — write solo critico, max 2MB, mime image/*
- [ ] **SEC-03**: Cero secrets commiteados (`.env*`, `secrets/*` en `.gitignore`)

### Optimización de assets (Fase 03 — pendiente)

- [ ] **OPT-01**: Gallinazo PNG optimizado (compresión sin pérdida visible) + variantes para favicons
- [ ] **OPT-02**: OG images dinámicos por reseña/hueca (estilo afiche, paleta marca)
- [ ] **OPT-03**: Favicons completos (16, 32, 180 apple-touch, manifest)

### Firebase Hosting deploy + CI (Fase 04 — pendiente)

- [ ] **DEPLOY-01**: Firebase Hosting configurado con `firebase.json`; `dist/` como public dir
- [ ] **DEPLOY-02**: GitHub Actions workflow con cron de rebuild + deploy condicional
- [ ] **DEPLOY-03**: Service account de deploy en GitHub Secrets (no comprometido en repo)
- [ ] **DEPLOY-04**: `npm run typecheck` y `npm run build` pasan en CI antes de deploy

## Milestone 2 — Crecimiento de contenido y comunidad (futuro)

- [ ] **COMM-01**: Comentarios públicos en reseñas (Auth ya disponible desde Fase 02)
- [ ] **PROFILE-01**: Perfil público de crítico con stats (reseñas escritas, rating promedio, ciudades)
- [ ] **I18N-01**: Internacionalización EN para turistas
- [ ] **PWA-01**: Instalable + reseñas guardadas offline
- [ ] **CITY-01**: Expansión a Cuenca y Manta (cargar contenido + extender enum `Ciudad`)

## Backlog (sin milestone asignado)

- Búsqueda con autocomplete + debounce
- Skeleton loaders en navegación
- Compartir en WhatsApp con preview de afiche
- Newsletter de reseñas semanales
- Búsqueda con Algolia o Meilisearch
- Notificaciones por email (nueva reseña en hueca seguida)
