-- Podcast FULLTEXT search index migration
-- Apply manually: mysql -u <user> -p <database> < migrations/20260827_add_podcast_fulltext_index.sql
--
-- Required for MATCH(p.title, p.description) AGAINST (? IN BOOLEAN MODE) in podcast search.
-- Skip if ft_podcast_search already exists.

ALTER TABLE podcast
  ADD FULLTEXT INDEX ft_podcast_search (title, description);
