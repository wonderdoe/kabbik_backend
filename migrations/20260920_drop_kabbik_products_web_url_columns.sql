-- Apply manually if redirect_url_web / fallback_url_web were added earlier:
-- mysql -u <user> -p <database> < migrations/20260920_drop_kabbik_products_web_url_columns.sql

ALTER TABLE kabbik_products DROP COLUMN redirect_url_web;
ALTER TABLE kabbik_products DROP COLUMN fallback_url_web;
