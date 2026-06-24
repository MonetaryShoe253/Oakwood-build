/**
 * Transactional email module (build-spec §10).
 *
 * Single `sendEmail()` entry point so the provider (Resend here) is swappable.
 * Exactly three emails exist in the product (team alert + tenant confirmation
 * on create, tenant resolution on resolve); their content lives in
 * `services/notifications.ts`. Sends are post-commit and non-blocking — a
 * provider failure is caught, logged, and never loses the ticket.
 *
 * Includes a single retry on failure. When `RESEND_API_KEY` is unset (local /
 * demo per §15), this no-ops and logs instead of sending, so no real mail fires.
 */
import { Resend } from "resend";

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

const DEFAULT_FROM =
  "Oakwood Property Management <maintenance@oakwoodpm.co.uk>";

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — skipping "${params.subject}" to ${params.to}`,
    );
    return { sent: false };
  }

  const from = process.env.FROM_EMAIL ?? DEFAULT_FROM;
  const resend = new Resend(apiKey);

  // Send with a single retry on transient failure (§10).
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        text: params.body,
        replyTo: params.replyTo,
      });
      if (error) throw new Error(error.message);
      return { sent: true, id: data?.id };
    } catch (err) {
      if (attempt === 2) {
        console.error(
          `[email] failed to send "${params.subject}" to ${params.to} after retry:`,
          err,
        );
        return { sent: false };
      }
    }
  }
  return { sent: false };
}
