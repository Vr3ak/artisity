-- One thread per (initiator, artist) pair. client_id is whoever started it; artist_id must be an artist.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (client_id, artist_id),
  check (client_id <> artist_id)
);

-- unique (client_id, artist_id) covers client_id lookups
create index conversations_artist_id_idx on public.conversations (artist_id);

alter table public.conversations enable row level security;

create policy "conversations: select participant" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (client_id, artist_id));

create policy "conversations: insert own" on public.conversations
  for insert to authenticated
  with check (
    (select auth.uid()) = client_id
    and private.is_artist(artist_id)
    and not private.is_blocked(client_id, artist_id)
  );

revoke all on public.conversations from anon, authenticated;
grant select, insert on public.conversations to authenticated;

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  -- Optional file in the private chat-attachments bucket, at <conversation_id>/<sender_id>/<uuid>.
  -- attachment_type is the MIME type; the UI picks image/video/voice/file from it.
  attachment_path text check (split_part(attachment_path, '/', 1) = conversation_id::text),
  attachment_type text,
  attachment_name text,
  attachment_size integer,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  -- Soft delete: the row stays (thread order, realtime UPDATE) but its content is wiped
  deleted_at timestamptz,
  check (deleted_at is not null or char_length(body) > 0 or attachment_path is not null)
);

create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);
create index messages_sender_id_idx on public.messages (sender_id);

alter table public.messages enable row level security;

create policy "messages: select participant" on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.client_id, c.artist_id)
  ));

create policy "messages: insert participant" on public.messages
  for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.client_id, c.artist_id)
        and not private.is_blocked(c.client_id, c.artist_id)
    )
  );

create policy "messages: update own" on public.messages
  for update to authenticated
  using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);

revoke all on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;
-- Editing sets body, deleting sets deleted_at; private.guard_message_update does the rest
grant update (body, deleted_at) on public.messages to authenticated;

-- Stamps edits, wipes content on delete, and freezes deleted messages.
create function private.guard_message_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.deleted_at is not null then
    raise exception 'message is deleted' using errcode = '23514';
  end if;
  if new.deleted_at is not null then
    new.deleted_at := now();
    new.edited_at := null;
    new.body := '';
    new.attachment_path := null;
    new.attachment_type := null;
    new.attachment_name := null;
    new.attachment_size := null;
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function private.guard_message_update() from public, anon, authenticated;

create trigger on_message_updating
  before update on public.messages
  for each row execute function private.guard_message_update();

-- Users have no update grant on conversations, so the inbox sort key is maintained here.
create function private.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

revoke execute on function private.touch_conversation() from public, anon, authenticated;

create trigger on_message_inserted
  after insert on public.messages
  for each row execute function private.touch_conversation();

-- postgres_changes delivers inserts and updates (edits, deletes) to subscribers, filtered by the select policy above
alter publication supabase_realtime add table public.messages;
