---
name: analytics
description: Use when working on the Analytics module (src/components/Analytics.jsx, backend/routers/analytics.py). Contains machine status reference table and analytics computation rules.
---

# Analytics Module Skill

## Machine Status Reference Table

| id | Numer statusu | Nazwa | Work |
|----|---------------|-------|------|
| 1 | 1 | Praca z operatorem | TAK |
| 3 | 2 | Praca bez operatora | TAK |
| 4 | 3 | Ustawianie | TAK |
| 2 | 4 | Awaria | NIE |
| 6 | 5 | Koniec operacji | NIE |
| 7 | 6 | Koniec zmiany | NIE |
| 8 | 7 | Zmiana zlecenia | NIE |
| 5 | 8 | Przerwij operację | NIE |


> **USER**: Fill this table with your machine statuses. Example:
> | 1 | 1 | Praca z operatorem |

## Analytics Computation Rules

### Work statuses (whitelist)
- Time is counted **only** when the current log has a **work status** (sno 1, 2, 3)
- Work statuses: Praca z operatorem, Praca bez operatora, Ustawianie
- All other statuses do NOT count towards work time

### Worker cards (`_compute_from_logs`) — per USER
- Logs grouped **per user**, ordered by `created_at`
- Sequential pairs: if current log has work status, delta to next log → attributed to current workstation
- Safety cap: 480 min (8h) — gaps longer than this are zeroed
- Result: `{user_id: {workstation_id: minutes}}`

### Machine cards (`_compute_machine_from_logs`) — per MACHINE
- Logs grouped **per workstation (machine)**, ordered by `created_at`
- A machine works independently — worker activity on other machines is irrelevant
- Sequential pairs: if current log has work status, delta to next log on THIS machine → counted
- Safety cap: 1440 min (24h) — machines can run long shifts
- Result: `{workstation_id: {operation_id: minutes}}`

**Key difference**: Workers see time split when switching machines. Machines see continuous time regardless of what workers do on other machines.

### Data source priority
- If saved data exists in `analytica_workers` / `analytica_machines` for the given date, use it
- Otherwise, compute on-the-fly from `production_operation_logs`

## Key Files
- **Backend**: `backend/routers/analytics.py` — API endpoints and computation logic
- **Backend models**: `backend/models/analytics.py` — `AnalyticaWorkers`, `AnalyticaMachines`
- **Backend schemas**: `backend/schemas/analytics.py` — Pydantic request/response models
- **Frontend**: `src/components/Analytics.jsx` — React component with Workers/Machines tabs
