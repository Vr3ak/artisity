-- npx supabase test db --local
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- artist (a) with a post, two likers (b, c)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local');
update public.profiles set role = 'artist' where id = '00000000-0000-0000-0000-00000000000a';
insert into public.posts (id, artist_id, image_path, title) values (
  '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a',
  '00000000-0000-0000-0000-00000000000a/posts/00000000-0000-0000-0000-0000000000f1', 'Temple at dusk'
);

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select lives_ok($$ insert into public.post_likes (post_id) values ('00000000-0000-0000-0000-0000000000f1') $$, 'user likes a post');
select throws_ok($$ insert into public.post_likes (post_id) values ('00000000-0000-0000-0000-0000000000f1') $$, '23505', null, 'one like per user and post');
select throws_ok($$
  insert into public.post_likes (user_id, post_id) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000f1')
$$, '42501', null, 'cannot like on someone else''s behalf');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select is((select count(*) from public.post_likes), 0::bigint, 'likes are private to the liker');
delete from public.post_likes;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select is((select count(*) from public.post_likes), 1::bigint, 'others cannot remove my like');
delete from public.post_likes where post_id = '00000000-0000-0000-0000-0000000000f1';
select is((select count(*) from public.post_likes), 0::bigint, 'liker removes their like');

set local role anon;
select throws_ok($$ select * from public.post_likes $$, '42501', null, 'anon cannot read likes');

select * from finish();
rollback;
