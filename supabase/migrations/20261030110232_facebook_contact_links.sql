ALTER TABLE "public"."contact_methods"
  DROP CONSTRAINT "contact_methods_facebook_check";

ALTER TABLE "public"."contact_methods"
  ADD CONSTRAINT "contact_methods_facebook_check"
    CHECK ((facebook ~ '^([A-Za-z0-9.]{5,50}|profile\.php\?id=[0-9]{1,20}|share/([a-z]/)?[A-Za-z0-9]{1,30}|people/[A-Za-z0-9._%-]{1,100}/[0-9]{1,20})$'::text));
