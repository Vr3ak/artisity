-- One priced service per category an artist offers.
create table public.services (
  artist_id uuid not null references public.profiles (id) on delete cascade,
  category public.art_category not null,
  currency text not null default 'USD' check (currency in ('USD', 'KHR')),
  price_min integer not null check (price_min >= 0),
  price_max integer not null check (price_max >= price_min),
  primary key (artist_id, category)
);

alter table public.services enable row level security;

create policy "services: select all" on public.services
  for select to anon, authenticated
  using (true);

create policy "services: insert own" on public.services
  for insert to authenticated
  with check ((select auth.uid()) = artist_id);

create policy "services: update own" on public.services
  for update to authenticated
  using ((select auth.uid()) = artist_id)
  with check ((select auth.uid()) = artist_id);

create policy "services: delete own" on public.services
  for delete to authenticated
  using ((select auth.uid()) = artist_id);

revoke all on public.services from anon, authenticated;
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
