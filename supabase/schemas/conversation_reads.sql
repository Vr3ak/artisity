-- Read receipts: how far each participant has read a conversation. One row per (conversation, user),
-- written by the chat while the thread is open and visible. Both participants can read both rows,
-- so the sender sees "Seen"; realtime pushes changes to the open chat.
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- messages.id is an identity, so "read up to id N" covers every earlier message
  last_read_id bigint not null,
  read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- The primary key covers conversation lookups; this one serves the user_id foreign key (cascading deletes)
create index conversation_reads_user_id_idx on public.conversation_reads (user_id);

alter table public.conversation_reads enable row level security;

create policy "conversation_reads: select participant" on public.conversation_reads
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.client_id, c.artist_id)
  ));

create policy "conversation_reads: insert own" on public.conversation_reads
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.client_id, c.artist_id)
    )
  );

create policy "conversation_reads: update own" on public.conversation_reads
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.conversation_reads from anon, authenticated;
grant select on public.conversation_reads to authenticated;
-- The chat upserts (conversation_id, last_read_id); private.guard_conversation_read does the rest
-- update (conversation_id) only because PostgREST's upsert sets every payload column; the trigger pins it
grant insert (conversation_id, last_read_id), update (conversation_id, last_read_id) on public.conversation_reads to authenticated;

-- Keeps the row in its conversation, never moves backwards (two tabs, an out-of-order write) and stamps
-- read_at only when it moves forward.
create function private.guard_conversation_read()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.conversation_id := old.conversation_id;
  if new.last_read_id <= old.last_read_id then
    return null; -- skip the update: nothing new was read
  end if;
  new.read_at := now();
  return new;
end;
$$;

revoke execute on function private.guard_conversation_read() from public, anon, authenticated;

create trigger on_conversation_read_updating
  before update on public.conversation_reads
  for each row execute function private.guard_conversation_read();

alter publication supabase_realtime add table public.conversation_reads;
