# Ruflo — Claude Code Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to user commits unless this project's `.claude/settings.json` has `attribution.commit` set (#2078). The Claude Code Bash tool may suggest one in its default commit-message template — ignore it. `Co-Authored-By` is semantic authorship attribution under git/GitHub convention; the tool is the facilitator, not a co-author.
- Keep files under 500 lines
- Validate input at system boundaries

## Agent Comms (SendMessage-First Coordination)

Named agents coordinate via `SendMessage`, not polling or shared state.

```
Lead (you) ←→ architect ←→ developer ←→ tester ←→ reviewer
              (named agents message each other directly)
```

### Spawning a Coordinated Team

```javascript
// ALL agents in ONE message, each knows WHO to message next
Agent({ prompt: "Research the codebase. SendMessage findings to 'architect'.",
  subagent_type: "researcher", name: "researcher", run_in_background: true })
Agent({ prompt: "Wait for 'researcher'. Design solution. SendMessage to 'coder'.",
  subagent_type: "system-architect", name: "architect", run_in_background: true })
Agent({ prompt: "Wait for 'architect'. Implement it. SendMessage to 'tester'.",
  subagent_type: "coder", name: "coder", run_in_background: true })
Agent({ prompt: "Wait for 'coder'. Write tests. SendMessage results to 'reviewer'.",
  subagent_type: "tester", name: "tester", run_in_background: true })
Agent({ prompt: "Wait for 'tester'. Review code quality and security.",
  subagent_type: "reviewer", name: "reviewer", run_in_background: true })

// Kick off the pipeline
SendMessage({ to: "researcher", summary: "Start", message: "[task context]" })
```

### Patterns

| Pattern | Flow | Use When |
|---------|------|----------|
| **Pipeline** | A → B → C → D | Sequential dependencies (feature dev) |
| **Fan-out** | Lead → A, B, C → Lead | Independent parallel work (research) |
| **Supervisor** | Lead ↔ workers | Ongoing coordination (complex refactor) |

### Rules

- ALWAYS name agents — `name: "role"` makes them addressable
- ALWAYS include comms instructions in prompts — who to message, what to send
- Spawn ALL agents in ONE message with `run_in_background: true`
- After spawning: STOP, tell user what's running, wait for results
- NEVER poll status — agents message back or complete automatically

## Swarm & Routing

### Config
- **Topology**: hierarchical-mesh (anti-drift)
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

### Agent Routing

| Task | Agents | Topology |
|------|--------|----------|
| Bug Fix | researcher, coder, tester | hierarchical |
| Feature | architect, coder, tester, reviewer | hierarchical |
| Refactor | architect, coder, reviewer | hierarchical |
| Performance | perf-engineer, coder | hierarchical |
| Security | security-architect, auditor | hierarchical |

### When to Swarm
- **YES**: 3+ files, new features, cross-module refactoring, API changes, security, performance
- **NO**: single file edits, 1-2 line fixes, docs updates, config changes, questions

### 3-Tier Model Routing

| Tier | Handler | Use Cases |
|------|---------|-----------|
| 1 | Agent Booster (WASM) | Simple transforms — skip LLM, use Edit directly |
| 2 | Haiku | Simple tasks, low complexity |
| 3 | Sonnet/Opus | Architecture, security, complex reasoning |

## Memory & Learning

### Before Any Task
```bash
npx @claude-flow/cli@latest memory search --query "[task keywords]" --namespace patterns
npx @claude-flow/cli@latest hooks route --task "[task description]"
```

### After Success
```bash
npx @claude-flow/cli@latest memory store --namespace patterns --key "[name]" --value "[what worked]"
npx @claude-flow/cli@latest hooks post-task --task-id "[id]" --success true --store-results true
```

### MCP Tools (use `ToolSearch("keyword")` to discover)

| Category | Key Tools |
|----------|-----------|
| **Memory** | `memory_store`, `memory_search`, `memory_search_unified` |
| **Bridge** | `memory_import_claude`, `memory_bridge_status` |
| **Swarm** | `swarm_init`, `swarm_status`, `swarm_health` |
| **Agents** | `agent_spawn`, `agent_list`, `agent_status` |
| **Hooks** | `hooks_route`, `hooks_post-task`, `hooks_worker-dispatch` |
| **Security** | `aidefence_scan`, `aidefence_is_safe`, `aidefence_has_pii` |
| **Hive-Mind** | `hive-mind_init`, `hive-mind_consensus`, `hive-mind_spawn` |

### Background Workers

| Worker | When |
|--------|------|
| `audit` | After security changes |
| `optimize` | After performance work |
| `testgaps` | After adding features |
| `map` | Every 5+ file changes |
| `document` | After API changes |

```bash
npx @claude-flow/cli@latest hooks worker dispatch --trigger audit
```

## Agents

**Core**: `coder`, `reviewer`, `tester`, `planner`, `researcher`
**Architecture**: `system-architect`, `backend-dev`, `mobile-dev`
**Security**: `security-architect`, `security-auditor`
**Performance**: `performance-engineer`, `perf-analyzer`
**Coordination**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`
**GitHub**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

Any string works as a custom agent type.

## Build & Test

- ALWAYS run tests after code changes
- ALWAYS verify build succeeds before committing

```bash
npm run build && npm test
```

## CLI Quick Reference

```bash
npx @claude-flow/cli@latest init --wizard           # Setup
npx @claude-flow/cli@latest swarm init --v3-mode     # Start swarm
npx @claude-flow/cli@latest memory search --query "" # Vector search
npx @claude-flow/cli@latest hooks route --task ""    # Route to agent
npx @claude-flow/cli@latest doctor --fix             # Diagnostics
npx @claude-flow/cli@latest security scan            # Security scan
npx @claude-flow/cli@latest performance benchmark    # Benchmarks
```

26 commands, 140+ subcommands. Use `--help` on any command for details.

## Setup

```bash
claude mcp add claude-flow -- npx -y ruflo@latest mcp start
npx ruflo@latest doctor --fix
```

> The background `daemon` is optional. It runs interval workers that each spawn
> a headless `claude` session, so it consumes tokens continuously. Start it only
> if you want those sweeps: `npx ruflo@latest daemon start` (self-stops after 12h
> by default; `--ttl 0` to disable, `daemon status --all` to audit running daemons).

**Agent tool** handles execution (agents, files, code, git). **MCP tools** handle coordination (swarm, memory, hooks). **CLI** is the same via Bash.

# CLAUDE.md — Oakwood Maintenance Request System

**Source of truth: `/docs/build-spec.md`.** The spec wins on any conflict. Read the
relevant spec sections before starting a milestone; before changing anything in
§§3, 4, 11, or 16, stop and ask.

# --- OAKWOOD PROJECT-SPECIFIC RULES ---

## 1. Project Stack (Spec §2) — use these, don't substitute
- Framework: Next.js (App Router), TypeScript, Node 20+
- Styling/UI: Tailwind CSS + shadcn/ui (components live in-repo)
- DB / ORM: PostgreSQL (Neon or Supabase) + Prisma (schema + migrations + seed)
- Auth: Auth.js v5 (NextAuth), Credentials provider; passwords hashed with argon2id
- File storage: S3-compatible object storage (Cloudflare R2 or AWS S3); presigned
  uploads; store only the object key in the DB
- Email: Resend (or SMTP) behind a single `sendEmail()` module
- Validation: Zod, shared client + server
- Hosting: Vercel
> Don't reach for a different framework, ORM, auth library, or styling system. If a
> swap seems warranted, ask first — the data model, enums, routes, email behaviour,
> and acceptance criteria stay fixed regardless of stack.

## 2. Immutable Contracts (Spec §§3, 4, 11, 16) — do not modify without consent
Treat the names/values below as canonical (the spec says do not paraphrase):
- **Enums (exact):**
  - `Category`: PLUMBING | ELECTRICAL | HEATING_BOILER | GENERAL
  - `TicketStatus`: NEW | IN_PROGRESS | ASSIGNED_TO_CONTRACTOR | RESOLVED
  - `Role`: STAFF only — no tiers
- **`reference`** is a unique monotonic integer starting at **1001**, assigned at
  creation, displayed `#1001`, never reused.
- **`propertyAddressSnapshot`** is copied from the property at submission. Always
  display the snapshot on a ticket, never the live property record — archiving or
  editing a property must never alter historical tickets.
- **Properties soft-archive** (`archived = true`); never hard-delete. Tenant dropdown
  + filters show `archived = false` only.
- **`internalNotes`** is ONE mutable text field, not an append log / thread.
- **Resolved transition:** set `resolvedAt = now()` only when
  `previousStatus !== RESOLVED && newStatus === RESOLVED`. That same transition fires
  the tenant resolution email exactly once — never resend on re-toggle.
- **Exactly three emails exist:** team alert on create, tenant confirmation on
  create, tenant resolution on resolve. No other notification fires for any other
  status change, internal note, or contractor assignment. Sends are post-commit and
  non-blocking — a provider failure is caught and logged and must never lose the ticket.
- Don't change field names, enum values, relationships, or the §11 route contract
  without updating `/docs/build-spec.md` first.

## 3. DO-NOT-BUILD LIST (Spec §13)
Explicitly out of scope. If tempted to add any of these "for completeness," stop:
- Contractor logins, a contractor portal, or any third user role
- Native mobile apps (iOS/Android)
- Tenant accounts, passwords, or logins
- Automated tenant updates between submission and resolution (only the 3 emails exist)
- SMS, WhatsApp, or push notifications
- Migration/import of historical tickets — production starts clean
- Integrations with external/third-party systems
- Permission tiers, approval flows, or restricted views
- Penetration testing or security certifications

## 4. Security & Safety Rules (Spec §§7, 12)
- Zod-validate every input, client AND server. Never trust the client.
- Never use `dangerouslySetInnerHTML` for tenant- or staff-entered content.
- Enforce file rules server-side: single JPEG/PNG, ≤10 MB; randomise stored filenames.
- All config via environment variables; nothing committed; no secrets/passwords in logs.
- Guard every `/api/staff/*` route and protected page with a session check, in
  middleware AND per-handler (defence in depth).

## 5. House Coding Conventions
- Prefer explicit TypeScript typing; no `any`.
- Keep business logic in service modules, not inline in Next.js page/route files.
- Follow the build order in Spec §14: finish M0 (scaffold) and M1 (data layer) before
  feature streams; after M1, streams A/B/C can run in parallel.
- Run `tsc --noEmit` and `npm run lint`, and make them pass, before marking any
  engineering task complete.