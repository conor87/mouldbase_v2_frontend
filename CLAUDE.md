# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mouldbase_v2_frontend** — A React SPA for managing injection moulds, production operations, changeovers, TPM tracking, and scheduling. The UI is in Polish. The backend is a Django/FastAPI server at `localhost:8000`.

## Commands

- `npm run dev` — Start dev server (port 5173, proxies `/auth` and `/api` to backend)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run preview` — Preview production build (port 4173)

No test framework is configured.

## Tech Stack

- React 19 + Vite 7 + Tailwind CSS 4 (CSS-first config, no tailwind.config.js)
- React Router DOM 7 for routing
- Axios for HTTP requests
- jwt-decode for auth token handling
- lucide-react for icons
- React Compiler (babel plugin) enabled in vite.config.js

## Architecture

### Routing (`src/App.jsx`)

Routes are wrapped in `AppLayout` which provides a fixed left `Sidebar` (64px). Protected routes use `RequireRole` with `allowedRoles` prop. Role hierarchy: `user` < `admin` < `admindn` < `superadmin`.

Key route groups:
- **Public (authenticated):** `/` (moulds list), `/moulds/:mould_number`, `/changeovers`, `/current_sv`, `/tpm`, `/kalendarz`
- **Admin:** `/admin-panel`, `/production_admin`
- **AdminDN+:** `/moulds-admin` (add/edit moulds)
- **SuperAdmin:** `/superadmin`, `/dashboard`
- **No layout:** `/login`, `/register`, `/unauthorized`

### Authentication

JWT token stored in `localStorage` (`access_token`, `username`, `role`, `user_id`). Login POSTs form-urlencoded to `/auth/token`. `RequireAuth` redirects unauthenticated users; `RequireRole` checks role. Auth helpers are in `src/auth.js` but JWT parsing is also duplicated in several components.

### API (`src/config/api.js`)

`API_BASE` is hardcoded to `http://localhost:8000`. Vite proxy in dev rewrites `/api` and `/auth` to the backend. Axios calls are made directly in components with manual `Authorization: Bearer` headers.

### State Management

No global store — local `useState` + `useEffect` fetch pattern. Data passed between routes via `useLocation().state`. Mutations trigger refetches.

### Component Organization

- `src/components/` — Page-level and layout components (Moulds, Dashboard, Login, Sidebar, AppLayout, etc.)
- `src/components/subcomponents/` — Modals (Add/Edit/Delete for moulds, changeovers, calendar) and detail tabs (MouldDetails_BasicInfo, MouldDetails_Notes, etc.)
- `src/data/` — Static data (CodeExamples.js)

### Common Patterns

- `normalizeList(data)` — Utility duplicated across components to handle varying API response shapes (array vs `{results:[]}` vs `{data:[]}`)
- `buildMediaSrc(path)` — Constructs image URLs from backend media paths
- `SafeImg` — Graceful image fallback component
- Modal components follow a pattern: receive `show`, `onClose`, `onSaved` props; POST/PUT via axios; call `onSaved()` on success

## Conventions

- Polish language in UI text, many variable names, and comments
- Tailwind utility classes for all styling; custom animations in `src/index.css`
- ESLint flat config (v9); unused vars allowed if uppercase (constants pattern)
- HTML lang is `pl`, Google translate disabled
