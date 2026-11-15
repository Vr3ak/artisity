-- A client's star rating of an artist, one per completed commission request. Public; shown on the
-- artist's profile (Reviews tab) and as the average on /artists. The reviewer stays anonymous on the
-- page ("Verified client"), since client profiles are private.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  -- Nulled (review kept) if the request goes away with the client's account
  request_id uuid unique references public.requests (id) on delete set null,
  artist_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid default auth.uid() references public.profiles (id) on delete set null,
  -- Copied from the request (checked on insert) so the public review can say what was commissioned
  category public.art_category not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create index reviews_artist_id_idx on public.reviews (artist_id, created_at desc);
create index reviews_client_id_idx on public.reviews (client_id);

alter table public.reviews enable row level security;

create policy "reviews: select all" on public.reviews
  for select to anon, authenticated
  using (true);

-- Only the client of a completed request, and the artist/category must match that request
create policy "reviews: insert own completed request" on public.reviews
  for insert to authenticated
  with check (
    (select auth.uid()) = client_id
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and r.client_id = (select auth.uid())
        and r.artist_id = reviews.artist_id
        and r.category = reviews.category
        and r.status = 'completed'
    )
  );

create policy "reviews: update own" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = client_id)
  with check ((select auth.uid()) = client_id);

create policy "reviews: delete own" on public.reviews
  for delete to authenticated
  using ((select auth.uid()) = client_id);

revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to anon;
grant select, delete on public.reviews to authenticated;
-- client_id comes from its auth.uid() default; only the rating and comment can change later
grant insert (request_id, artist_id, category, rating, comment) on public.reviews to authenticated;
grant update (rating, comment) on public.reviews to authenticated;
