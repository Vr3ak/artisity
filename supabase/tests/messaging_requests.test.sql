-- npx supabase test db --local
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

-- client (c), artist (a), outsider (o); the signup trigger creates their profiles
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local'),
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000f', 'o@test.local');
update public.profiles set role = 'client' where id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000f');
update public.profiles set role = 'artist' where id = '00000000-0000-0000-0000-00000000000a';

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- client starts a thread and a request
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select lives_ok($$ insert into public.conversations (artist_id) values ('00000000-0000-0000-0000-00000000000a') $$, 'client opens conversation');
select lives_ok($$ insert into public.messages (conversation_id, body) select id, 'hi' from public.conversations $$, 'client sends message');
select lives_ok($$ insert into public.requests (id, artist_id, category, brief) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', 'illustration', 'a cat') $$, 'client sends request');
select throws_ok($$ insert into public.conversations (artist_id) values ('00000000-0000-0000-0000-00000000000f') $$, '42501', null, 'cannot message a non-artist');
select throws_ok($$ update public.requests set status = 'accepted' $$, '23514', null, 'client cannot accept');
select throws_ok($$ update public.requests set brief = 'changed' $$, '42501', null, 'brief is immutable');

-- outsider sees nothing and cannot post
select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
select is((select count(*) from public.conversations), 0::bigint, 'outsider sees no conversations');
select is((select count(*) from public.messages), 0::bigint, 'outsider sees no messages');
select is((select count(*) from public.requests), 0::bigint, 'outsider sees no requests');
select throws_ok($$ insert into public.messages (conversation_id, body) select id, 'x' from public.conversations union all select gen_random_uuid(), 'x' $$, '42501', null, 'outsider cannot post');

-- artist sees the client and walks the request forward
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), 1::bigint, 'artist sees conversation partner');
select throws_ok($$ update public.requests set status = 'completed' $$, '23514', null, 'artist cannot complete');
select lives_ok($$ update public.requests set status = 'accepted' $$, 'artist accepts');
select lives_ok($$ update public.requests set status = 'delivered' $$, 'artist delivers');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select lives_ok($$ update public.requests set status = 'completed' $$, 'client completes');

-- edit and delete: only the sender, deletes wipe content and freeze the row
select throws_ok($$ insert into public.messages (conversation_id) select id from public.conversations $$, '23514', null, 'empty message rejected');
select throws_ok($$ insert into public.messages (conversation_id, attachment_path, attachment_type) select id, gen_random_uuid() || '/x/y', 'image/png' from public.conversations $$, '23514', null, 'attachment must live under its conversation');
select lives_ok($$ update public.messages set body = 'hello' where body = 'hi' $$, 'sender edits');
select isnt((select edited_at from public.messages where body = 'hello'), null, 'edit is stamped');
select throws_ok($$ update public.messages set sender_id = '00000000-0000-0000-0000-00000000000a' $$, '42501', null, 'sender_id is not updatable');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update public.messages set body = 'hacked';
select is((select count(*) from public.messages where body = 'hacked'), 0::bigint, 'partner cannot edit');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select lives_ok($$ update public.messages set deleted_at = now() where body = 'hello' $$, 'sender deletes');
select throws_ok($$ update public.messages set body = 'back' $$, '23514', null, 'deleted message is frozen');

select * from finish();
rollback;
