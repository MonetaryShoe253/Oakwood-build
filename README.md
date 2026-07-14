# Oakwood Maintenance Request System

A maintenance-request system for **Oakwood Property Management**. Tenants submit
repair requests through a public form (no login required); office staff triage,
track, and resolve them from a dashboard. Three transactional emails keep
everyone informed — and nothing else.

The canonical specification is **[`docs/build-spec-oakwood-maintenance.md`](docs/build-spec-oakwood-maintenance.md)**.
That document wins on any conflict with this README.

> ### 🔎 Running as a public demo
> This deployment runs in **public-demo mode** (`DEMO_MODE=true`, the default): the
> staff dashboard, ticket, and property pages — and the staff mutation APIs — are
> open so anyone can view and edit every feature without signing in. A "Live demo"
> banner makes that clear, and the home page links straight into the dashboard.
>
> The auth system is **not** removed — `/login` still works with the seeded
> credentials, and setting **`DEMO_MODE=false`** restores the full staff-only wall
> (middleware + per-handler session checks, build-spec §6/§12) with no code changes.
>
> A **"Reset demo data"** button in the dashboard header restores the seed defaults
> (`POST /api/staff/reset`) so visitors can undo their edits. It wipes all tickets
> and properties and recreates the showcase set from the shared dataset in
> `src/lib/demo-seed-data.ts` — the same data the deploy seed uses. The reset
> endpoint is demo-only: with `DEMO_MODE=false` it 404s and never touches data.

---

## Stack

| Layer        | Technology |
|--------------|------------|
| Framework    | Next.js 15 (App Router), React 19, TypeScript |
| Styling / UI | Tailwind CSS + shadcn/ui (in-repo components) |
| Database     | PostgreSQL (Neon) via Prisma |
| Auth         | Auth.js v5 (NextAuth), Credentials provider, argon2id password hashing |
| Email        | Resend, behind a single `sendEmail()` module |
| Validation   | Zod (shared client + server) |
| File storage | S3-compatible object storage (presigned uploads) — *integration is currently an M0 stub* |
| Hosting      | Vercel |

Requires **Node.js 20+**.

---

## Quick start (local)

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Create .env.local and fill in the variables below
#    (DATABASE_URL and AUTH_SECRET are the minimum to boot)

# 3. Apply the database schema
npx prisma migrate deploy        # or: npx prisma migrate dev

# 4. Seed staff users, properties, and demo tickets
npm run db:seed

# 5. Run the dev server
npm run dev                      # http://localhost:3000
```

Default seeded staff login (override the password with `SEED_STAFF_PASSWORD`):

| Email                          | Password (default) |
|--------------------------------|--------------------|
| `mark.fletcher@oakwoodpm.co.uk` | `ChangeMe!2024`    |
| `priya.sharma@oakwoodpm.co.uk`  | `ChangeMe!2024`    |
| `tom.becker@oakwoodpm.co.uk`    | `ChangeMe!2024`    |

> ⚠️ Always set a strong `SEED_STAFF_PASSWORD` for any deployment that is reachable
> on the internet. These accounts can sign in at `/login`.

---

## Environment variables

Set these in `.env.local` for development and in the Vercel project settings for
deployment. **Never commit secrets.**

| Variable                 | Required | Purpose |
|--------------------------|----------|---------|
| `DATABASE_URL`           | ✅ | PostgreSQL connection string (e.g. Neon, `?sslmode=require`). |
| `AUTH_SECRET`            | ✅ | Auth.js session-signing secret. Generate with `npx auth secret` or `openssl rand -base64 32`. |
| `APP_URL`                | Recommended | Public base URL used to build links in emails (e.g. `https://oakwood-maintenance.vercel.app`). |
| `RESEND_API_KEY`         | For email | Resend API key. Without it, emails are logged instead of sent. |
| `FROM_EMAIL`             | For email | Verified sender address for outbound mail. |
| `TEAM_INBOX_EMAIL`       | Optional | Recipient of the new-request team alert. Defaults to `maintenance@oakwoodpm.co.uk`. |
| `STORAGE_PUBLIC_BASE_URL`| Optional | Public base URL for tenant photo object storage. |
| `DEMO_MODE`              | Optional | `true` (default) opens the staff area to everyone for a public demo. Set to `false` to require staff sign-in. |
| `SEED_STAFF_PASSWORD`    | Seed only | Password applied to seeded staff users. Defaults to `ChangeMe!2024`. |

---

## Scripts

| Command            | Description |
|--------------------|-------------|
| `npm run dev`      | Start the development server. |
| `npm run build`    | Production build. |
| `npm run start`    | Serve the production build. |
| `npm run lint`     | ESLint (`next lint`). |
| `npm run typecheck`| `tsc --noEmit`. |
| `npm run test`     | Vitest unit/integration tests. |
| `npm run db:seed`  | Seed staff, properties, and demo tickets (`prisma db seed`). |

Run `npm run typecheck && npm run lint` (and make them pass) before marking any
engineering task complete.

---

## Deployment (Vercel + Neon)

1. **Link the project** (creates `.vercel/project.json`):
   ```bash
   npx vercel link
   ```
2. **Set environment variables** on the Production environment:
   ```bash
   npx vercel env add DATABASE_URL production
   npx vercel env add AUTH_SECRET production
   # …plus the email/storage variables you use
   ```
3. **Apply migrations** against the production database:
   ```bash
   npx vercel env pull .env.production.local --environment=production
   DATABASE_URL='<prod-connection-string>' npx prisma migrate deploy
   ```
   Then delete the pulled file — it contains the plaintext connection string:
   `rm .env.production.local`.
4. **(Optional) Seed** the production database:
   ```bash
   SEED_STAFF_PASSWORD='<strong-password>' DATABASE_URL='<prod>' npx prisma db seed
   ```
5. **Deploy**:
   ```bash
   npx vercel --prod
   ```

Environment-variable changes only take effect on the **next deployment**.

---

## Project structure

```
src/
  app/
    page.tsx                 Public maintenance-request form
    login/                   Staff sign-in (optional in demo mode)
    dashboard/               Staff ticket list (open in demo mode)
    tickets/[id]/            Ticket detail (open in demo mode)
    properties/              Manage properties (open in demo mode)
    api/
      tickets/               Public: create a ticket
      staff/                 Ticket + property mutations (open in demo mode)
      auth/[...nextauth]/    Auth.js route handlers
  lib/
    services/                Business logic (tickets, properties, notifications)
    validation/              Zod schemas (shared client + server)
    actions/                 Server actions (auth)
    demo.ts                  DEMO_MODE flag (relaxes the staff-auth wall)
    email.ts                 sendEmail() transport
    storage.ts               Object-storage interface (M0 stub)
    prisma.ts                Prisma client
  auth.ts                    Auth.js (Node runtime, Credentials)
  auth.config.ts             Edge-safe Auth.js config (middleware)
  middleware.ts              Session guard for protected routes
prisma/
  schema.prisma              Data model (immutable contract)
  migrations/                Versioned migrations
  seed.ts                    Database seed
docs/
  build-spec-oakwood-maintenance.md   Source of truth
  user-guide.md                       Staff user manual
```

---

## Immutable contracts

The following are fixed by the spec (§§3, 4, 11, 16). **Do not change them
without updating the spec first.**

- **Enums** — `Category`: `PLUMBING | ELECTRICAL | HEATING_BOILER | GENERAL`;
  `TicketStatus`: `NEW | IN_PROGRESS | ASSIGNED_TO_CONTRACTOR | RESOLVED`;
  `Role`: `STAFF` only.
- **`reference`** — unique monotonic integer starting at `1001`, displayed `#1001`,
  never reused.
- **`propertyAddressSnapshot`** — copied from the property at submission; ticket
  history always shows the snapshot, never the live property record.
- **Properties soft-archive** (`archived = true`); never hard-deleted. The tenant
  dropdown and filters show non-archived properties only.
- **`internalNotes`** — one mutable text field, not an append log or thread.
- **Resolved transition** — `resolvedAt = now()` is set only on
  `NEW/IN_PROGRESS/ASSIGNED → RESOLVED`; that same transition sends the tenant
  resolution email exactly once.
- **Exactly three emails** — team alert on create, tenant confirmation on create,
  tenant resolution on resolve. No other notification fires. Sends are post-commit
  and non-blocking: a provider failure is logged and never loses the ticket.

---

## License

Private / unpublished. Internal project for Oakwood Property Management.
