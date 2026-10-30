ALTER TABLE "public"."contact_methods"
  DROP CONSTRAINT "contact_methods_facebook_name_check";

ALTER TABLE "public"."contact_methods"
  DROP COLUMN "facebook_name";
