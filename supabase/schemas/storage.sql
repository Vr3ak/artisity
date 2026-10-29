-- Bucket row lives in seed.sql (DML). Users write only under their own <uid>/ folder.
-- Select is needed for upsert; public reads go through public URLs.
create policy "profile-images: insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "profile-images: select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "profile-images: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "profile-images: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- chat-attachments (private): <conversation_id>/<sender_id>/<uuid>. Participants read via signed URLs;
-- only the sender writes or deletes under their own folder. The conversations subquery is
-- already limited to the viewer's threads by its select policy.
create policy "chat-attachments: insert participant" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (storage.foldername(name))[1] in (select id::text from public.conversations)
  );

create policy "chat-attachments: select participant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] in (select id::text from public.conversations)
  );

create policy "chat-attachments: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-attachments' and (storage.foldername(name))[2] = (select auth.uid())::text);
