DROP POLICY "realtime: read online presence" ON "realtime"."messages";

CREATE POLICY "realtime: read online presence" ON "realtime"."messages"
  FOR SELECT
  TO "authenticated"
  USING ((( SELECT realtime.topic() AS topic) = 'online'::text));
