-- Add audiobooks.en_name to all result sets of get_combined_static_app (home নতুন / ফ্রি / podcast / premium blocks).

DROP PROCEDURE IF EXISTS get_combined_static_app;

DELIMITER $$

CREATE PROCEDURE get_combined_static_app()
BEGIN

	SET sql_mode = 'NO_UNSIGNED_SUBTRACTION';
	SET @default_rate := 5;

	SELECT
		a.rect_banner,
		a.id,
		a.name,
		a.en_name,
		'' AS description,
		a.author_name,
		a.isSubRestricted,
		a.premium,
		a.thumb_path,
		a.price,
		a.isAdsExits,
		a.for_rent,
		a.play_count,
		a.mybl_play_count,
		(
			SELECT IFNULL(AVG(r.rating), @default_rate)
			FROM ratings AS r
			WHERE r.audiobook_id = a.id
		) AS rating
	FROM audiobooks AS a
	WHERE a.for_home = 1
		AND a.approval_status = 1
		AND a.deleted = FALSE
	ORDER BY play_count DESC
	LIMIT 0, 10;

	SELECT DISTINCT
		a.rect_banner,
		a.id,
		a.name,
		a.en_name,
		'' AS description,
		a.isSubRestricted,
		a.author_name,
		a.premium,
		a.thumb_path,
		a.price,
		a.for_rent,
		a.isAdsExits,
		a.play_count,
		a.mybl_play_count,
		(
			SELECT IFNULL(AVG(r.rating), @default_rate)
			FROM ratings AS r
			WHERE r.audiobook_id = a.id
		) AS rating
	FROM audiobooks AS a
	LEFT JOIN categories_audiobooks AS ca ON ca.audiobook_id = a.id
	WHERE a.for_home = 1
		AND ca.category_id != 55
		AND approval_status = 1
		AND podcast = 0
		AND deleted = 0
	ORDER BY created_at DESC
	LIMIT 0, 10;

	SELECT
		a.rect_banner,
		a.id,
		a.name,
		a.en_name,
		'' AS description,
		a.author_name,
		a.isSubRestricted,
		a.premium,
		a.thumb_path,
		a.price,
		a.for_rent,
		a.isAdsExits,
		a.play_count,
		a.mybl_play_count,
		(
			SELECT IFNULL(AVG(r.rating), @default_rate)
			FROM ratings AS r
			WHERE r.audiobook_id = a.id
		) AS rating
	FROM audiobooks AS a
	WHERE a.for_home = 1
		AND a.approval_status = 1
		AND a.deleted = FALSE
		AND a.price = '0'
	ORDER BY play_count DESC
	LIMIT 0, 10;

	SELECT
		a.rect_banner,
		a.id,
		a.name,
		a.en_name,
		a.description,
		a.author_name,
		a.isSubRestricted,
		a.premium,
		a.thumb_path,
		a.price,
		a.for_rent,
		a.isAdsExits,
		a.play_count,
		a.mybl_play_count,
		(
			SELECT IFNULL(AVG(r.rating), @default_rate)
			FROM ratings AS r
			WHERE r.audiobook_id = a.id
		) AS rating
	FROM audiobooks AS a
	WHERE a.for_home = 1
		AND a.approval_status = 1
		AND a.deleted = FALSE
		AND a.podcast = 1
	ORDER BY created_at DESC
	LIMIT 0, 10;

	SELECT
		a.rect_banner,
		a.id,
		a.name,
		a.en_name,
		'' AS description,
		a.author_name,
		a.premium,
		a.isSubRestricted,
		a.thumb_path,
		a.price,
		a.for_rent,
		a.isAdsExits,
		a.play_count,
		a.mybl_play_count,
		(
			SELECT IFNULL(AVG(r.rating), @default_rate)
			FROM ratings AS r
			WHERE r.audiobook_id = a.id
		) AS rating
	FROM audiobooks AS a
	WHERE a.for_home = 1
		AND a.approval_status = 1
		AND a.podcast = 0
		AND a.deleted = FALSE
		AND a.price != '0'
		AND a.premium = TRUE
	ORDER BY created_at DESC
	LIMIT 0, 10;
END$$

DELIMITER ;
