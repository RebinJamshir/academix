# Academix — Academic Planner & Study Management Platform

> **Live Server Running At:** [http://localhost:3000/](http://localhost:3000/)  
> **Network Access:** `http://127.0.0.1:3000/`

---

## 🎯 Overview
**Academix** is an enterprise-grade academic study and productivity web platform designed specifically for university students managing complex course loads (configured for B.Tech Computer Science KTU 2024 Scheme — 5 S5 subjects + 9 backlogs).

Engineered to match the **Stitch Design System** (`4237279488980398694`) and strict aesthetic guidelines (zero purple/violet/lavender, zero gradients, zero glassmorphism, crisp 1px borders, and flat layered surfaces).

---

## 🚀 Live Host Commands

### Quick Start (Server is already running in background):
Open your web browser and navigate to:
```
http://localhost:3000/
```

### Manual Run (if restarted):
```bash
node server.js
```
Or directly open `index.html` in any modern web browser (Edge, Chrome, Brave, Firefox) — Academix works fully offline with zero external dependencies.

---

## 🧭 Application Modules & Routes

| Route | Page | Purpose |
|---|---|---|
| `#/dashboard` | **Dashboard** | Daily control center, 4 dynamic KPIs, calendar widget with agenda inspector, today's schedule, weekly study telemetry chart, and active subjects. |
| `#/calendar` | **Calendar System** | Interactive Month, Week (hourly grid), Day, and Agenda views with category filtering and event inspector. |
| `#/tasks` | **My Tasks** | Task management with filter tabs (All, Today, Upcoming, In Progress, Completed, Overdue), priority sorting, search, and instant state toggle. |
| `#/planner` | **Study Planner** | Day-by-day timetable blocks (6 Nov 2026 - Jan 2027), weekly overview, timetable templates, reschedule flow, and sleep-preserving plan regeneration. |
| `#/subjects` | **Subjects & Syllabus** | All 14 subjects overview and detailed workspace (`#/subjects/:id`) with 4 modules and independent topic checklists (`Learned`, `Practiced`, `Revised`). |
| `#/examinations` | **Examinations** | Live countdowns, provisional confidence indicators, safe working target for SE (5 Jan 2027), and a 15-point exam readiness checklist. |
| `#/analytics` | **Progress & Analytics** | Decoupled syllabus progress vs study telemetry, planned vs actual hours chart, subject comparison matrix, and a 60-day study heatmap. |
| `#/notes` | **Notes Vault** | Academic notes with markdown formatting, code blocks, formula styling, subject categorization, and pinning. |
| `#/focus` | **Focus Timer** | Pomodoro (25/5/15m) and custom study timers with Web Audio synthesizer chimes and automatic study session logging to telemetry. |
| `#/settings` | **Settings** | Student profile, academic scheme settings, timetable assumptions, JSON export/import backup, and reset to defaults. |

---

## ⌨️ Global Keyboard Shortcuts

- `Ctrl + K` or `⌘ + K`: Open Command Palette / Global Search
- `N`: Quick-add note / task
- `T`: Jump to Today's schedule
- `Esc`: Close any open drawer or modal dialog

---

## 🛡️ Architecture & Data Integrity Rules
1. **Rule 1 — Single Source of Truth:** `Store` manages state via `localStorage` under key `academix_academic_state_v1`.
2. **Rule 2 — Decoupled Telemetry:** Syllabus completion percentages are derived strictly from module topic checklist states; study hours are strictly calculated from recorded actual minutes (`actualMinutes / 60`).
3. **Rule 3 — Idempotent Transitions:** Toggling task completion or checking topics will never duplicate hours or events.
4. **Rule 4 — Protected Sleep Schedule:** Study plan regeneration guarantees sleep protection at 22:45 bedtime.
