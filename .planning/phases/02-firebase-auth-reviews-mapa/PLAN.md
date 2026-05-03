# Fase 02 — Firebase Auth + Reviews Dinámicos + Mapa Real

**Goal:** Pasar de un sitio 100% estático con contenido en markdown a un sitio donde críticos autenticados crean/editan reseñas desde el navegador, las huecas se muestran en un mapa real con sus coordenadas, y el SSG sigue funcionando para SEO.

**Estimación:** 5–7 días de trabajo, repartidos en 7 sub-fases ejecutables independientes.

---

## 1. Contexto

La fase 01 dejó el sitio con contenido en markdown (`src/content/**/*.md`) cargado en build-time. Funciona para SEO pero no escala: cada nueva reseña requiere un commit + rebuild manual.

El usuario quiere:
1. Login con Firebase para editores
2. Críticos autorizados pueden agregar reviews dinámicas
3. Mapa real con los lugares (no el SVG estilizado del prototipo)

---

## 2. Decisiones tomadas (defaults — confirmar antes de ejecutar)

### D1 — Auth providers
**Decisión:** Firebase Auth con **Google + Email/Password**.
- Google = frictionless para críticos con Gmail (la mayoría)
- Email/Password = fallback para quien no quiera usar Google
- **Sin** phone (cost + spam risk)
- **Sin** registro abierto: solo invitación por admin

### D2 — Modelo de autorización
**Decisión:** **Firebase Custom Claims** con dos roles:
- `critico` — puede crear/editar **sus propias** reseñas
- `admin` — puede grant `critico` a otros, editar/borrar lo que sea
- Default nuevo usuario = sin claims (solo lectura, autenticado)
- **Bootstrap:** un email admin hardcoded en Cloud Function que se auto-grants al primer login

### D3 — Source of truth: hybrid markdown + Firestore
**Decisión:** **Migración total a Firestore.** Los `.md` se convierten en seed data (script de import una sola vez).
- Razón: tener dos fuentes de verdad (md + Firestore) es deuda técnica desde día uno
- Markdown queda solo para páginas estáticas (about, FAQ — fuera de scope de v2)
- Firestore tiene tres colecciones: `huecas`, `resenas`, `criticos`

### D4 — SSG sigue siendo el modelo principal
**Decisión:** Build-time pull de Firestore.
- `vite.config.ts` `includedRoutes` lee Firestore (vía Admin SDK con service account) y emite un HTML por slug
- Cron de GitHub Actions hace rebuild cada 6 horas + en cada cambio (webhook desde Firestore o trigger manual)
- Cliente puede opcionalmente hidratar con datos frescos vía Firestore SDK si no se quiere esperar al rebuild

### D5 — Mapa: MapLibre GL JS
**Decisión:** **MapLibre GL** (fork open-source de Mapbox GL antes de su cambio de licencia) + tiles de **MapTiler** o **Stadia Maps** free tier.
- MIT, sin lock-in, sin cargos sorpresa
- Estilo custom JSON respetando paleta (amarillo papel, líneas negras, sin satélite)
- Pin = SVG con la mascota gallinazo o pin rojo custom estilo bandera
- Alternativa rechazada: Mapbox GL (cobra después de 50k loads/mes), Google Maps (paid + estética genérica)

### D6 — Geocoding manual
**Decisión:** Admin pega `lat,lng` desde Google Maps al crear hueca. **Sin** API de geocoding en v2.
- Razón: APIs cobran, error rate alto con direcciones de barrio, formulario manual es 30 segundos por hueca

### D7 — Storage de fotos
**Decisión:** **Firebase Storage**, compresión client-side antes de upload.
- Resize a max 1920px lado largo + WebP via canvas API
- Reglas Storage: max 2MB por archivo, max 8 fotos por reseña
- URL pública servida directo, sin CDN intermedio (Firebase ya está en CDN)

### D8 — Moderación
**Decisión:** **Sin queue.** Críticos publican directo. Admin puede editar/borrar (soft delete).
- Razón: equipo es chico y curado, queue añade fricción sin valor real

### D9 — Cost containment
**Decisión:** Free tier de Firebase + alerta de presupuesto en GCP a $5/mes.
- Firestore reads agresivamente cacheados en build (no Firestore en runtime de cliente excepto admin)
- Storage rules estrictas
- Sin Cloud Functions excepto la del bootstrap de admin (1 invocación por usuario)

---

## 3. Sub-fases

### 02.1 — Firebase project setup + SDK base (0.5d)

**Tareas:**
- [ ] Crear proyecto Firebase en consola (`ecuahuecas-prod`)
- [ ] Habilitar Auth (Google + Email/Password), Firestore, Storage, Hosting
- [ ] Generar config web → guardar en `.env.local` (gitignored)
- [ ] Generar service account JSON para Admin SDK → guardar en `secrets/firebase-admin.json` (gitignored)
- [ ] Instalar deps: `firebase`, `firebase-admin`
- [ ] Crear `src/lib/firebase.ts` con inicialización condicional (lazy, solo en rutas admin)
- [ ] Crear `scripts/firebase-admin.ts` para tareas de build (snapshot, seed)

**Verificación:** `npm run dev`, abrir consola del browser, verificar que `firebase.auth()` resuelve sin errores en una página de prueba.

---

### 02.2 — Migración de datos: markdown → Firestore (0.5d)

**Tareas:**
- [ ] Escribir `scripts/seed-firestore.ts` que:
  - Lee todos los `.md` de `src/content/**/*.md`
  - Parsea frontmatter con `yaml`
  - Valida con Zod schemas existentes en `src/types/content.ts`
  - Escribe a Firestore vía Admin SDK
  - Idempotente (usa slug como doc ID)
- [ ] Ejecutar contra Firestore
- [ ] Verificar en consola que las 3 colecciones tienen los docs esperados
- [ ] Mover `src/content/` a `src/content-archive/` (mantener como backup, dejar de importar en runtime)
- [ ] Actualizar `src/lib/content.ts` para leer de un snapshot JSON generado en build (ver 02.6)

**Verificación:** después de migrar, `npm run build` sigue produciendo el mismo HTML que antes, leyendo desde el snapshot.

---

### 02.3 — Auth flow + roles (1d)

**Tareas:**
- [ ] Crear `src/composables/useAuth.ts` con login Google + Email, logout, current user reactive
- [ ] Crear `src/pages/login.vue` (formulario minimal con estética de marca)
- [ ] Crear `src/composables/useRole.ts` que lee custom claims
- [ ] Cloud Function `bootstrapAdmin` que verifica email contra lista hardcoded y setea claim `admin`
- [ ] Cloud Function `grantCriticoRole` (solo callable por admin) que setea claim `critico` a otro usuario
- [ ] Crear `src/pages/admin/index.vue` con lista de usuarios + botón "promover a crítico" (solo visible para admin)
- [ ] Actualizar Header para mostrar avatar + dropdown si logged in

**Verificación:** Login con tu email → ver claim `admin` en token → promover otro usuario → verificar claim `critico` en token de ese usuario.

---

### 02.4 — Firestore security rules (0.5d)

**Tareas:**
- [ ] Escribir `firestore.rules`:
  - `huecas`: read público, write solo admin
  - `resenas`: read público, create si `request.auth.token.critico == true`, update solo si es propia o admin, delete solo admin
  - `criticos`: read público, write solo admin
- [ ] Escribir `storage.rules`: write solo si critico, max 2MB, mime image/*
- [ ] Deploy rules: `firebase deploy --only firestore:rules,storage`
- [ ] Tests con Firebase Emulator (`@firebase/rules-unit-testing`)

**Verificación:** intentar escribir desde un usuario no-crítico vía consola → debe fallar con permission denied.

---

### 02.5 — UI de creación/edición de reseñas (1.5d)

**Tareas:**
- [ ] Portar el wizard de 4 pasos del prototipo a Vue como `src/pages/admin/resenas/nueva.vue`
  - Paso 1: seleccionar hueca existente o crear nueva (form inline)
  - Paso 2: rating con `<Estrellas>` interactivas
  - Paso 3: título + cuerpo (markdown editor simple — `@uiw/vue-md-editor` o textarea con preview)
  - Paso 4: fotos (upload con drag&drop, preview, delete) + veredicto box
- [ ] Crear `src/pages/admin/resenas/[id]/editar.vue` (mismo wizard pero pre-rellenado)
- [ ] Componente `<PhotoUploader>` con compresión client-side (canvas → WebP)
- [ ] Botón "publicar" que escribe a Firestore + sube fotos a Storage, retorna URLs

**Verificación:** crear reseña desde 0 → aparece en Firestore → fotos en Storage → renderizable en `/resenas/[slug]`.

---

### 02.6 — Build-time Firestore snapshot (0.5d)

**Tareas:**
- [ ] Script `scripts/snapshot-firestore.ts` que:
  - Conecta con Admin SDK
  - Pulla `huecas`, `resenas`, `criticos`
  - Escribe a `src/content-snapshot.json` (gitignored)
- [ ] Reescribir `src/lib/content.ts` para leer del snapshot JSON en vez de glob de markdown
- [ ] Actualizar `vite.config.ts` `includedRoutes` para leer slugs del snapshot
- [ ] Modificar `package.json` script `build` → `tsx scripts/snapshot-firestore.ts && vite-ssg build`
- [ ] (Opcional) Hidratación cliente: en `/resenas/[slug]` chequea Firestore por una versión más nueva y reemplaza si existe

**Verificación:** crear reseña en admin → correr `npm run build` → la nueva reseña aparece en `dist/resenas/[slug].html`.

---

### 02.7 — Mapa real con MapLibre (1d)

**Tareas:**
- [ ] Instalar `maplibre-gl`
- [ ] Crear cuenta en MapTiler (free tier) → obtener API key → guardar en `.env`
- [ ] Crear style JSON custom en `src/assets/map-style.json` (basado en MapTiler "Streets" pero override colors a paleta EC: papel/amarillo de fondo, líneas negras, agua azul bandera)
- [ ] Componente `<MapaReal>` que toma `huecas` con `coords: { lat, lng }` y renderiza pines
- [ ] Pin SVG custom (rojo bandera, sombra dura) — clickeable → popup con nombre + rating + link
- [ ] Reescribir `src/pages/mapa.vue` usando `<MapaReal>`
- [ ] Centro inicial: bounding box que cubra todas las huecas
- [ ] Mobile: bottom sheet con lista de huecas, sincronizada con pines
- [ ] Migración del schema: `coords: { x, y }` → `coords: { lat, lng }` en types y datos seed

**Verificación:** abrir `/mapa` → ver pines correctamente posicionados sobre Quito y GYE → click en pin abre popup → mobile responsive.

---

## 4. Migraciones de schema

### `Hueca`
```diff
- coords?: { x: number; y: number }   // % en SVG estilizado
+ coords?: { lat: number; lng: number }  // coords reales
+ activa: boolean                       // soft delete
+ created_at: Timestamp
+ created_by: string                    // uid del admin que la creó
```

### `Resena`
```diff
- fecha: string                         // "Hace 3 días"
+ created_at: Timestamp                 // calcular relative en runtime
+ updated_at: Timestamp
+ activa: boolean
- imagen?: string                       // hex placeholder
+ fotos: string[]                       // URLs públicas de Storage
+ body: string                          // markdown crudo (renderizar con markdown-it)
```

### `Critico`
```diff
+ uid: string                           // Firebase Auth UID (PK)
- slug: string                          // ahora derivado de uid
+ email: string
+ avatar_url?: string                   // de Google o upload manual
+ activo: boolean
```

---

## 5. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Costo Firebase explota | Baja | Budget alerts $5/mes, sin Cloud Functions runtime, lecturas cacheadas en build |
| MapLibre style custom toma más de 1 día | Media | Fallback: usar `streets-v2` default y solo cambiar colores básicos vía API |
| Conflicto entre hidratación cliente y SSG (FOUC) | Media | Solo hidratar si timestamp Firestore > timestamp build; si no, dejar HTML SSG |
| Build CI demora >5min con muchos slugs | Baja | Paginar snapshot, build incremental con vite-ssg `crittersOptions: false` (ya hecho) |
| Firebase Auth captcha intrusivo en email/password | Media | Habilitar reCAPTCHA Enterprise solo en signup, no en login |
| Schema migration rompe markdown existentes | Alta | Script de migración se corre una vez con backup; versionar `src/content/` antes |

---

## 6. Definition of Done

- [ ] Login con Google funciona en `/login`
- [ ] Admin (1 email hardcoded) puede grantear rol `critico` a otros desde `/admin`
- [ ] Crítico logueado puede crear reseña desde wizard, con fotos
- [ ] Reseña aparece en `dist/resenas/[slug].html` después de `npm run build`
- [ ] `/mapa` muestra todas las huecas con pines reales sobre MapLibre
- [ ] Firestore + Storage rules deployadas y testeadas
- [ ] Sin secrets commiteados (`.env*`, `secrets/*` en `.gitignore`)
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` pasa y produce las mismas N páginas + las nuevas dinámicas
- [ ] README actualizado con instrucciones de setup local + Firebase

---

## 7. Out of scope (queda para futuras fases)

- Comentarios públicos en reseñas → fase 05
- Perfil público de crítico con stats → fase 06
- Notificaciones por email (nueva reseña en hueca seguida) → futuro
- Búsqueda con Algolia o Meilisearch → backlog
- OG images dinámicos estilo afiche → fase 03
- Compartir en redes con preview rich → fase 03
- App nativa (Capacitor / PWA) → milestone 2
