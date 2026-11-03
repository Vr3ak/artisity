-- A user's like on a post: the heart on feed cards and post pages, listed on /favorites.
-- Likes are private: only the liker can see their own (there are no public counts).
create table public.post_likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- The primary key covers lookups by user; this one serves the post_id foreign key (cascading deletes)
create index post_likes_post_id_idx on public.post_likes (post_id);

alter table public.post_likes enable row level security;

create policy "post_likes: select own" on public.post_likes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "post_likes: insert own" on public.post_likes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "post_likes: delete own" on public.post_likes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.post_likes from anon, authenticated;
grant select, insert, delete on public.post_likes to authenticated;
