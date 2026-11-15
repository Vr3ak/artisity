-- npx supabase test db --local
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- artist (a), client (b) with a completed and a pending request, stranger (c)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local');
update public.profiles set role = 'artist' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'client' where id in ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c');
insert into public.requests (id, client_id, artist_id, category, brief, status) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'illustration', 'done', 'completed'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'illustration', 'waiting', 'pending');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select throws_ok($$
  insert into public.reviews (request_id, artist_id, category, rating)
  values ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000a', 'illustration', 5)
$$, '42501', null, 'cannot review a request that is not completed');
select throws_ok($$
  insert into public.reviews (request_id, artist_id, category, rating)
  values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', 'writing', 5)
$$, '42501', null, 'category must match the request');
select throws_ok($$
  insert into public.reviews (request_id, artist_id, category, rating)
  values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', 'illustration', 6)
$$, '23514', null, 'rating is 1 to 5');
select lives_ok($$
  insert into public.reviews (request_id, artist_id, category, rating, comment)
  values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', 'illustration', 4, 'Lovely')
$$, 'client reviews a completed request');
select throws_ok($$
  insert into public.reviews (request_id, artist_id, category, rating)
  values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', 'illustration', 5)
$$, '23505', null, 'one review per request');
update public.reviews set rating = 5;
select is((select rating from public.reviews), 5::smallint, 'client edits their rating');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
update public.reviews set rating = 1;
delete from public.reviews;
select is((select rating from public.reviews), 5::smallint, 'others cannot edit or delete a review');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok($$
  insert into public.reviews (request_id, artist_id, category, rating)
  values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', 'illustration', 5)
$$, '42501', null, 'artists cannot review themselves');

set local role anon;
select is((select comment from public.reviews), 'Lovely', 'anyone can read reviews');

-- The review outlives the client's account
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
select is((select count(*) from public.reviews where client_id is null and request_id is null), 1::bigint, 'review kept when the client deletes their account');

select * from finish();
rollback;
