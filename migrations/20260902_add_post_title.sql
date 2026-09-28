-- Add nullable discussion title to posts
-- Apply manually: mysql -u <user> -p <database> < migrations/20260902_add_post_title.sql
-- Requires: migrations/20260901_post_types_and_spoiler.sql applied first

ALTER TABLE posts
  ADD COLUMN title VARCHAR(255) NULL AFTER post_type_id;
