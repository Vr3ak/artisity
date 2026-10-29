-- Private contact handles, visible only to the owner and to people they share a commission request with.
create table public.contact_methods (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  telegram text check (telegram ~ '^[A-Za-z0-9_]{5,32}$'),
  facebook text check (facebook ~ '^[A-Za-z0-9.]{5,50}$'),
  instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$')
);

alter table public.contact_methods enable row level security;

create policy "contact_methods: select own or request partner" on public.contact_methods
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.requests r
      where (r.client_id = (select auth.uid()) and r.artist_id = contact_methods.user_id)
         or (r.artist_id = (select auth.uid()) and r.client_id = contact_methods.user_id)
    )
  );

create policy "contact_methods: insert own" on public.contact_methods
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "contact_methods: update own" on public.contact_methods
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.contact_methods from anon, authenticated;
grant select, insert, update on public.contact_methods to authenticated;
