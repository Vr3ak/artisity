-- A user's like on a post: the heart on feed cards and post pages, listed on /favorites.
-- Who liked what is private: only the liker can see their own rows. The total per post is public
-- (posts.like_count, kept by the trigger below).
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

-- Users can't update posts, so the like total is kept here. Row-level +1/-1 updates are atomic.
-- On a post's cascading delete the update finds no row, which is fine.
-- An artist's likes on their own posts are kept (their heart works) but not counted, so they can't
-- push themselves into the hero.
create function private.count_post_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id and artist_id <> new.user_id;
  else
    update public.posts set like_count = like_count - 1 where id = old.post_id and artist_id <> old.user_id;
  end if;
  return null;
end;
$$;

revoke execute on function private.count_post_like() from public, anon, authenticated;

create trigger on_post_like_changed
  after insert or delete on public.post_likes
  for each row execute function private.count_post_like();
