-- Either side can block the other. A block stops new conversations, messages and requests
-- between the pair in both directions (see the insert policies that call private.is_blocked).
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_id_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- Users see only their own blocks; the blocked person isn't told.
create policy "blocks: select own" on public.blocks
  for select to authenticated
  using ((select auth.uid()) = blocker_id);

create policy "blocks: insert own" on public.blocks
  for insert to authenticated
  with check ((select auth.uid()) = blocker_id);

create policy "blocks: delete own" on public.blocks
  for delete to authenticated
  using ((select auth.uid()) = blocker_id);

revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;

-- Security definer: the blocked side can't read the blocker's row through RLS.
create function private.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

revoke execute on function private.is_blocked(uuid, uuid) from public, anon;
grant execute on function private.is_blocked(uuid, uuid) to authenticated;

-- Mirrored in lib/options.ts REPORT_REASONS
create type public.report_reason as enum (
  'spam', 'harassment', 'scam', 'inappropriate', 'impersonation', 'ai_generated', 'other'
);

-- User reports for staff review on /staff. Reports outlive the reporter's account.
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text not null default '' check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (reporter_id <> reported_id)
);

create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_reported_id_idx on public.reports (reported_id);

alter table public.reports enable row level security;

create policy "reports: select own or staff" on public.reports
  for select to authenticated
  using ((select auth.uid()) = reporter_id or (select private.is_admin()));

create policy "reports: insert own" on public.reports
  for insert to authenticated
  with check ((select auth.uid()) = reporter_id and resolved_at is null);

create policy "reports: update staff" on public.reports
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

revoke all on public.reports from anon, authenticated;
grant select, insert on public.reports to authenticated;
grant update (resolved_at) on public.reports to authenticated;
