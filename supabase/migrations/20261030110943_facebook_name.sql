ALTER TABLE "public"."contact_methods"
  ADD COLUMN "facebook_name" text;

ALTER TABLE "public"."contact_methods"
  ADD CONSTRAINT "contact_methods_facebook_name_check" CHECK (((char_length(facebook_name) >= 1) AND (char_length(facebook_name) <= 80)));
