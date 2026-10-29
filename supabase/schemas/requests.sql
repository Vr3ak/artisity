create type public.request_status as enum (
  'pending', 'accepted', 'declined', 'cancelled', 'delivered', 'completed'
);

-- A commission request from a client to an artist. Only status changes after creation.
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.profiles (id) on delete cascade,
  category public.art_category not null,
  brief text not null check (char_length(brief) between 1 and 2000),
  budget integer check (budget >= 0),
  currency text not null default 'USD' check (currency in ('USD', 'KHR')),
  deadline date,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (client_id <> artist_id)
);

create index requests_client_id_idx on public.requests (client_id);
create index requests_artist_id_idx on public.requests (artist_id);

alter table public.requests enable row level security;

create policy "requests: select participant" on public.requests
  for select to authenticated
  using ((select auth.uid()) in (client_id, artist_id));

create policy "requests: insert own" on public.requests
  for insert to authenticated
  with check (
    (select auth.uid()) = client_id
    and status = 'pending'
    and private.is_artist(artist_id)
  );

-- Which transitions each side may make is enforced by private.check_request_transition.
create policy "requests: update participant" on public.requests
  for update to authenticated
  using ((select auth.uid()) in (client_id, artist_id))
  with check ((select auth.uid()) in (client_id, artist_id));

revoke all on public.requests from anon, authenticated;
grant select, insert on public.requests to authenticated;
grant update (status) on public.requests to authenticated;

create function private.check_request_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  step text := old.status || '>' || new.status;
begin
  if new.status is distinct from old.status and not (
    (actor = old.artist_id and step in ('pending>accepted', 'pending>declined', 'accepted>delivered', 'accepted>cancelled'))
    or (actor = old.client_id and step in ('pending>cancelled', 'delivered>completed', 'accepted>cancelled'))
  ) then
    raise exception 'Cannot change request from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.check_request_transition() from public, anon;

create trigger on_request_updated
  before update on public.requests
  for each row execute function private.check_request_transition();
