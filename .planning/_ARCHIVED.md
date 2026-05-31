# ⚠️ GSD ARCHIVADO — Ya no es el sistema activo

**Fecha de migración:** 2026-05-30

Este directorio `.planning/` pertenece al sistema **GSD (get-shit-done)**, que
**ya no se usa** en este proyecto. Se conserva solo como **referencia histórica**
(roadmap, requirements, y las decisiones D1–D9 del PLAN.md de la Fase 02).

## Sistema activo: agentic-framework

El proyecto ahora se gestiona con el **agentic-framework** (plugin de Claude Code,
marketplace `lordiwa/agent-framework`). Las fuentes de verdad son:

- `PROJECT.md` (raíz) — identidad y stack del proyecto
- `tasks/` — backlog de tareas (TASK-006 … TASK-015), gestionado vía el MCP `agentic-framework-tasks`
- `state/` — estado de sesión del orquestador
- `CLAUDE.md` — contrato RESUME-FIRST + routing del orquestador

## Mapeo de la migración (GSD → framework)

| GSD | Framework | Estado |
|-----|-----------|--------|
| Fase 01 (scaffold) | TASK-006 | done |
| Fase 02 A.1 (TipTap) | TASK-007 | done |
| Fase 02 A.2 (PhotoUploader) | TASK-008 | done |
| Fase 02 A.3 (MapLibre) | TASK-009 | done |
| Fase 02 A.4 (Wizard localStorage) | TASK-010 | todo (lista) |
| Fase 02 A.5 (Firebase Auth) | TASK-011 | todo |
| Fase 02 A.6 (Gate + roles) | TASK-012 | todo |
| Fase 02 A.7 (Firestore + Storage) | TASK-013 | todo |
| Fase 03 (Assets) | TASK-014 | todo |
| Fase 04 (Deploy + CI) | TASK-015 | todo |

Los hooks de GSD se desactivaron en `.claude/settings.json`. Los comandos
`/gsd-*` y los archivos del plugin GSD siguen en disco pero están inactivos;
pueden eliminarse por completo cuando se confirme que la migración está estable.
