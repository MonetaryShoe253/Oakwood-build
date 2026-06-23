# Build Spec — Oakwood Maintenance Request Management System

**Source:** Statement of Work v1.0 (signed). This document is the master build brief. It converts the SOW into concrete engineering decisions. Where the SOW says *what*, this says *how*.

---

## 0. How to use this with Claude Code + Ruflo

- **Section 3 (data model) is the contract.** Every work stream builds against it. Do not change field names, enum values, or relationships without updating this section first — drift here breaks everything downstream.
- **Build order and parallelization are in Section 14.** Once the schema (M1) is in place, the public form, auth/dashboard, and properties admin can be built as parallel streams. Email triggers (Section 10) depend on ticket-create and status-change being done.
- **Stack (Section 2) is the default assumption.** If Ruflo has house standards (different framework, ORM, or provider), swap them — but keep the data model, enums, route contract, email behaviour, and acceptance criteria (Section 16) fixed regardless of stack.
- **This is also a showcase build.** Where the real client starts with clean data, the demo instance is seeded (Section 15) so it looks live in a portfolio.

---

## 1. Product summary

Oakwood Property Management Ltd manages ~80 residential lettings with a team of 3. Maintenance requests currently arrive via email/text/WhatsApp and are tracked in a fragile shared spreadsheet. This app replaces that with:

- A **public, mobile-friendly form** for tenants to log issues (no login).
- A **secure dashboard** for the 3 staff to triage and manage every request through to resolution.
- **Three automated emails** (team alert, tenant confirmation, tenant resolution).

Success = one reliable channel in, one shared view for the team, nothing lost when a staff member is away.

---

## 2. Tech stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router), TypeScript** | Single deployable full-stack app; server actions + route handlers; trivial to host and own. |
| Styling | **Tailwind CSS + shadcn/ui** | Matches the approved wireframe; components live in-repo (client owns them). |
| Database | **PostgreSQL** (managed: Neon or Supabase) | Relational data, cheap managed tiers, owned by client. |
| ORM | **Prisma** | Type-safe schema + migrations + seed. |
| Auth | **Auth.js (NextAuth v5), Credentials provider** | 3 internal users, single role; no per-MAU third-party cost or lock-in. Passwords hashed (argon2id). |
| File storage | **S3-compatible object storage** (Cloudflare R2 or AWS S3) | Photo uploads; presigned PUT; key stored in DB. Abstract behind a small storage module. |
| Email | **Resend** (or any transactional provider/SMTP) | Three templated transactional emails; good deliverability; swap-able behind one `sendEmail()` module. |
| Hosting | **Vercel** (app) + managed Postgres + R2 + Resend | All accounts created in the client's name (see Section 17). At this scale, infra sits near free-tier; the £50/mo covers management. |
| Validation | **Zod** | Shared schemas, client + server. |

Node 20+. Use the framework's built-in image optimisation for photo display.

---

## 3. Data model (source of truth)

Prisma schema. Adjust syntax to the chosen ORM if swapped, but keep names/semantics identical.

```prisma
enum Role {
  STAFF
}

enum Category {
  PLUMBING
  ELECTRICAL
  HEATING_BOILER
  GENERAL
}

enum TicketStatus {
  NEW
  IN_PROGRESS
  ASSIGNED_TO_CONTRACTOR
  RESOLVED
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(STAFF)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Property {
  id        String   @id @default(cuid())
  address   String                     // one line per CSV row, e.g. "14 Elm Road, Flat 2"
  archived  Boolean  @default(false)   // soft-remove; dropdown shows non-archived only
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tickets   Ticket[]
}

model Ticket {
  id                     String       @id @default(cuid())
  reference              Int          @unique            // human ref, displayed "#<reference>", starts at 1001
  property               Property     @relation(fields: [propertyId], references: [id])
  propertyId             String
  propertyAddressSnapshot String                          // copy of address at submission (survives archive/edit)
  tenantName             String
  tenantEmail            String
  tenantPhone            String
  category               Category
  description            String       @db.Text
  photoKey               String?                          // object-storage key; null if no photo
  status                 TicketStatus @default(NEW)
  internalNotes          String?      @db.Text            // SINGLE editable field, not a thread
  createdAt              DateTime     @default(now())
  updatedAt              DateTime     @updatedAt
  resolvedAt             DateTime?
}
```

**Key decisions baked into the model:**

- **`reference`** is a monotonic integer starting at **1001**, assigned at creation (Postgres sequence or a counter row in a transaction). Display as `#1001`. Never reuse.
- **`propertyAddressSnapshot`** is copied from the selected property at submission. This means archiving or correcting a property later never changes or breaks historical tickets. Always display the snapshot on a ticket, not the live property record.
- **Properties soft-archive** (`archived = true`) rather than hard-delete, so tickets keep a valid FK. The tenant dropdown and filters list only `archived = false`.
- **`internalNotes`** is one mutable text field (per client: "an editable text area … and hit save"). Not an append log.
- **`resolvedAt`** is set when status first transitions into `RESOLVED` (see Section 10 for the email side effect).

---

## 4. Enumerations & fixed values (do not paraphrase)

- **Categories** (label → machine value): Plumbing → `PLUMBING`, Electrical → `ELECTRICAL`, Heating / Boiler → `HEATING_BOILER`, General → `GENERAL`.
- **Statuses** (display → machine): New → `NEW`, In Progress → `IN_PROGRESS`, Assigned to Contractor → `ASSIGNED_TO_CONTRACTOR`, Resolved → `RESOLVED`.
- **Role:** `STAFF` only. No tiers.
- **Team inbox (env `TEAM_INBOX_EMAIL`):** `maintenance@oakwoodpm.co.uk`
- **Email FROM (env `FROM_EMAIL`):** `Oakwood Property Management <maintenance@oakwoodpm.co.uk>` (tenant emails set `reply-to` to the same address).

---

## 5. Public tenant form

**Route:** `/` (the report form is the landing page) → success state on submit.
**Access:** public, no auth. Mobile-first layout.

**Fields & validation (Zod, enforced client AND server):**

| Field | Type | Rules |
|---|---|---|
| Tenant name | text | required, 2–100 chars |
| Email | text | required, valid email |
| Phone | text | required, 7–20 chars, digits/spaces/`+`/`-`/`()` |
| Property | select | required; options = active properties (`archived=false`), value = `propertyId`; UI shows `address` |
| Category | select | required; one of the 4 categories |
| Description | textarea | required, 5–2000 chars |
| Photo | file | optional; **single** file; `image/jpeg` or `image/png` only; max **10 MB** |
| (honeypot) | hidden text | must be empty (anti-spam, see below) |

**Submit behaviour:**
1. Validate. If photo present, upload to object storage at key `tickets/{generatedTicketId}/{uuid}.{ext}`; store `photoKey`.
2. Create the ticket: assign `reference`, copy `propertyAddressSnapshot` from the selected property, default `status = NEW`.
3. Fire **Email 1** (team) and **Email 2** (tenant) — see Section 10. Email failures must NOT fail the submission (catch, log, continue).
4. Show a **success screen**: confirmation message, the ticket reference (`#1001`), a short summary, and "You'll receive a confirmation email shortly." Provide a "Submit another request" action.

**Anti-abuse (lightweight — NOT a CAPTCHA, per client):**
- Hidden **honeypot** field; if non-empty, return a fake success and silently drop.
- **Rate limit** the create endpoint per IP (e.g., 5/min and 30/hour) via the platform's KV/Redis (e.g., Upstash). Exceeding → 429 with a friendly message.

**Accessibility:** real `<label>`s, keyboard operable, visible focus, error messages tied to fields via `aria-describedby`, responsive down to 360px.

---

## 6. Staff authentication & access control

- **Login route:** `/login`. Email + password. On success → `/dashboard`.
- **Protected:** `/dashboard`, `/tickets/[id]`, `/properties`, and all `/api/staff/*` endpoints. Unauthenticated access redirects to `/login` (pages) or returns 401 (API). Enforce via middleware AND per-handler session checks (defence in depth).
- **Sessions:** httpOnly, secure, sameSite=lax cookies (Auth.js defaults). CSRF protection on mutations (Auth.js handles for its routes; server actions are CSRF-safe by default; protect any custom route-handler mutations).
- **Passwords:** hashed with **argon2id**. No plaintext anywhere, no passwords in logs.
- **Users:** the **3 staff accounts are seeded** (Section 15) with credentials supplied by you; there is **no in-app user-management UI** in v1. (Optional, only if trivial: a "change my password" page. Not required.)

---

## 7. Team dashboard — ticket list

**Route:** `/dashboard`.

**Table columns:** Reference (`#1001`), Logged (relative + exact on hover), Property (snapshot address) with tenant name beneath, Category, Status.

**Controls:**
- **Status filter** (All + each of the 4 statuses).
- **Property filter** (All + each active property).
- **Search** — case-insensitive contains across: reference, tenant name, snapshot address, description.
- **Sort:** `createdAt` desc by default (newest first).
- **Pagination:** 25 per page (filters/search applied server-side).
- **Inline status change:** a status dropdown on each row that PATCHes immediately (optimistic UI, rollback on error). Changing to `RESOLVED` triggers the resolution side effects (Section 10).

**States:** loading skeleton, empty state ("No tickets yet"), filtered-empty state ("No tickets match these filters"), error state with retry. A small photo indicator (icon) on rows where `photoKey` is set.

Row click → ticket detail (Section 8).

---

## 8. Ticket detail

**Route:** `/tickets/[id]` (or a detail panel; route is fine and simpler).

**Displays:**
- Reference, logged date/time, current status.
- **Tenant contact block, prominent:** full name, **phone**, **email** (phone/email as click-to-call / click-to-mail). This is the staff's primary call-back info.
- Property (snapshot address), category, full description.
- **Photo:** thumbnail if present; click to view full-size (lightbox or new tab). "No photo" placeholder otherwise.
- **Status dropdown** (the 4 statuses) — same side effects as inline change.
- **Internal Notes:** an editable `<textarea>` pre-filled with `internalNotes`, with a **Save** button. Saving PATCHes `internalNotes`. Show saved/dirty state; warn on navigate-away with unsaved changes.

---

## 9. Manage Properties (admin)

**Route:** `/properties` (staff-only).

- **List** all active properties (option to show archived).
- **Add:** single text input (`address`, the full line). Creates `Property{ address, archived:false }`.
- **Remove:** sets `archived = true` (soft). Confirm before archiving. Archived properties disappear from the tenant dropdown and property filter immediately, but historical tickets are unaffected (they use the snapshot).
- Optional: un-archive action and basic edit of an address (edit changes future submissions only; existing snapshots stay).

---

## 10. Email notifications

Exactly **three** automated emails. **Email only** — no SMS, push, or in-app notifications. Send via one `sendEmail()` module so the provider is swappable. All sends are **post-commit and non-blocking**: a provider error is caught, logged, and never rolls back or hides the underlying DB action. Include a retry-once on transient failure.

**Email 1 — New ticket → team** (`TO: maintenance@oakwoodpm.co.uk`)
Trigger: ticket created.
Subject: `New maintenance request #{reference} — {propertyAddressSnapshot}`
Body (plain, with a dashboard link):
> A new maintenance request has been logged.
> **Ref:** #{reference}
> **Property:** {propertyAddressSnapshot}
> **Category:** {Category label}
> **Tenant:** {tenantName} — {tenantPhone} — {tenantEmail}
> **Issue:** {description}
> **Photo:** {"Attached/available" or "None"}
> View it in the dashboard: {APP_URL}/tickets/{id}

**Email 2 — New ticket → tenant** (`TO: tenantEmail`, confirmation)
Trigger: ticket created.
Subject: `We've received your maintenance request (#{reference})`
Body:
> Hi {tenantName},
> Thanks for letting us know. We've received your maintenance request and our team is reviewing it.
> **Reference:** #{reference}
> **Issue:** {Category label} — {first ~140 chars of description}
> We'll be in touch if we need anything further. If you need to add information, just reply to this email.
> — Oakwood Property Management

**Email 3 — Resolved → tenant** (`TO: tenantEmail`)
Trigger: status changes **into** `RESOLVED` from any non-resolved status (guard: only when `previousStatus !== RESOLVED && newStatus === RESOLVED`). On that transition, also set `resolvedAt = now()`. Do not resend if the ticket was already resolved (prevents spam from toggling).
Subject: `Your maintenance request has been resolved (#{reference})`
Body:
> Hi {tenantName},
> Your maintenance request (#{reference}) has been marked as resolved.
> **Issue:** {Category label} — {first ~140 chars of description}
> If this isn't fully sorted, just reply to this email and we'll reopen it.
> — Oakwood Property Management

No emails are sent for internal notes, contractor assignment, or any other status change.

---

## 11. Routes & API surface

**Pages:** `/` (form), `/login`, `/dashboard`, `/tickets/[id]`, `/properties`.

**Public API / actions:**
- `POST /api/tickets` — create ticket (validate, store photo, create record, fire Emails 1 & 2). Rate-limited + honeypot.
- Property options for the form: server-render from DB, or `GET /api/properties/active`.

**Staff API / actions (all auth-guarded under `/api/staff/*` or equivalent server actions):**
- `GET  /api/staff/tickets` — list; query params: `status`, `propertyId`, `q` (search), `page`.
- `GET  /api/staff/tickets/[id]` — single ticket.
- `PATCH /api/staff/tickets/[id]` — update `status` and/or `internalNotes`. Handles the resolved-transition side effects.
- `GET  /api/staff/properties` — list (incl. archived flag).
- `POST /api/staff/properties` — add `{ address }`.
- `PATCH /api/staff/properties/[id]` — archive/un-archive/edit.

All inputs Zod-validated server-side; all mutations require a valid session.

---

## 12. Non-functional requirements

- **Transport:** HTTPS everywhere (platform-provided).
- **AuthZ:** single `STAFF` role; every staff route + endpoint guarded; public endpoints limited to ticket-create and active-property read.
- **Input safety:** Zod on every input; React escapes rendered text by default — never use `dangerouslySetInnerHTML` for tenant/staff-entered content.
- **File safety:** enforce mime + 10 MB cap **server-side** (don't trust the client); randomise stored filenames; optional EXIF strip on upload.
- **Secrets:** all config via environment variables; nothing committed; no secrets/passwords in logs.
- **Errors & logging:** structured logging; ticket creation and email sends wrapped so a downstream failure (email/storage) is logged but never loses the ticket; user-facing error states everywhere.
- **Accessibility & responsiveness:** semantic HTML, labelled controls, keyboard support, works 360px→desktop.
- **Testing (lean but real):** type-checking in CI; a handful of integration tests covering — ticket create persists + fires both emails, status→Resolved fires Email 3 exactly once and sets `resolvedAt`, an unauthenticated request to a staff endpoint is rejected, property archive removes it from the active dropdown.

**Environment variables:**
```
DATABASE_URL=
AUTH_SECRET=                 # Auth.js / NextAuth
AUTH_URL=                    # app base URL for auth
APP_URL=                     # used in email links
RESEND_API_KEY=              # or provider equivalent / SMTP creds
FROM_EMAIL="Oakwood Property Management <maintenance@oakwoodpm.co.uk>"
TEAM_INBOX_EMAIL=maintenance@oakwoodpm.co.uk
STORAGE_BUCKET=
STORAGE_ENDPOINT=            # R2/S3 endpoint
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_PUBLIC_BASE_URL=     # for serving photos (or use signed GETs)
RATE_LIMIT_REDIS_URL=        # e.g. Upstash (optional but recommended)
```

---

## 13. Out of scope — DO NOT BUILD (per SOW Section 4)

- Contractor logins, contractor portal, or any third user role.
- Native mobile apps.
- Tenant accounts, passwords, or logins.
- Automated tenant updates between submission and resolution (only the 3 emails exist).
- SMS, WhatsApp, or push notifications.
- Migration/import of historical tickets (production starts clean).
- Integrations with external/third-party systems.
- Permission tiers, approval flows, restricted views.
- Penetration testing, security certifications.

If an agent is tempted to add any of the above "for completeness," stop — it's explicitly excluded.

---

## 14. Build order & parallelization (milestones)

- **M0 — Scaffold & infra.** Next.js + TS + Tailwind + shadcn; Prisma; connect Postgres; storage + email modules stubbed; deploy pipeline; env wired. *Blocks everything.*
- **M1 — Data layer.** Schema (Section 3), migrations, seed scripts (properties + 3 users). *Blocks all feature streams; this is the contract.*

After M1, these run **in parallel**:
- **Stream A — Public form (M2):** form UI + validation + property fetch + photo upload + `POST /api/tickets` (without emails first).
- **Stream B — Auth + dashboard (M3→M4):** login + route guards, then ticket list (table/filters/search/inline status).
- **Stream C — Properties admin (M6):** list/add/archive; verify dropdown reflects active only.

Then converge:
- **M5 — Ticket detail:** contact block, photo view, status dropdown, internal-notes save. (Needs B.)
- **M7 — Emails:** wire Emails 1 & 2 into ticket-create (A) and Email 3 into status→Resolved (B/M5). (Needs A + B.)
- **M8 — Hardening:** rate limit + honeypot, server-side file checks, a11y pass, empty/error/loading states, the lean test set.
- **M9 — Production deploy & smoke test:** all envs in the client's name; end-to-end run (submit → emails → triage → resolve → resolution email); then handover (Section 17).

---

## 15. Seed & demo data

- **Properties:** load the **80 addresses** from the client CSV (path: `{provide path}`, one address per row) into `Property`.
- **Users:** seed **3 staff** (Mark Fletcher + two property managers) with names/emails you supply; set initial passwords hashed with argon2id (deliver via a secure channel, prompt change on first login if you add that option).
- **Production = clean tickets.** Do **not** seed tickets for the real client; the team will hand-enter the ~5–10 active issues post-handover (per SOW).
- **Demo/showcase instance only:** seed ~10 sample tickets spread across all 4 categories and all 4 statuses, a few with photos, realistic addresses/names, varied dates — so the dashboard looks live in your portfolio. Use a test inbox / the email provider's test mode and a placeholder domain for the demo so no real emails fire.

---

## 16. Acceptance criteria / Definition of Done

Each maps to the SOW. The build is done when all pass.

**Tenant form**
- [ ] Public mobile-friendly form at `/`; no login required.
- [ ] Captures name, email, phone, property (dropdown of active properties), category (4 options), description, optional single JPEG/PNG photo (≤10 MB).
- [ ] On submit: ticket created with a unique `#reference`, snapshot address stored, status `NEW`; success screen shows the reference.
- [ ] Invalid input is rejected with field-level messages, client and server.

**Dashboard**
- [ ] Staff-only; unauthenticated users are redirected/blocked.
- [ ] Lists all tickets (ref, logged, property/tenant, category, status), newest first.
- [ ] Filter by status and by property; search across ref/tenant/address/description.
- [ ] Status is changeable via dropdown from the list and detail.

**Ticket detail**
- [ ] Shows tenant's full phone + email prominently, plus category, description, and photo (if any).
- [ ] Internal Notes is an editable field that saves against the ticket.

**Statuses & emails**
- [ ] Four statuses exactly: New, In Progress, Assigned to Contractor, Resolved.
- [ ] Email to `maintenance@oakwoodpm.co.uk` on every new ticket.
- [ ] Confirmation email to the tenant on submission.
- [ ] Resolution email to the tenant when status changes to Resolved (once; sets `resolvedAt`).
- [ ] No other notifications fire.

**Properties / users / security**
- [ ] Manage Properties: staff can add and remove (archive) properties; dropdown reflects changes.
- [ ] Three staff accounts, single equal-access role.
- [ ] Login + role-based access + HTTPS. No pen-testing / certs (correctly absent).

**Out of scope**
- [ ] None of the Section 13 exclusions are present.

---

## 17. Handover & ownership

- All accounts — **Vercel (hosting), Postgres, object storage, email provider, domain/DNS** — created in **Oakwood's name/company from the start**. Client owns code (repo transferred) and every account.
- Provide the `.env` values to the client securely; document each variable.
- Deploy to production, run the M9 smoke test, and give a short walkthrough.
- Managed hosting (£50/mo) covers ongoing hosting, SSL, and upkeep; client can self-host at any time since they own everything.
- 14-day post-delivery bug-fix window applies from handover.

---

*End of build spec. Treat Sections 3, 4, 11, and 16 as immutable contracts across all Ruflo work streams; everything else is implementation latitude.*
