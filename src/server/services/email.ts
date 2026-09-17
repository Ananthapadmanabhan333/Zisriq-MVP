import "server-only";

import { serverEnv } from "@/server/env";

/**
 * Transactional email through Resend.
 *
 * Sending is best-effort by design: a reminder that fails to send is recorded as
 * `failed` and retried on the next run, and never blocks the cron from
 * processing the rest of the queue. One firm's bounced address must not stop
 * every other firm's reminders.
 *
 * When RESEND_API_KEY is absent — which is the normal state in local development
 * — this logs instead of sending. Silently pretending to send would make the
 * reminder engine untestable; throwing would make local development require a
 * real email provider.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain text alongside HTML: some clients strip HTML, and it aids deliverability. */
  text: string;
  html: string;
};

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!serverEnv.RESEND_API_KEY || !serverEnv.EMAIL_FROM) {
    console.info(`[email] not configured — would send "${message.subject}" to ${message.to}`);
    return { ok: true, id: null };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      // Without a timeout a hung provider stalls the whole cron run.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `Resend returned ${response.status}: ${body.slice(0, 200)}` };
    }

    const payload = (await response.json()) as { id?: string };
    return { ok: true, id: payload.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown send failure" };
  }
}

/** Minimal escaping for values interpolated into the HTML body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ReminderEmailParams = {
  firmName: string;
  clientName: string;
  requestTitle: string;
  periodLabel: string;
  outstandingCount: number;
  dueLabel: string;
  portalUrl: string;
  tone: "initial" | "follow_up" | "overdue";
};

/**
 * The client-facing reminder.
 *
 * Written to be read on a phone by someone who is not an accountant: no jargon,
 * one action, and the outstanding count up front so they know how much work it
 * is before they tap.
 */
export function reminderEmail(params: ReminderEmailParams): EmailMessage {
  const {
    firmName,
    clientName,
    requestTitle,
    periodLabel,
    outstandingCount,
    dueLabel,
    portalUrl,
    tone,
  } = params;

  const noun = outstandingCount === 1 ? "document" : "documents";

  const subject =
    tone === "overdue"
      ? `Overdue: ${outstandingCount} ${noun} for ${requestTitle}`
      : tone === "initial"
        ? `${firmName} needs ${outstandingCount} ${noun} from you`
        : `Reminder: ${outstandingCount} ${noun} still needed`;

  const opening =
    tone === "overdue"
      ? `This was due ${dueLabel.toLowerCase()}, and we still need ${outstandingCount} ${noun} from you.`
      : tone === "initial"
        ? `${firmName} needs ${outstandingCount} ${noun} from you for ${requestTitle} (${periodLabel}).`
        : `A quick reminder that ${outstandingCount} ${noun} ${outstandingCount === 1 ? "is" : "are"} still needed for ${requestTitle}.`;

  const text = [
    `Hello ${clientName},`,
    "",
    opening,
    "",
    "You can upload them here — no login needed:",
    portalUrl,
    "",
    dueLabel,
    "",
    `— ${firmName}`,
    "",
    "This link is personal to you. Please do not forward it.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 16px;font-size:16px;">Hello ${escapeHtml(clientName)},</p>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.55;">${escapeHtml(opening)}</p>
        <p style="margin:0 0 28px;">
          <a href="${escapeHtml(portalUrl)}"
             style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600;font-size:15px;">
            Upload your ${escapeHtml(noun)}
          </a>
        </p>
        <p style="margin:0 0 8px;font-size:14px;color:#57534e;">${escapeHtml(dueLabel)}</p>
        <p style="margin:24px 0 0;font-size:14px;color:#57534e;">— ${escapeHtml(firmName)}</p>
        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;">
          This link is personal to you. Please do not forward it.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { to: "", subject, text, html };
}
