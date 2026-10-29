SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  -- OAuth providers send full_name/avatar_url; display only, never use for authorization
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(new.raw_user_meta_data ->> 'full_name', 100),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$function$;
