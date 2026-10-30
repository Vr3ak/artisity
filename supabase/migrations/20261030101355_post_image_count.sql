ALTER TABLE "public"."posts"
  ADD COLUMN "image_count" smallint NOT NULL DEFAULT 1;

ALTER TABLE "public"."posts"
  ADD CONSTRAINT "posts_image_count_check" CHECK (((image_count >= 1) AND (image_count <= 10)));

-- DML, so seed.sql doesn't reach hosted projects: 7 MiB per image
update storage.buckets set file_size_limit = 7340032 where id = 'profile-images';
