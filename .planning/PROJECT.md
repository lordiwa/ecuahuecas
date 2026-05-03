# EcuaHuecas

Sitio editorial de reseñas de comida de calle ecuatoriana ("huecas"), escrito por un colectivo curado de críticos. Quito + Guayaquil en fase 1; Cuenca, Manta más adelante.

## Valor central
Lectores honestos descubren huecas reales (carretillas, mercados, picanterías de barrio) por reseñas escritas en jerga ecuatoriana, sin marketing-speak.

## Stack
- **Frontend:** Vue 3.5 + Vite 6 + TypeScript strict + vite-ssg
- **Estado:** Pinia
- **Routing:** Vue Router (manual route definitions)
- **Estilos:** CSS plano con tokens (paleta bandera EC, sombras duras `6px 6px 0`, sin blur)
- **Tipografía:** Bowlby One / Fraunces / DM Sans / JetBrains Mono
- **Validación:** Zod
- **Markdown:** import.meta.glob + parser yaml + markdown-it
- **Hosting (planned):** Firebase Hosting
- **Auth + DB (planned):** Firebase Auth + Firestore + Storage
- **Mapa (planned):** MapLibre GL JS + tiles libres

## Restricciones de marca
1. Estética bloque-imprenta: bordes negros gruesos, sombras duras desplazadas, sin blur, sin gradientes
2. Tono callejero y chistoso, jerga ecuatoriana auténtica
3. Estrellas siempre rojas (amarillo = bandera, no rating)
4. Tipografías estrictas (no Inter/Roboto/Arial)
5. Mascota gallinazo solo en logo y favicon

## Principios técnicos
- SSG primero (SEO + previews sociales)
- Markdown como source of truth en v1; Firestore en v2 con build-time snapshot para mantener SSG
- Zero-JS para lectores no autenticados; el JS de auth/edición carga sólo en rutas /admin
- Mobile-first
- Costo bounded: free tiers de Firebase + cron de build limitado
