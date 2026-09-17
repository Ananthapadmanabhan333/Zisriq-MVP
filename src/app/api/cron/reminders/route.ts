import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { describeDueDate, todayIst } from "@/lib/dates";
import { serverEnv } from "@/server/env";
import { createAdminClient } from "@/server/db/admin";
import { reminderEmail, sendEmail } from "@/server/services/email";
import { issuePortalToken } from "@/server/services/portal-tokens";
import {
  dueReminders,
  planReminders,
  shouldChase,
  type CadenceSettings,
} from "@/server/services/reminders";

/**
 * Sends client reminders. Triggered by Vercel Cron, once a day.
 *
 * Runs with the service role and acts across every firm at once, which is one of
 * the three sanctioned reasons to bypass RLS. There is no user session to scope
 * it, so the scoping is structural: every query carries the firm id from the row
 * being processed.
 *
 * Deliberately idempotent. A reminder row is inserted with a unique
 * (request, type, sequence_no), so re-running the cron — or catching up after a
 * missed day — sends each nudge once rather than once per attempt.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Constant-time compare so the secret cannot be recovered by timing. */
function authorised(request: NextRequest): boolean {
  const expected = serverEnv.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    // 404 rather than 401: an unauthenticated caller learns nothing about
    // whether this endpoint exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const today = todayIst();

  const { data: requests, error } = await admin
    .from("requests")
    .select(
      `id, firm_id, title, period_label, status, due_date, sent_at,
       clients(name, contact_email),
       firms(name, reminder_follow_up_days, reminder_overdue_every_days, reminder_overdue_cap),
       request_items(id, status, documents(id))`,
    )
    .not("status", "in", "(completed,cancelled)")
    .not("sent_at", "is", null);

  if (error) {
    return NextResponse.json({ error: "Could not load requests" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of requests ?? []) {
    const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    const firm = Array.isArray(row.firms) ? row.firms[0] : row.firms;

    // No address means no reminder. This is normal, not an error: a firm may
    // track a client they contact by phone.
    if (!client?.contact_email || !firm) {
      skipped++;
      continue;
    }

    const items = row.request_items ?? [];
    const outstanding = items.filter((item) => (item.documents ?? []).length === 0).length;

    if (!shouldChase({ status: row.status, outstandingItems: outstanding })) {
      skipped++;
      continue;
    }

    const cadence: CadenceSettings = {
      followUpDays: firm.reminder_follow_up_days ?? [3, 7],
      overdueEveryDays: firm.reminder_overdue_every_days ?? 3,
      overdueCap: firm.reminder_overdue_cap ?? 5,
    };

    const plan = planReminders({
      sentOn: row.sent_at ? row.sent_at.slice(0, 10) : null,
      dueDate: row.due_date,
      cadence,
    });

    const due = dueReminders(plan, today);
    if (due.length === 0) {
      skipped++;
      continue;
    }

    // Only the most recent outstanding nudge is worth sending. If three are due
    // because the cron was down, the client should get one email, not three.
    const latest = due[due.length - 1];

    const { data: alreadySent } = await admin
      .from("reminders")
      .select("id")
      .eq("request_id", row.id)
      .eq("type", latest.type)
      .eq("sequence_no", latest.sequenceNo)
      .maybeSingle();

    if (alreadySent) {
      skipped++;
      continue;
    }

    const { data: reminder, error: insertError } = await admin
      .from("reminders")
      .insert({
        firm_id: row.firm_id,
        request_id: row.id,
        type: latest.type,
        sequence_no: latest.sequenceNo,
        scheduled_for: latest.scheduledFor,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (insertError || !reminder) {
      failed++;
      continue;
    }

    try {
      // A fresh link per reminder, which also revokes the previous one. The
      // client always has exactly one working link: the one in the newest email.
      const { token } = await issuePortalToken({
        firmId: row.firm_id,
        requestId: row.id,
        createdBy: row.firm_id, // system-issued; no acting user
        ttlDays: 30,
      });

      const message = reminderEmail({
        firmName: firm.name,
        clientName: client.name,
        requestTitle: row.title,
        periodLabel: row.period_label,
        outstandingCount: outstanding,
        dueLabel: describeDueDate(row.due_date, today).label,
        portalUrl: `${serverEnv.APP_URL}/p/${token}`,
        tone: latest.type === "staff_digest" ? "follow_up" : latest.type,
      });

      const result = await sendEmail({ ...message, to: client.contact_email });

      await admin
        .from("reminders")
        .update(
          result.ok
            ? { status: "sent", sent_at: new Date().toISOString() }
            : { status: "failed", error: result.error.slice(0, 500) },
        )
        .eq("id", reminder.id);

      if (result.ok) {
        sent++;
        await admin.from("activity_events").insert({
          firm_id: row.firm_id,
          verb: "reminder.sent",
          target_type: "request",
          target_id: row.id,
          metadata: { label: client.name, type: latest.type },
        });
      } else {
        failed++;
      }
    } catch (sendError) {
      // One firm's failure must never stop the rest of the queue.
      failed++;
      await admin
        .from("reminders")
        .update({
          status: "failed",
          error: sendError instanceof Error ? sendError.message.slice(0, 500) : "unknown",
        })
        .eq("id", reminder.id);
    }
  }

  return NextResponse.json({ ok: true, today, sent, skipped, failed });
}
