SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.count_post_like()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id and artist_id <> new.user_id;
  else
    update public.posts set like_count = like_count - 1 where id = old.post_id and artist_id <> old.user_id;
  end if;
  return null;
end;
$function$;

-- Hand-added DML: recount without the self-likes the previous trigger counted
UPDATE public.posts p SET like_count = (
  SELECT count(*) FROM public.post_likes l WHERE l.post_id = p.id AND l.user_id <> p.artist_id
);
