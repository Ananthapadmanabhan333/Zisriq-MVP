-- =============================================================================
-- Append-only audit trail.
--
-- "Append-only" is enforced structurally: the table has a SELECT policy and an
-- INSERT policy, and deliberately NO update or delete policy. Under RLS, the
-- absence of a policy is a denial -- so not even a firm admin can rewrite history
-- through the API.
-- =============================================================================

create table public.activity_events (
  id bigint generated always as identity primary key,
  firm_id uuid not null references public.firms(id) on delete cascade,

  -- Actor is either a staff user or a client acting through a portal token.
  -- Both null means the system acted (e.g. the reminder cron).
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_token_id uuid references public.portal_tokens(id) on delete set null,

  verb text not null check (length(verb) between 1 and 60),
  target_type text not null check (length(target_type) between 1 and 60),
  target_id uuid,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint at_most_one_actor check (
    num_nonnulls(actor_user_id, actor_token_id) <= 1
  )
);

create index activity_events_firm_idx on public.activity_events (firm_id, created_at desc);
create index activity_events_target_idx on public.activity_events (target_type, target_id, created_at desc);

comment on table public.activity_events is
  'Append-only. No UPDATE or DELETE policy exists by design; do not add one.';
