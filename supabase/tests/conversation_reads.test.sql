-- npx supabase test db --local
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- client (c) and artist (a) share a conversation; outsider (o)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local'),
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000f', 'o@test.local');
update public.profiles set role = 'artist' where id = '00000000-0000-0000-0000-00000000000a';
insert into public.conversations (id, client_id, artist_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a');

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- What the chat sends (PostgREST upsert)
create function pg_temp.mark_read(n bigint) returns void language sql as $$
  insert into public.conversation_reads (conversation_id, last_read_id)
  values ('00000000-0000-0000-0000-0000000000d1', n)
  on conflict (conversation_id, user_id) do update
    set conversation_id = excluded.conversation_id, last_read_id = excluded.last_read_id;
$$;

set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select pg_temp.mark_read(5) $$, 'participant marks read');
select lives_ok($$ select pg_temp.mark_read(9) $$, 'marking again moves it forward');
select pg_temp.mark_read(3);
select is((select last_read_id from public.conversation_reads), 9::bigint, 'never moves backwards');
select throws_ok($$
  insert into public.conversation_reads (conversation_id, user_id, last_read_id)
  values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000c', 99)
$$, '42501', null, 'cannot mark read for the other side');
update public.conversation_reads set conversation_id = gen_random_uuid();
select is((select conversation_id from public.conversation_reads), '00000000-0000-0000-0000-0000000000d1'::uuid, 'row stays in its conversation');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select is((select last_read_id from public.conversation_reads), 9::bigint, 'partner sees the read receipt');
update public.conversation_reads set last_read_id = 100;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select last_read_id from public.conversation_reads), 9::bigint, 'partner cannot change my receipt');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
select is((select count(*) from public.conversation_reads), 0::bigint, 'outsider sees no receipts');
select throws_ok($$ select pg_temp.mark_read(1) $$, '42501', null, 'outsider cannot mark read');

select * from finish();
rollback;
