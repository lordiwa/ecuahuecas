# Requirements: EcuaHuecas

**Defined:** 2026-05-03 (revisado tras re-plan de Fase 02 como andamio)
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

### Andamio: Editor + Imágenes + Mapa + Firebase incremental (Fase 02 — 🔜 próxima)

> Plan completo en `phases/02-andamio/PLAN.md`. Estrategia: A.1–A.4 sin backend, A.5–A.7 con Firebase incremental.

#### A.1 Editor WYSIWYG (TipTap)
- [ ] **EDIT-01**: `<RichTextEditor>` con TipTap + `tiptap-markdown`, output markdown crudo
- [ ] **EDIT-02**: Toolbar con bold, italic, h2/h3, listas, link, blockquote, hr
- [ ] **EDIT-03**: Atajos Cmd/Ctrl+B, +I, +K (link); estética de marca (bordes 2px, sombra 6px)
- [ ] **EDIT-04**: Lazy import en `/admin/**`; bundle size del editor no impacta home/listado

#### A.2 Upload de imágenes
- [ ] **PHOTO-01**: `<PhotoUploader>` con drag&drop + click-to-select, multi-file (max 8)
- [ ] **PHOTO-02**: Preview inmediato con `URL.createObjectURL`
- [ ] **PHOTO-03**: Compresión client-side a WebP, max 1920px lado largo, target ≤2MB
- [ ] **PHOTO-04**: Reorder por drag, borrar individuales, selección de "hero"
- [ ] **PHOTO-05**: Validado en iOS Safari (canvas WebP support)
- [ ] **PHOTO-06**: SHA-256 del file para deduplicación dentro del draft

#### A.3 Mapa real + selector de ubicación
- [ ] **MAP-01**: `<MapaReal>` con MapLibre GL JS + tiles MapTiler free tier
- [ ] **MAP-02**: Style JSON custom respetando paleta (papel/amarillo, líneas negras)
- [ ] **MAP-03**: Pines SVG custom (rojo bandera + sombra dura 6px) clickeables → popup
- [ ] **MAP-04**: Bounding box auto a todas las huecas si no hay center prop
- [ ] **MAP-05**: `<UbicacionPicker>` permite marcar lat/lng clickeando mapa + inputs sincronizados
- [ ] **MAP-06**: Bottom sheet mobile sincronizada con pines del mapa
- [ ] **MAP-07**: Schema migration `coords: {x,y}` → `coords: {lat,lng}` en seeds y types

#### A.4 Wizard de creación (sin auth, drafts en localStorage)
- [ ] **WIZ-01**: `/admin/resenas/nueva` con wizard de 4 pasos (hueca, rating, body, fotos)
- [ ] **WIZ-02**: Paso 1 permite seleccionar hueca existente o crear nueva inline con `<UbicacionPicker>`
- [ ] **WIZ-03**: Drafts persistidos en localStorage (key `draft:resena:<slug>`)
- [ ] **WIZ-04**: `/admin/resenas` lista drafts con continuar/descartar
- [ ] **WIZ-05**: `/admin/resenas/[id]/editar` re-abre wizard pre-rellenado
- [ ] **WIZ-06**: Botón "Publicar" en sub-fase A.4 solo loguea JSON a consola (placeholder)

#### A.5 Firebase Auth (login funcional, sin gate)
- [ ] **AUTH-01**: Firebase Auth Google + Email/Password operativos
- [ ] **AUTH-02**: `useAuth()` composable con login/logout/currentUser reactive
- [ ] **AUTH-03**: `/login` con form de marca; errores legibles
- [ ] **AUTH-04**: Header muestra avatar + dropdown si logueado, link a /login si no
- [ ] **AUTH-05**: Cloud Function `bootstrapAdmin` setea claim admin a email hardcoded
- [ ] **AUTH-06**: `/admin/**` sigue accesible sin auth en esta sub-fase (gate va en A.6)

#### A.6 Gate + roles + admin de usuarios
- [ ] **GATE-01**: Router guard: `/admin/**` requiere `currentUser`; redirect a `/login?next=...`
- [ ] **GATE-02**: `useRole()` lee custom claims `admin`/`critico`
- [ ] **GATE-03**: Wizard solo muestra "Publicar" si `isCritico || isAdmin`
- [ ] **GATE-04**: `/admin/usuarios` (solo admin) lista usuarios y permite grantear/revocar `critico`
- [ ] **GATE-05**: Cloud Functions `grantCriticoRole` y `revokeCriticoRole` (callable, verifican admin)

#### A.7 Persistencia Firestore + Storage
- [ ] **DATA-01**: Schemas Firestore (`huecas`, `resenas`, `criticos`) con migraciones (timestamps, soft delete, coords lat/lng, fotos URLs)
- [ ] **DATA-02**: Firestore rules — read público, write con claims, update solo propio o admin
- [ ] **DATA-03**: Storage rules — write solo critico, max 2MB, mime image/*
- [ ] **DATA-04**: "Publicar" sube fotos a Storage, escribe doc Firestore, borra draft de localStorage
- [ ] **DATA-05**: Script `scripts/seed-firestore.ts` idempotente migra seeds markdown → Firestore una sola vez
- [ ] **DATA-06**: Script `scripts/snapshot-firestore.ts` genera `src/content-snapshot.json` para SSG
- [ ] **DATA-07**: `src/lib/content.ts` lee del snapshot JSON; `vite.config.ts` `includedRoutes` lo usa
- [ ] **DATA-08**: `npm run build` corre snapshot + vite-ssg build; output incluye reseñas de Firestore
- [ ] **DATA-09**: Tests con Firebase Emulator + `@firebase/rules-unit-testing` para rules

#### Cross-cutting Fase 02
- [ ] **SEC-01**: Sin secrets commiteados (`.env*`, `secrets/*` en `.gitignore` — ya cubierto)
- [ ] **TC-01**: `npm run typecheck` pasa al cierre de cada sub-fase
- [ ] **TC-02**: `npm run build` pasa al cierre de A.7
- [ ] **DOC-01**: README actualizado con setup local + Firebase

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
- API de geocoding automático (rechazado en Fase 02 por costo + error rate de direcciones de barrio)
- Búsqueda con Algolia o Meilisearch
- Notificaciones por email (nueva reseña en hueca seguida)
- App nativa / Capacitor wrap
