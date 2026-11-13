ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_categories_check" CHECK ((cardinality(categories) <= 20));

