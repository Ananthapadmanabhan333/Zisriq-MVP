import { CirclePlus, Mail, Upload, UserCheck } from "lucide-react";

import type { ActivityEntry } from "@/components/dashboard/activity-feed";
import type { AttentionRow } from "@/components/dashboard/attention-list";
import type { ProgressSegment } from "@/components/dashboard/collection-progress";

/**
 * Fixed sample data for the design reference. NOT fixtures, NOT seed data --
 * nothing here touches the database.
 *
 * The figures are internally consistent, which the source mockup's were not:
 * it showed 128 total requests alongside 74 awaiting + 19 overdue + 86
 * completed (179), and a donut summing to 210. That happens if "overdue" is
 * treated as its own bucket. In this schema it is not a status at all -- it is
 * derived from the due date, so an overdue request is simultaneously awaiting
 * the client. Adding the two double-counts every late request.
 *
 * Here the four statuses are mutually exclusive and sum to the total, and
 * overdue is shown as a carve-out of "awaiting client".
 */
export const TOTAL_REQUESTS = 128;
export const COMPLETED = 52;
export const UNDER_REVIEW = 31;
export const RECEIVED = 12;
export const AWAITING_CLIENT = 33;
export const OVERDUE = 19; // subset of AWAITING_CLIENT

/** Documents are in hand for everything except those still awaiting a client. */
export const COLLECTED_PERCENT = Math.round(
  ((TOTAL_REQUESTS - AWAITING_CLIENT) / TOTAL_REQUESTS) * 100,
);

export const progressSegments: ProgressSegment[] = [
  { label: "Completed", count: COMPLETED, color: "var(--received)" },
  { label: "Under review", count: UNDER_REVIEW, color: "var(--review)" },
  { label: "Received", count: RECEIVED, color: "var(--chart-5)" },
  { label: "Awaiting client", count: AWAITING_CLIENT, color: "var(--awaiting)" },
  { label: "overdue", count: OVERDUE, color: "var(--overdue)", subset: true },
];

export const attentionRows: AttentionRow[] = [
  {
    id: "req-rahul-itr",
    clientName: "Rahul Sharma",
    templateName: "ITR — Salaried",
    periodLabel: "FY 2024–25",
    collected: 8,
    total: 12,
    dueLabel: "6 days overdue",
    urgency: "overdue",
  },
  {
    id: "req-priya-itr",
    clientName: "Priya Nair",
    templateName: "ITR — Salaried",
    periodLabel: "FY 2024–25",
    collected: 10,
    total: 12,
    dueLabel: "Due tomorrow",
    urgency: "due-soon",
  },
  {
    id: "req-abc-gst",
    clientName: "ABC Pvt Ltd",
    templateName: "GST Documents",
    periodLabel: "Jul 2024",
    collected: 5,
    total: 9,
    dueLabel: "Due today",
    urgency: "due-today",
  },
];

export const activityEntries: ActivityEntry[] = [
  {
    id: "act-1",
    icon: Upload,
    subject: "Rahul Sharma",
    verb: "uploaded",
    object: "Bank Statement.pdf",
    timeAgo: "10 minutes ago",
  },
  {
    id: "act-2",
    icon: Mail,
    subject: "Reminder",
    verb: "sent to",
    object: "Priya Nair",
    timeAgo: "32 minutes ago",
  },
  {
    id: "act-3",
    icon: UserCheck,
    subject: "ABC Pvt Ltd",
    verb: "marked as",
    object: "Under Review",
    timeAgo: "1 hour ago",
  },
  {
    id: "act-4",
    icon: CirclePlus,
    subject: "New request",
    verb: "created for",
    object: "Karthik Reddy",
    timeAgo: "2 hours ago",
  },
];

export const clientTrend = [14, 22, 18, 31];
