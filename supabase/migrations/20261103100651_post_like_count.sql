SET local check_function_bodies = off;

ALTER TABLE "public"."posts"
  ADD COLUMN "like_count" integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION private.count_post_like()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.posts set like_count = like_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$function$;

ALTER TABLE "public"."posts"
  ADD CONSTRAINT "posts_like_count_check" CHECK ((like_count >= 0));

-- Hand-added DML: count the likes that already exist
UPDATE public.posts p SET like_count = l.n
FROM (SELECT post_id, count(*) AS n FROM public.post_likes GROUP BY post_id) l
WHERE l.post_id = p.id;

CREATE TRIGGER on_post_like_changed
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION private.count_post_like();

REVOKE ALL ON FUNCTION "private"."count_post_like"() FROM PUBLIC;

REVOKE ALL ON TABLE "public"."posts" FROM "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."posts" TO "authenticated";

GRANT INSERT ("artist_id", "caption", "category", "created_at", "id", "image_count", "image_path", "title") ON TABLE "public"."posts" TO "authenticated";
