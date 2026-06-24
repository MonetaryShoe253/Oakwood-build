# Oakwood Maintenance — User Guide

This guide covers both audiences of the system:

- **Tenants** — anyone reporting a maintenance issue. No account needed.
- **Office staff** — Oakwood Property Management team members who manage requests.

> The live demo runs at **https://oakwood-maintenance.vercel.app**.

---

## Part 1 — For tenants

### Reporting a maintenance issue

You do **not** need an account or password. Just open the site and fill in the
form on the home page.

1. Go to the home page.
2. Complete the form:
   - **Your name** — so we know who to contact.
   - **Email** — we send confirmation and updates here.
   - **Phone** — in case we need to reach you about access.
   - **Property** — choose your address from the dropdown.
   - **Category** — Plumbing, Electrical, Heating / Boiler, or General.
   - **Describe the issue** — what's wrong and where in the property (up to 2,000
     characters).
   - **Photo (optional)** — one JPEG or PNG, up to 10 MB.
3. Press **Submit request**.

### What happens next

- You'll receive a **confirmation email** with a reference number (for example
  `#1001`). Keep this for your records.
- Our team is alerted and will review your request.
- When the work is done, you'll get **one resolution email** letting you know it's
  been marked resolved.

That's the complete set of automatic messages — a confirmation when you submit and
a notification when it's resolved. We won't email you at every step in between; if
we need more detail, a staff member will contact you directly. You can always reply
to either email to add information.

---

## Part 2 — For office staff

### Signing in

1. Go to **`/login`**.
2. Enter your staff email and password.
3. You'll land on the **Dashboard**.

All staff pages (`/dashboard`, `/tickets/…`, `/properties`) require sign-in. If
your session expires, you'll be returned to the login page and brought back to the
page you wanted afterward.

> **Demo credentials:** `mark.fletcher@oakwoodpm.co.uk` / `admin`
> (the demo password — production deployments use a strong one).

### The Dashboard

The dashboard lists maintenance tickets. Each ticket shows its reference (`#1001`),
the property address, category, status, and when it was logged. Use it to triage
incoming work and find tickets that need attention.

### Working a ticket

Open a ticket from the dashboard to see its full detail: tenant contact details,
the property address as recorded at submission, the category, the description, and
the photo if one was attached.

From the detail page you can:

- **Change the status** — move the ticket through its lifecycle (see below).
- **Edit internal notes** — a single private notepad for staff. It is **not** a
  message thread or a log: there's one notes field and editing it replaces what was
  there. The tenant never sees internal notes.

#### Ticket statuses

| Status | Meaning |
|--------|---------|
| **New** | Just submitted; not yet actioned. |
| **In progress** | Being worked on by the office. |
| **Assigned to contractor** | Handed to an external contractor. |
| **Resolved** | Work complete. |

You can move a ticket between statuses as the work progresses.

#### Resolving a ticket — important

When you set a ticket to **Resolved** for the first time:

- The system records the resolution time.
- The tenant automatically receives **one** resolution email.

This email is sent **only once**, on the first move into Resolved. If you later move
the ticket out of Resolved and back again, the tenant is **not** emailed a second
time. So only mark a ticket Resolved when the work really is complete.

### Managing properties

Open **Properties** to manage the address list that tenants choose from.

- **Add** a property to make it available in the tenant dropdown.
- **Archive** a property to remove it from the dropdown and filters. Archiving is a
  soft removal — properties are never permanently deleted.

**Archiving never changes past tickets.** Every ticket stores the property address
exactly as it was when the request was submitted, so historical records stay
accurate even after a property is archived or its details change.

---

## What the system intentionally does *not* do

By design, the following are out of scope:

- Tenant accounts or logins (tenants never sign in).
- Contractor logins or a contractor portal.
- Automatic tenant updates between submission and resolution — only the
  confirmation and resolution emails are sent.
- SMS, WhatsApp, or push notifications.
- Permission tiers — all staff have the same access.

---

## Quick reference

| I want to… | Where |
|------------|-------|
| Report an issue (tenant) | Home page form |
| Sign in (staff) | `/login` |
| See all tickets | Dashboard |
| Update a ticket / add notes | Open the ticket |
| Resolve a ticket (emails the tenant once) | Ticket → set status to Resolved |
| Add or archive a property | Properties |

For technical setup and deployment, see the project
[`README.md`](../README.md). The authoritative product specification is
[`build-spec-oakwood-maintenance.md`](build-spec-oakwood-maintenance.md).
