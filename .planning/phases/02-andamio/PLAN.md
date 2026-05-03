# Fase 02 — Andamio: Editor WYSIWYG + Imágenes + Mapa Real (sin Firebase, luego con)

**Status:** ready-to-discuss
**Goal:** Tener un flujo completo de creación de reseñas (texto rico + imágenes + ubicación real) que funcione **end-to-end localmente sin auth ni backend**, y luego conectarlo incrementalmente a Firebase (Auth → Firestore → Storage) sin reescribir la UI.
**Estimación:** 6–8 días, repartidos en 7 sub-fases. Cada sub-fase deja el sistema utilizable y testeable de forma aislada.
**Reemplaza al plan legacy** en `.planning/phases/_legacy-firebase-first/PLAN.md` — la diferencia clave es **invertir el orden**: primero UI + UX validada en local, después Firebase.

---

## 1. Por qué andamio

El plan original metía Firebase desde el día uno: setup → migración → auth → reglas → UI → mapa. El problema: hasta el final del Phase no se sabe si la UX del wizard funciona, y cada iteración de UI requiere lidiar con auth/permisos/CORS. Si TipTap no convence o el upload de fotos en mobile rompe, descubrimos tarde y con backend ya cableado.

**Andamio invierte el orden:**

1. Construir la UI + interacciones contra estado local (`localStorage` + blob URLs)
2. Validar UX en navegador real (golden path + mobile Safari)
3. Recién entonces meter Firebase Auth (sin gate, solo login funcional)
4. Activar el gate de auth + roles
5. Migrar persistencia local → Firestore + Storage en una sub-fase aislada

Cada salto es revertible y testeable.

---

## 2. Decisiones tomadas (defaults — confirmar antes de ejecutar)

### D1 — Editor WYSIWYG: TipTap
- Vue 3 nativo, MIT, headless (no nos casa con un toolbar feo)
- Extensible: starter kit cubre 80%; agregamos link, image, blockquote, separador
- **Output:** markdown vía `tiptap-markdown` extension — consistencia con el seed actual en `src/content/**/*.md` y con la idea de migrar a Firestore guardando markdown crudo
- Rechazado: Lexical (Vue support inmaduro), ProseMirror crudo (DX pobre), Quill (no es Vue 3)

### D2 — Mapa: MapLibre GL JS + MapTiler free tier
- MIT, sin lock-in, sin cargos sorpresa
- Style JSON custom respetando paleta (papel/amarillo de fondo, líneas negras, agua azul bandera)
- Pin SVG custom (rojo bandera + sombra dura 6px) — clickeable → popup
- Rechazado: Mapbox GL (cobra después de 50k loads/mes), Google Maps (paid + estética genérica)

### D3 — Estado de drafts: localStorage + blob URLs en memoria
- Mientras no haya backend, los drafts viven en `localStorage` (clave por slug temporal)
- Las fotos en draft son `URL.createObjectURL(file)` en memoria; no se persisten al refrescar (limitación documentada en la UI: "guarda como draft cierra la página y pierdes las fotos no subidas")
- En sub-fase A.7 se migra a Firestore + Storage

### D4 — Imágenes: compresión client-side a WebP
- Resize a max 1920px lado largo + WebP via canvas API
- Max 2MB por archivo, max 8 fotos por reseña
- Hash SHA-256 del file para deduplicación dentro del mismo draft

### D5 — Ubicación: picker manual con click en mapa
- Admin pega lat/lng desde Google Maps **o** clickea sobre el mapa para fijar la coordenada
- Sin API de geocoding (cobra, error rate alto con direcciones de barrio)
- Schema migration: `coords: {x, y}` (% en SVG estilizado) → `coords: {lat, lng}` reales

### D6 — Auth providers: Google + Email/Password
- Sin phone (cost + spam risk)
- Sin signup abierto: solo invitación admin
- Roles vía Firebase Custom Claims: `critico`, `admin` (admin bootstrap por email hardcoded en Cloud Function)

### D7 — Persistencia final: Firestore + Storage
- Tres colecciones: `huecas`, `resenas`, `criticos`
- Build-time snapshot a `src/content-snapshot.json` para SSG (visitantes anónimos no leen Firestore en runtime)
- Cliente autenticado puede hidratar con datos frescos via Firestore SDK

### D8 — Moderación: sin queue
- Críticos publican directo. Admin puede editar/borrar (soft delete con `activa: boolean`)
- Equipo es chico y curado, queue añade fricción sin valor real

### D9 — Cost containment Firebase
- Free tier + budget alert GCP a $5/mes
- Lecturas cacheadas en build (no Firestore en runtime cliente excepto admin)
- Storage rules estrictas (max 2MB, mime image/*)
- Sin Cloud Functions runtime excepto bootstrap admin

---

## 3. Sub-fases

### A.1 — Editor WYSIWYG con TipTap (1d)

**Tareas:**
- [ ] Instalar deps: `@tiptap/vue-3`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `tiptap-markdown`
- [ ] Crear `src/components/RichTextEditor.vue`:
  - `v-model:body` (markdown crudo)
  - Toolbar: bold, italic, h2, h3, bullet list, ordered list, link, blockquote, hr
  - Estética de marca: bordes negros 2px, sombra dura 6px, focus ring amarillo bandera
  - Atajos: Cmd/Ctrl+B, +I, +K (link)
- [ ] Lazy import el editor solo en rutas `/admin` (bundle size)
- [ ] Componente `<MarkdownPreview>` que renderiza con `markdown-it` (ya está en deps) para preview side-by-side opcional
- [ ] Página de prueba `src/pages/_dev/editor.vue` para validar aislado

**Verificación:** abrir `/_dev/editor` → tipear texto rico → ver markdown en preview → toggle bold/italic con atajos → pegar un link y verificar que se renderiza.

---

### A.2 — Upload de imágenes con compresión client-side (1d)

**Tareas:**
- [ ] Crear `src/components/PhotoUploader.vue`:
  - Drag & drop + click-to-select
  - Multi-file (hasta 8)
  - Preview inmediato con `URL.createObjectURL`
  - Compresión: canvas → WebP, max 1920px, target ≤2MB
  - Reorder por drag dentro de la lista (HTML5 drag API o `vue-draggable`)
  - Borrar individuales (× sobre el thumb)
  - Selección de "hero" (corona en thumb)
- [ ] Helper `src/lib/image.ts`:
  - `compressImage(File): Promise<{ blob: Blob; webpUrl: string; sha256: string; width, height }>`
- [ ] Página `src/pages/_dev/uploader.vue` para validar
- [ ] **Test mobile Safari** explícitamente: canvas WebP support y comportamiento en iOS

**Verificación:** subir 3 fotos JPEG grandes → ver previews comprimidos → reorder → marcar hero → en iOS Safari el flujo no rompe.

---

### A.3 — Mapa real con MapLibre + selector de ubicación (1.5d)

**Tareas:**
- [ ] Instalar `maplibre-gl`
- [ ] Crear cuenta MapTiler free tier → API key en `.env.local` (gitignored, ya cubierto)
- [ ] Crear `src/assets/map-style.json`:
  - Base: MapTiler "Streets" exportado
  - Override: fondo papel (`#fdf6e3`), labels negros, agua azul bandera (`#0033A0`), sin POI icons
- [ ] Componente `src/components/MapaReal.vue`:
  - Props: `huecas: HuecaConCoords[]`, `center?`, `zoom?`
  - Renderiza pines SVG custom (rojo bandera + sombra dura)
  - Click pin → popup con nombre + rating + link a `/huecas/[slug]`
  - Bounding box auto a todas las huecas si no hay center
- [ ] Componente `src/components/UbicacionPicker.vue`:
  - Props: `v-model:coords: { lat, lng } | null`
  - Click en mapa fija el pin
  - Input manual lat/lng debajo (sincronizado bidireccional)
  - Botón "centrar en mi ubicación" (geolocation API, opcional)
- [ ] Bottom sheet mobile en `src/pages/mapa.vue`:
  - Lista scroll de huecas sincronizada con pines
  - Tap en hueca → centra mapa + abre popup
  - Tap en pin → scroll a la card en la sheet
- [ ] **Schema migration:** convertir los seeds existentes
  - `src/content/huecas/seco-de-chivo-cali.md` y `encebollado-del-mercado.md`: cambiar `coords: { x, y }` por `coords: { lat, lng }` con coords reales obtenidas manualmente de Google Maps
  - Actualizar `src/types/content.ts` y `src/lib/content.ts` para el nuevo schema
  - El SVG estilizado del prototipo queda deprecado

**Verificación:** abrir `/mapa` → ver pines reales sobre Quito y GYE → click → popup → mobile bottom sheet sincronizada → en `<UbicacionPicker>` aislado, click en mapa actualiza los inputs.

---

### A.4 — Wizard /admin/resenas/nueva (sin auth, drafts en localStorage) (1.5d)

**Tareas:**
- [ ] Página `src/pages/admin/resenas/nueva.vue` accesible directo (sin gate de auth)
- [ ] Wizard de 4 pasos con un `<Stepper>` simple:
  - **Paso 1** — Hueca: dropdown de existentes (lee de `src/lib/content.ts`) + botón "crear nueva hueca" abre form inline con `<UbicacionPicker>`, nombre, ciudad, descripción
  - **Paso 2** — Rating: `<Estrellas>` interactivas (componente ya existe — extender a modo input)
  - **Paso 3** — Body: título + tagline + `<RichTextEditor>` para body + textarea para veredicto
  - **Paso 4** — Fotos: `<PhotoUploader>` con selección de hero
- [ ] Botón "Guardar borrador" → escribe a `localStorage`:
  - Key: `draft:resena:<slug-temporal>`
  - Value: JSON con todo el state + metadata de fotos (sha256 + webpUrl) — los blobs no persisten
- [ ] Página `src/pages/admin/resenas/index.vue`:
  - Lista los drafts en localStorage
  - Botón "Continuar editando" → abre `[id]/editar.vue`
  - Botón "Descartar" con confirm
- [ ] Página `src/pages/admin/resenas/[id]/editar.vue`:
  - Mismo wizard, pre-rellenado desde localStorage
- [ ] Botón "Publicar" en esta sub-fase: solo `console.log(JSON.stringify(draft, null, 2))` — placeholder hasta A.7
- [ ] Header link a `/admin/resenas` (visible solo si `import.meta.env.DEV` o un flag de URL `?admin=true` para no exponerlo en prod por accidente)

**Verificación:** crear reseña completa de 0 → ver el JSON en consola → refresh navegador → "Continuar editando" recupera todo (excepto fotos) → mobile responsive.

---

### A.5 — Firebase Auth (login funcional, sin gate aún) (1d)

**Tareas:**
- [ ] Crear proyecto Firebase `ecuahuecas-prod` en consola
- [ ] Habilitar Auth (Google + Email/Password), Firestore, Storage, Hosting
- [ ] Generar config web → `.env.local`:
  - `VITE_FIREBASE_API_KEY=...`
  - `VITE_FIREBASE_AUTH_DOMAIN=...`
  - etc
- [ ] Generar service account JSON → `secrets/firebase-admin.json` (gitignored, ya cubierto)
- [ ] Instalar deps: `firebase` (cliente), `firebase-admin` (Admin SDK para scripts de build)
- [ ] Crear `src/lib/firebase.ts`:
  - Init lazy: `getFirebaseApp()` que solo instancia cuando se llama
  - Exporta `getAuth()`, `getFirestore()`, `getStorage()` lazy
- [ ] Crear `src/composables/useAuth.ts`:
  - `currentUser` reactive ref
  - `signInWithGoogle()`, `signInWithEmail(email, pass)`, `signOut()`
  - Listener `onAuthStateChanged` montado en App.vue
- [ ] Página `src/pages/login.vue`:
  - Form de marca (Bowlby title, sombras duras 6px)
  - Botón "Continuar con Google" prominente
  - Toggle a Email/Password debajo
  - Errores legibles (no códigos crudos de Firebase)
- [ ] Header.vue: si `currentUser` existe muestra avatar + dropdown con "Mi perfil" / "Cerrar sesión"; si no, link a /login
- [ ] Cloud Function `bootstrapAdmin`:
  - Trigger: `onCall` o `onRequest` simple
  - Verifica email contra hardcoded list (un email tuyo)
  - Setea custom claim `admin: true` via Admin SDK
  - Documentación: cómo invocarla manualmente (curl o Firebase console)
- [ ] **Importante: las rutas `/admin/**` siguen accesibles sin auth en esta sub-fase.** El gate va en A.6.

**Verificación:** login con Google → ver avatar en header → logout → login con email/password → invocar bootstrapAdmin → verificar claim admin en token (Firebase console o consola browser).

---

### A.6 — Gate de auth + roles + admin de usuarios (0.5d)

**Tareas:**
- [ ] Router guard:
  - `/admin/**` requiere `auth.currentUser`; si no, redirect a `/login?next=...`
  - `/admin/usuarios` requiere claim `admin`
- [ ] `src/composables/useRole.ts`:
  - Reactive `{ isAdmin, isCritico, claims }`
  - Lee custom claims via `user.getIdTokenResult()`
- [ ] En el wizard de A.4:
  - "Publicar" solo visible si `isCritico || isAdmin`
  - "Guardar borrador" siempre disponible para usuarios autenticados
- [ ] Página `src/pages/admin/usuarios.vue` (solo admin):
  - Lista usuarios (Firebase Auth listUsers via Cloud Function)
  - Botón "Promover a crítico" → invoca `grantCriticoRole`
  - Botón "Revocar crítico"
- [ ] Cloud Function `grantCriticoRole`:
  - Callable
  - Verifica que el caller tenga claim `admin`
  - Setea claim `critico: true` en el target uid
- [ ] Cloud Function `revokeCriticoRole` (mismo patrón)

**Verificación:** logout → intentar `/admin/resenas/nueva` → redirect a /login → login con admin → puede ver `/admin/usuarios` → promover otro user a crítico → ese user logea y ve "Publicar" en el wizard.

---

### A.7 — Persistencia Firestore + Storage (1.5d)

**Tareas:**
- [ ] Schemas Firestore (`firestore.rules` + tipos):
  - `huecas/{slug}`: nombre, ciudad, coords, descripción, fotos (URLs Storage), activa, created_at, created_by
  - `resenas/{id}`: huecaSlug, criticoUid, titulo, tagline, body (markdown), rating, fotos (URLs Storage), heroFoto, veredicto, activa, created_at, updated_at
  - `criticos/{uid}`: nombre, slug, email, avatar_url, ciudad, activo
- [ ] Reglas Firestore:
  - `huecas`: read público, write solo admin
  - `resenas`: read público (`activa == true`), create si claim `critico`, update solo si `criticoUid == request.auth.uid` o admin, delete solo admin
  - `criticos`: read público, write solo admin (excepto el propio user actualizando su perfil)
- [ ] Reglas Storage:
  - `/resenas/{uid}/{slug}/{filename}`: write solo si `request.auth.uid == uid` y critico, max 2MB, mime image/*
- [ ] Tests con Firebase Emulator + `@firebase/rules-unit-testing`
- [ ] Botón "Publicar" del wizard de A.4:
  - Sube cada foto del draft a `gs://.../resenas/{uid}/{slug}/{sha256}.webp`
  - Reemplaza blob URLs por URLs públicas devueltas por Storage
  - Si "crear nueva hueca" en paso 1, escribe doc a `huecas/` primero
  - Escribe doc final a `resenas/{generated-id}`
  - Borra el draft de localStorage al éxito
  - Muestra toast "Publicada → /resenas/[slug]" con link
- [ ] Script `scripts/seed-firestore.ts`:
  - Lee `src/content/**/*.md`, parsea frontmatter, valida con Zod, escribe a Firestore (idempotente, slug = doc ID)
  - Corre una sola vez para subir el seed inicial
- [ ] Script `scripts/snapshot-firestore.ts`:
  - Pulla `huecas`, `resenas`, `criticos` con Admin SDK
  - Escribe a `src/content-snapshot.json` (gitignored, ya cubierto)
- [ ] Reescribir `src/lib/content.ts` para leer del snapshot JSON en vez de glob de markdown
- [ ] Actualizar `vite.config.ts` `includedRoutes` para leer slugs del snapshot
- [ ] Modificar `package.json`:
  - `"build": "tsx scripts/snapshot-firestore.ts && vite-ssg build"`
- [ ] Mover `src/content/` → `src/content-archive/` (backup, no importar en runtime)

**Verificación:** crear reseña en `/admin` → publicar → ver doc en Firestore + fotos en Storage → `npm run build` → la reseña aparece en `dist/resenas/[slug].html` → en runtime cliente, opcionalmente, la página chequea Firestore por una versión más nueva.

---

## 4. Migraciones de schema

### `Hueca`
```diff
- coords?: { x: number; y: number }   // % en SVG estilizado
+ coords?: { lat: number; lng: number }
+ activa: boolean
+ created_at: Timestamp
+ created_by: string
```

### `Resena`
```diff
- fecha: string                         // "Hace 3 días"
+ created_at: Timestamp
+ updated_at: Timestamp
+ activa: boolean
- imagen?: string                       // hex placeholder
+ fotos: string[]                       // URLs Storage
+ heroFoto?: string                     // índice o URL del hero
+ body: string                          // markdown crudo
```

### `Critico`
```diff
+ uid: string                           // Firebase Auth UID (PK)
- slug: string                          // derivado de uid
+ email: string
+ avatar_url?: string
+ activo: boolean
```

---

## 5. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| TipTap bundle size grande | Media | Lazy import solo en `/admin/**`; tree-shaking activado |
| Compresión de imágenes en mobile Safari rota | Media | Test explícito en iOS al cierre de A.2 antes de seguir |
| MapLibre style custom toma más de 1.5d | Media | Fallback: `streets-v2` default con override mínimo de colores |
| Schema migration coords rompe seeds existentes | Alta | Migrar a mano los 2 seeds antes de A.3; Zod schema valida nuevo shape |
| localStorage limit ~5MB con muchos drafts | Baja | Solo metadata de fotos (no blobs); cap a 5 drafts simultáneos con LRU |
| Costo Firebase si /admin queda abierto pre-A.6 | Alta | A.5 NO escribe nada en Firestore/Storage; gate de A.6 obligatorio antes de cualquier write desde cliente |
| Captcha intrusivo Firebase Auth | Media | reCAPTCHA Enterprise solo en signup; login limpio |
| Conflicto hidratación cliente vs SSG (FOUC) | Media | Solo hidratar si timestamp Firestore > timestamp build |

---

## 6. Definition of Done (toda la fase 02)

- [ ] `<RichTextEditor>` funcional con toolbar completa, atajos y output markdown
- [ ] `<PhotoUploader>` funcional con compresión, reorder, hero selection, validado en iOS Safari
- [ ] `/mapa` muestra pines reales sobre MapLibre con bottom sheet mobile
- [ ] `<UbicacionPicker>` permite marcar lat/lng clickeando el mapa
- [ ] Wizard `/admin/resenas/nueva` completable end-to-end con drafts en localStorage
- [ ] Login con Google y Email/Password funcional en `/login`
- [ ] Custom claims `admin`/`critico` operativas; bootstrap admin documentado
- [ ] Router guard sobre `/admin/**`; admin de usuarios para grantear `critico`
- [ ] Reseñas se publican a Firestore + fotos a Storage; visibles en `dist/resenas/[slug].html` post-build
- [ ] Reglas Firestore + Storage deployadas y testeadas con emulator
- [ ] Sin secrets commiteados (`.env*`, `secrets/*` en `.gitignore` — ya cubierto)
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` pasa
- [ ] README actualizado con setup local + Firebase

---

## 7. Out of scope (queda para futuras fases)

- Comentarios públicos en reseñas → fase futura (m2)
- Perfil público de crítico con stats → fase futura (m2)
- OG images dinámicos estilo afiche → Fase 03
- Compartir en redes con preview rich → Fase 03
- Optimización de assets (favicons, gallinazo variants) → Fase 03
- Firebase Hosting deploy + CI cron → Fase 04
- API de geocoding automático → backlog
- Búsqueda con Algolia/Meilisearch → backlog
- App nativa / PWA → m2

---

## 8. Orden de ejecución recomendado y checkpoints

```
A.1 Editor → checkpoint UX (¿se siente bien escribir?)
A.2 Fotos  → checkpoint mobile (¿iOS Safari rompe?)
A.3 Mapa   → checkpoint visual (¿el style custom respeta marca?)
A.4 Wizard → CHECKPOINT MAYOR: probar flujo completo sin login, validar UX antes de meter Firebase
A.5 Auth   → checkpoint login (¿Google funciona?)
A.6 Gate   → checkpoint roles (¿admin puede grantear?)
A.7 Persistencia → DoD completo
```

Después de A.4 hay un punto natural para parar, dogfood el wizard una semana, y solo entonces meter Firebase. Si la UX necesita cambios, el costo es mínimo porque no hay backend cableado.
