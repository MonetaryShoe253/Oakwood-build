/**
 * Public-demo mode.
 *
 * Oakwood ships with a full staff-auth wall (Auth.js v5 + argon2id, guarded in
 * middleware AND per-handler — build-spec §6/§12). This deployment runs as a
 * public portfolio demo, so that wall is intentionally relaxed: the dashboard,
 * ticket, and property pages — and the staff mutation APIs — are open, letting
 * visitors explore and edit every feature without signing in.
 *
 * The auth system is not deleted, only bypassed: `/login` still works with the
 * seeded staff credentials, and setting `DEMO_MODE=false` restores the strict
 * staff-only behaviour with no code changes.
 */
export const DEMO_MODE = process.env.DEMO_MODE !== "false";
