-- An artist's showcase post: 1-10 images with a title and caption, shown in the home feed,
-- on their profile and at /posts/[id].
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Path in the public profile-images bucket; the app builds the URL, so posts can't point off-site
  image_path text not null,
  -- Image 0 is image_path (the cover); image i > 0 is image_path || '-' || i (postImagePaths in lib/utils.ts)
  image_count smallint not null default 1 check (image_count between 1 and 10),
  title text not null check (char_length(title) between 1 and 100),
  caption text not null default '' check (char_length(caption) <= 2000),
  category public.art_category,
  created_at timestamptz not null default now(),
  check (image_path = artist_id::text || '/posts/' || id::text)
);

create index posts_artist_id_idx on public.posts (artist_id);
create index posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

create policy "posts: select all" on public.posts
  for select to anon, authenticated
  using (true);

create policy "posts: insert own artist" on public.posts
  for insert to authenticated
  with check ((select auth.uid()) = artist_id and private.is_artist(artist_id));

create policy "posts: delete own" on public.posts
  for delete to authenticated
  using ((select auth.uid()) = artist_id);

-- ponytail: no update grant; delete and repost to change a post
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon;
grant select, insert, delete on public.posts to authenticated;
