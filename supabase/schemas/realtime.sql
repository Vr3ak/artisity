-- "Active now": every signed-in tab joins the private Realtime channel `online` and tracks its user id
-- with Presence (components/online.tsx). Private, so only signed-in users can see who's online.
-- ponytail: one global channel, so every join/leave reaches every viewer; shard by conversation
-- partners if concurrent users reach the thousands
-- Read isn't narrowed to extension = 'presence': Realtime's join check reads the topic as broadcast
-- too and rejects the channel without it. Nothing can broadcast there (insert is presence-only).
create policy "realtime: read online presence" on realtime.messages
  for select to authenticated
  using ((select realtime.topic()) = 'online');

create policy "realtime: track online presence" on realtime.messages
  for insert to authenticated
  with check ((select realtime.topic()) = 'online' and extension = 'presence');
