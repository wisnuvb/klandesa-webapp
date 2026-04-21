# Project Guidelines

## Code Style

- Follow the existing TypeScript and React style in the repository: double quotes, trailing commas, and small focused components.
- Use the App Router patterns already present under `app/`; add `"use client"` only for interactive components, Zustand consumers, or browser-only code.
- Prefer reusing shared primitives from `components/ui`, `components/layout`, and feature folders before adding new abstractions.
- For Zustand stores, use selectors such as `useAuthStore((state) => state.user)` instead of destructuring the whole store. See `STORE_README.md`, `ZUSTAND_GUIDE.md`, and `ZUSTAND_ADVANCED.md`.

## Architecture

- This is a multi-tenant Next.js app with three route groups: `app/(landing)` for the marketing site, `app/(app)` for the authenticated dashboard, and `app/(website)` for tenant websites.
- Subdomain routing is handled in `middleware.ts`; route groups are internal and do not appear in URLs. See `MULTITENANT_SETUP.md`.
- Tenant-aware API routes live under `app/api/**/route.ts`. Preserve the existing header-based tenant flow using `x-tenant-subdomain` and the helpers in `lib/subdomain.ts` and `lib/tenant.ts`.
- Do not call `auth()` from middleware. It runs in the edge runtime, so auth checks belong in route handlers, pages, or server-side helpers.
- Prisma is the source of truth for data relationships. Keep village-scoped data isolated correctly when changing schema or API logic.

## Build And Test

- Start local development with `npm run dev`. This app runs on port `2042`, not the Next.js default.
- Use `npm run build` for production verification and `npm run lint .` before finishing substantial code changes.
- Database workflows use `npm run db:seed`, `npm run db:verify-fk`, `npm run db:reset`, and `npm run db:studio`.
- API smoke tests are documented in `TESTING.md` and can be run with `npm run test:api` after the dev server is running.
- For local subdomain testing, add entries such as `app.localhost` and tenant subdomains to `/etc/hosts`. See `MULTITENANT_SETUP.md`.

## Conventions

- In API work, prefer tenant resolution from headers over query parameters or hardcoded IDs.
- Keep middleware rewrites aligned with the existing routing model: `/` on `app` rewrites to `/dashboard`, while tenant roots rewrite into `(website)` routes.
- When working on mail templates or letter rendering, use `template.footer`, `template.blocks`, and `template.pages` instead of relying on legacy `footer_id` assumptions.
- Be careful in PDF/export flows that use `html2canvas`; modern CSS color functions can break rendering, so prefer existing hex-based theme tokens and fallback-safe behavior.
- Normalize nullable form values before passing them into controlled inputs to avoid uncontrolled-to-controlled React warnings.

## Documentation

- `MULTITENANT_SETUP.md`: subdomain routing, hosts setup, and tenant flow.
- `TESTING.md`: database reset/seed flow, API testing, and foreign key verification.
- `STORE_README.md`, `ZUSTAND_GUIDE.md`, `ZUSTAND_MIGRATION.md`, `ZUSTAND_ADVANCED.md`: store structure and Zustand usage patterns.
- `FINANCE_API.md` and `STATISTICS_API.md`: domain-specific API behavior for finance and statistics work.
- `BULK_UPLOAD_GUIDE.md`, `components/PAGE_STATUS_GUIDE.md`, and `components/ui/DATATABLE.md`: feature-specific guidance worth consulting before changing those areas.