ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_categories_check";

ALTER TYPE "public"."art_category" ADD VALUE 'fine_art' AFTER 'ui_ux';

