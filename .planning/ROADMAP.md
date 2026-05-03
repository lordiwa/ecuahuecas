# Roadmap

## Milestone 1 — Sitio publicable (en curso)

| # | Fase | Estado | Notas |
|---|---|---|---|
| 01 | Vue 3 + Vite + vite-ssg scaffold con contenido en markdown | ✅ Completada | 9 páginas pre-renderizadas, design tokens portados, 2 huecas + 2 críticos + 1 reseña de ejemplo |
| 02 | **Andamio: Editor WYSIWYG + Imágenes + Mapa real (sin Firebase, luego con)** | 🔜 Próxima | Ver `phases/02-andamio/PLAN.md`. 7 sub-fases (A.1–A.7); validamos UX en local antes de meter Firebase |
| 03 | Optimización de assets (gallinazo + favicons + OG images dinámicos) | Pendiente | Bloqueante para deploy |
| 04 | Firebase Hosting deploy + GitHub Actions (cron de rebuild) | Pendiente | Depende de 02 + 03 |

> **Nota:** El plan original de Fase 02 metía Firebase desde día uno; quedó archivado en `phases/_legacy-firebase-first/PLAN.md` como referencia. El nuevo enfoque "andamio" invierte el orden: UI funcional sin auth → Auth sin gate → Gate + roles → Persistencia Firestore.

## Milestone 2 — Crecimiento de contenido y comunidad (futuro)

| # | Fase | Notas |
|---|---|---|
| 05 | Comentarios en reseñas | Auth ya disponible desde 02 |
| 06 | Perfil público de crítico con stats | |
| 07 | i18n EN para turistas | |
| 08 | PWA: instalable + reseñas guardadas offline | |
| 09 | Expansión a Cuenca y Manta | Cargar contenido + extender enum `Ciudad` |

## Backlog (sin milestone asignado)

- Búsqueda con autocomplete + debounce
- Skeleton loaders en navegación
- Compartir en WhatsApp con preview de afiche
- Newsletter de reseñas semanales
- API de geocoding automático (rechazado en 02 por costo y error rate)
- Búsqueda con Algolia o Meilisearch
- Notificaciones por email (nueva reseña en hueca seguida)
