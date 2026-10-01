-- Expose categories.en_name in get_combined_data_by_category metadata result set (used by /v4/home/home).

DROP PROCEDURE IF EXISTS get_combined_data_by_category;

DELIMITER $$

CREATE PROCEDURE get_combined_data_by_category(
	IN p_category_id INT
)
BEGIN
	SELECT
		name,
		en_name,
		id AS category_id,
		price,
		for_rent,
		rent_duration_day
	FROM categories
	WHERE id = p_category_id;

	SET @default_rate := 5;

	SELECT
		a.id,
		a.name,
		a.en_name,
		a.author_name,
		a.isSubRestricted,
		a.premium,
		a.for_rent,
		a.thumb_path,
		a.price,
		a.play_count,
		a.mybl_play_count,
		(
			SELECT IFNULL(AVG(r.rating), @default_rate)
			FROM ratings AS r
			WHERE r.audiobook_id = a.id
		) AS rating
	FROM audiobooks AS a
	INNER JOIN categories_audiobooks
		ON a.id = categories_audiobooks.audiobook_id
	WHERE categories_audiobooks.category_id = p_category_id
		AND a.approval_status = 1
		AND a.for_home = 1
		AND a.deleted = FALSE
		AND categories_audiobooks.category_id
	ORDER BY created_at DESC
	LIMIT 10;
END$$

DELIMITER ;
