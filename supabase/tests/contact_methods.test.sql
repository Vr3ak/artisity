-- npx supabase test db --local
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- client (c), artist (a), outsider (o)
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

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select lives_ok($$ insert into public.contact_methods (telegram) values ('client_tg') $$, 'client saves own contacts');
select throws_ok($$ insert into public.contact_methods (user_id, telegram) values ('00000000-0000-0000-0000-00000000000a', 'spoofed') $$, '42501', null, 'cannot write someone else''s contacts');
select throws_ok($$ update public.profiles set username = 'Bad Name' where id = '00000000-0000-0000-0000-00000000000c' $$, '23514', null, 'username format enforced');
select lives_ok($$ update public.profiles set username = 'client_one' where id = '00000000-0000-0000-0000-00000000000c' $$, 'client picks a username');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select count(*) from public.contact_methods), 0::bigint, 'artist cannot see contacts before a request');
select throws_ok($$ update public.profiles set username = 'client_one' where id = '00000000-0000-0000-0000-00000000000a' $$, '23505', null, 'usernames are unique');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
insert into public.requests (artist_id, category, brief) values ('00000000-0000-0000-0000-00000000000a', 'illustration', 'hi');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select is((select telegram from public.contact_methods), 'client_tg', 'artist sees contacts after a request');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000f');
select is((select count(*) from public.contact_methods), 0::bigint, 'outsider sees no contacts');

select * from finish();
rollback;
