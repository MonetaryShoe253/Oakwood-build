/**
 * Transactional email module (Milestone 0 stub).
 *
 * Per build-spec §10, all email goes through this single `sendEmail()` entry
 * point so the provider (Resend / SMTP) is swappable. Exactly three emails
 * exist in the product (team alert + tenant confirmation on create, tenant
 * resolution on resolve); those callers are wired in M7. Sends are post-commit
 * and non-blocking — a provider failure must be caught and logged, never lose
 * the ticket.
 *
 * This is an infra placeholder: it validates nothing real and sends nothing.
 * The real provider integration (with retry-once on transient failure) lands
 * in M7.
 */

export interface SendEmailParams {
  /** Recipient address. */
  to: string;
  subject: string;
  /** Plain-text (or pre-rendered) body. */
  body: string;
  /** Optional reply-to; tenant emails set this to the team inbox. */
  replyTo?: string;
}

export interface SendEmailResult {
  /** Whether the provider accepted the message. */
  sent: boolean;
  /** Provider message id, when available. */
  id?: string;
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  // TODO(M7): integrate Resend (or SMTP) behind this function, including a
  // single retry on transient failure. See build-spec §10.
  console.warn(
    `[email:stub] sendEmail not yet implemented — would send "${params.subject}" to ${params.to}`,
  );
  return { sent: false };
}
