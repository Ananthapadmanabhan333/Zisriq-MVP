-- =============================================================================
-- Status vocabulary.
--
-- requested -> awaiting_client -> received -> under_review -> completed
-- plus `cancelled` as a terminal state.
--
-- `overdue` is deliberately NOT a member: it is derived at read time from
-- due_date vs today in Asia/Kolkata. Storing it would destroy the underlying
-- state and leave no defined way back. See DECISIONS.md D-007.
-- =============================================================================
create type public.zq_status as enum (
  'requested',
  'awaiting_client',
  'received',
  'under_review',
  'completed',
  'cancelled'
);

create type public.zq_role as enum ('admin', 'accountant', 'staff');

create type public.zq_client_type as enum (
  'individual',
  'proprietorship',
  'partnership',
  'company'
);

-- Review outcome for a single uploaded file. Distinct from zq_status because a
-- document is approved/rejected, whereas an item or request moves through a
-- workflow. See DECISIONS.md and CLAUDE.md.
create type public.zq_doc_review as enum (
  'pending',
  'approved',
  'rejected',
  'resupply_requested'
);

create type public.zq_reminder_type as enum (
  'initial',
  'follow_up',
  'overdue',
  'staff_digest'
);

create type public.zq_reminder_status as enum ('scheduled', 'sent', 'failed', 'skipped');
