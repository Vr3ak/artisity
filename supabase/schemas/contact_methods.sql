-- Contact handles. Artists' are public (shown on their profile); clients' are visible only to
-- the owner and to people they share a commission request with.
create table public.contact_methods (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  telegram text check (telegram ~ '^[A-Za-z0-9_]{5,32}$'),
  -- username, profile.php?id= (accounts without one), or an app share link; mirrors CONTACTS in components/profile-fields.tsx
  facebook text check (facebook ~ '^([A-Za-z0-9.]{5,50}|profile\.php\?id=[0-9]{1,20}|share/([a-z]/)?[A-Za-z0-9]{1,30}|people/[A-Za-z0-9._%-]{1,100}/[0-9]{1,20})$'),
  instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  -- Typed by the user: Facebook links don't carry a name we can show (and FB has no public lookup)
  facebook_name text check (char_length(facebook_name) between 1 and 80)
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

-- anon sees only artist profiles, so this subquery is limited to artists for both roles.
-- ponytail: separate from the policy above (advisor warns) because anon can't read requests;
-- fine at one row per user
create policy "contact_methods: select artist" on public.contact_methods
  for select to anon, authenticated
  using (exists (select 1 from public.profiles p where p.id = contact_methods.user_id and p.role = 'artist'));

create policy "contact_methods: insert own" on public.contact_methods
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "contact_methods: update own" on public.contact_methods
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.contact_methods from anon, authenticated;
grant select on public.contact_methods to anon;
grant select, insert, update on public.contact_methods to authenticated;
