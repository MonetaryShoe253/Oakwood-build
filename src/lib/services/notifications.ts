/**
 * The exactly-three product emails (build-spec §10). Content lives here; the
 * transport is `sendEmail()`. Every send is wrapped so a provider failure is
 * caught and logged and never propagates — callers fire these AFTER the DB
 * commit, so a ticket is never lost to an email error (§12).
 */
import { sendEmail } from "@/lib/email";
import { categoryLabel, type CategoryValue } from "@/lib/validation/ticket";

const DEFAULT_TEAM_INBOX = "maintenance@oakwoodpm.co.uk";

function teamInbox(): string {
  return process.env.TEAM_INBOX_EMAIL ?? DEFAULT_TEAM_INBOX;
}

function appUrl(): string {
  return (process.env.APP_URL ?? "").replace(/\/+$/, "");
}

/** First ~140 characters of the description for tenant-facing summaries. */
function summarise(description: string): string {
  const trimmed = description.trim();
  return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
}

export interface NewTicketEmailData {
  id: string;
  reference: number;
  propertyAddressSnapshot: string;
  category: CategoryValue;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  description: string;
  hasPhoto: boolean;
}

/** Email 1 (team) + Email 2 (tenant), fired on ticket creation (§10). */
export async function sendNewTicketNotifications(
  data: NewTicketEmailData,
): Promise<void> {
  const label = categoryLabel(data.category);
  const team = teamInbox();

  const teamEmail = sendEmail({
    to: team,
    subject: `New maintenance request #${data.reference} — ${data.propertyAddressSnapshot}`,
    body: [
      "A new maintenance request has been logged.",
      `Ref: #${data.reference}`,
      `Property: ${data.propertyAddressSnapshot}`,
      `Category: ${label}`,
      `Tenant: ${data.tenantName} — ${data.tenantPhone} — ${data.tenantEmail}`,
      `Issue: ${data.description}`,
      `Photo: ${data.hasPhoto ? "Attached/available" : "None"}`,
      `View it in the dashboard: ${appUrl()}/tickets/${data.id}`,
    ].join("\n"),
  });

  const tenantEmail = sendEmail({
    to: data.tenantEmail,
    replyTo: team,
    subject: `We've received your maintenance request (#${data.reference})`,
    body: [
      `Hi ${data.tenantName},`,
      "Thanks for letting us know. We've received your maintenance request and our team is reviewing it.",
      `Reference: #${data.reference}`,
      `Issue: ${label} — ${summarise(data.description)}`,
      "We'll be in touch if we need anything further. If you need to add information, just reply to this email.",
      "— Oakwood Property Management",
    ].join("\n"),
  });

  // Both are independent; one failing must not stop the other.
  await Promise.allSettled([teamEmail, tenantEmail]);
}

export interface ResolutionEmailData {
  reference: number;
  category: CategoryValue;
  tenantName: string;
  tenantEmail: string;
  description: string;
}

/** Email 3 (tenant), fired once when a ticket transitions into RESOLVED (§10). */
export async function sendResolutionNotification(
  data: ResolutionEmailData,
): Promise<void> {
  const label = categoryLabel(data.category);
  await sendEmail({
    to: data.tenantEmail,
    replyTo: teamInbox(),
    subject: `Your maintenance request has been resolved (#${data.reference})`,
    body: [
      `Hi ${data.tenantName},`,
      `Your maintenance request (#${data.reference}) has been marked as resolved.`,
      `Issue: ${label} — ${summarise(data.description)}`,
      "If this isn't fully sorted, just reply to this email and we'll reopen it.",
      "— Oakwood Property Management",
    ].join("\n"),
  });
}
