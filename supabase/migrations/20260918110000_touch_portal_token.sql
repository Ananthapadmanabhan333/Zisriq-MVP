-- Records that a portal link was used.
--
-- A plain UPDATE from the application would need a read-modify-write to
-- increment use_count, which races when a client opens the link in two tabs.
-- Doing it in one statement keeps the count honest, and keeping it in a function
-- means the portal route never needs UPDATE rights on the table.

create or replace function public.touch_portal_token(p_token_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.portal_tokens
     set last_used_at = now(),
         use_count = use_count + 1
   where id = p_token_id
     and revoked_at is null
     and expires_at > now();
$$;

comment on function public.touch_portal_token(uuid) is
  'Marks a portal token as used. No-op for revoked or expired tokens.';

-- Callable only by the service role, which is the only thing that ever resolves
-- a token. Leaving this executable by anon would let anyone bump the counters.
revoke all on function public.touch_portal_token(uuid) from public;
revoke all on function public.touch_portal_token(uuid) from anon;
revoke all on function public.touch_portal_token(uuid) from authenticated;
