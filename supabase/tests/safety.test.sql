-- npx supabase test db --local
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- client (c), artist (a), admin (x)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local'),
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000e', 'x@test.local');
update public.profiles set role = 'client' where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'artist' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000e';

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- Blocks
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into public.conversations (id, artist_id) values ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-00000000000a');
select lives_ok($$ insert into public.blocks (blocked_id) values ('00000000-0000-0000-0000-00000000000a') $$, 'client blocks artist');
select throws_ok($$ insert into public.messages (conversation_id, body) values ('00000000-0000-0000-0000-0000000000cc', 'hi') $$, '42501', null, 'blocker cannot message');
select throws_ok($$ insert into public.requests (artist_id, category, brief) values ('00000000-0000-0000-0000-00000000000a', 'illustration', 'hi') $$, '42501', null, 'blocker cannot send a request');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select count(*) from public.blocks), 0::bigint, 'blocked side cannot see the block');
select throws_ok($$ insert into public.messages (conversation_id, body) values ('00000000-0000-0000-0000-0000000000cc', 'hi') $$, '42501', null, 'blocked side cannot message');
select is((select count(*) from public.blocks where blocker_id = '00000000-0000-0000-0000-00000000000c'), 0::bigint, 'blocked side cannot remove the block');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
delete from public.blocks where blocked_id = '00000000-0000-0000-0000-00000000000a';
select lives_ok($$ insert into public.messages (conversation_id, body) values ('00000000-0000-0000-0000-0000000000cc', 'hi') $$, 'unblocking restores messaging');

-- Reports
select lives_ok($$ insert into public.reports (reported_id, reason, details) values ('00000000-0000-0000-0000-00000000000a', 'scam', 'asked for payment upfront') $$, 'client reports artist');
select throws_ok($$ insert into public.reports (reporter_id, reported_id, reason) values ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000a', 'spam') $$, '42501', null, 'cannot report as someone else');
update public.reports set resolved_at = now();
select is((select count(*) from public.reports where resolved_at is not null), 0::bigint, 'reporter cannot resolve');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select count(*) from public.reports), 0::bigint, 'reported user cannot see the report');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select is((select count(*) from public.reports), 1::bigint, 'staff sees reports');
update public.reports set resolved_at = now();
select is((select count(*) from public.reports where resolved_at is not null), 1::bigint, 'staff resolves');

select * from finish();
rollback;
