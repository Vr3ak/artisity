-- npx supabase test db --local
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- artist (a), second artist (b), client (c)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local');
update public.profiles set role = 'artist' where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
update public.profiles set role = 'client' where id = '00000000-0000-0000-0000-00000000000c';

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select lives_ok($$
  insert into public.posts (id, image_path, title, category)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a/posts/00000000-0000-0000-0000-0000000000f1', 'Temple at dusk', 'illustration')
$$, 'artist posts');
select throws_ok($$
  insert into public.posts (id, image_path, title)
  values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000b/posts/00000000-0000-0000-0000-0000000000f2', 'stolen')
$$, '23514', null, 'image must live in the poster''s own folder');
select throws_ok($$
  insert into public.posts (id, image_path, title)
  values ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000000a/posts/00000000-0000-0000-0000-0000000000f3', '')
$$, '23514', null, 'title required');
select throws_ok($$
  insert into public.posts (id, image_path, image_count, title)
  values ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-00000000000a/posts/00000000-0000-0000-0000-0000000000f5', 11, 'too many')
$$, '23514', null, 'at most 10 images');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select throws_ok($$
  insert into public.posts (id, image_path, title)
  values ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-00000000000c/posts/00000000-0000-0000-0000-0000000000f4', 'client post')
$$, '42501', null, 'clients cannot post');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
delete from public.posts;
select is((select count(*) from public.posts where id = '00000000-0000-0000-0000-0000000000f1'), 1::bigint, 'others cannot delete a post');

set local role anon;
select is((select title from public.posts where id = '00000000-0000-0000-0000-0000000000f1'), 'Temple at dusk', 'anyone can read posts');

set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ update public.posts set title = 'edited' where id = '00000000-0000-0000-0000-0000000000f1' $$, '42501', null, 'posts are not editable');
delete from public.posts;
select is((select count(*) from public.posts where id = '00000000-0000-0000-0000-0000000000f1'), 0::bigint, 'owner deletes their post');

select * from finish();
rollback;
