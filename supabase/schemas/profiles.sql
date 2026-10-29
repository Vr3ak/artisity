-- Arrays of a domain check every element, so the DB rejects non-http(s) links (e.g. javascript: URLs)
create domain public.http_url as text
  check (value ~* '^https?://' and char_length(value) <= 300);

-- null role = onboarding not finished. admin is only granted via SQL as postgres.
create type public.user_role as enum ('client', 'artist', 'admin');

-- Mirrors CATEGORIES in lib/options.ts
create type public.art_category as enum (
  'illustration', 'branding_graphic', 'model_3d_2d', 'video_animation', 'game_asset',
  'emote', 'scene_concept_art', 'streaming_asset', 'writing', 'ui_ux'
);

-- App-side user data. Identity (email, password) stays in auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  cover_url text,
  social_links public.http_url[] not null default '{}' check (cardinality(social_links) <= 5),
  role public.user_role,
  location text check (char_length(location) <= 60),
  -- artist: categories offered; client: what they're looking for
  categories public.art_category[] not null default '{}' check (cardinality(categories) <= 10),
  business_name text check (char_length(business_name) <= 100),
  business_type text check (char_length(business_type) <= 60),
  portfolio public.http_url[] not null default '{}' check (cardinality(portfolio) <= 12),
  -- Public handle for /@username URLs; null until chosen at sign-up or onboarding
  username text unique check (username ~ '^[a-z0-9_]{3,30}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Artists are the public marketplace; clients are visible only to themselves and staff.
create policy "profiles: select artists" on public.profiles
  for select to anon
  using (role = 'artist');

-- One policy per role/action (multiple permissive policies are each evaluated)
-- Conversation partners see each other (requests always come with a conversation).
create policy "profiles: select own, artists, partners, or staff" on public.profiles
  for select to authenticated
  using (
    role = 'artist'
    or (select auth.uid()) = id
    or exists (
      select 1 from public.conversations c
      where (c.client_id = (select auth.uid()) and c.artist_id = profiles.id)
         or (c.artist_id = (select auth.uid()) and c.client_id = profiles.id)
    )
    or (select private.is_admin())
  );

-- is_admin() is stable, so it sees the pre-update row: only existing admins may keep role = 'admin'.
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and (role is distinct from 'admin' or (select private.is_admin())));

-- Rows are created by the signup trigger, so no insert/delete grants.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon;
grant select, update on public.profiles to authenticated;

-- Not exposed via the Data API.
create schema private;
grant usage on schema private to authenticated;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Security definer so conversation/request policies don't recurse through the profiles select policy.
create function private.is_artist(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'artist');
$$;

revoke execute on function private.is_artist(uuid) from public, anon;
grant execute on function private.is_artist(uuid) to authenticated;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- OAuth providers send full_name/avatar_url; display only, never use for authorization
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(new.raw_user_meta_data ->> 'full_name', 100),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
