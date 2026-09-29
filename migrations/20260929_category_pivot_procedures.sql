-- Category lists must read categories_audiobooks.
-- audiobooks.category_id is deprecated and nulled.
-- Hardcoded category ids 1, 2, and 3 stay as they were.
-- Those old category rows are gone, so those result sets stay empty
-- until the ids are remapped.

DROP PROCEDURE IF EXISTS get_combined_data_for_app;
DROP PROCEDURE IF EXISTS get_combined_data_by_category_seemore;

DELIMITER $$

CREATE PROCEDURE get_combined_data_for_app()
BEGIN
	SET @default_rate := 5;

	SELECT
    a.id,
    a.name,
    a.author_name,
    a.thumb_path,
    (SELECT
            IFNULL(AVG(r.rating), @default_rate)
        FROM
            ratings AS r
        WHERE
            r.audiobook_id = a.id
	) AS rating
	FROM
    audiobooks AS a
	WHERE
    a.approval_status = 1  AND a.for_app = true
	LIMIT 0 , 25;

	SELECT DISTINCT
    a.id,
    a.name,
    a.author_name,
    a.thumb_path,
    (SELECT
            IFNULL(AVG(r.rating), @default_rate)
        FROM
            ratings AS r
        WHERE
            r.audiobook_id = a.id) AS rating
	FROM
    audiobooks AS a
	JOIN categories_audiobooks AS ca ON ca.audiobook_id = a.id
	WHERE
    ca.category_id = 3
	AND a.approval_status = 1 AND a.for_app = true
	LIMIT 25;

	SELECT DISTINCT
    a.id,
    a.name,
    a.author_name,
    a.thumb_path,
    (SELECT
            IFNULL(AVG(r.rating), @default_rate)
        FROM
            ratings AS r
        WHERE
            r.audiobook_id = a.id) AS rating
	FROM
    audiobooks AS a
	JOIN categories_audiobooks AS ca ON ca.audiobook_id = a.id
	WHERE
    ca.category_id = 1
	AND a.approval_status = 1 AND a.for_app = true
	LIMIT 25;

	SELECT DISTINCT
    a.id,
    a.name,
    a.author_name,
    a.thumb_path,
    (SELECT
            IFNULL(AVG(r.rating), @default_rate)
        FROM
            ratings AS r
        WHERE
            r.audiobook_id = a.id) AS rating
	FROM
    audiobooks AS a
	JOIN categories_audiobooks AS ca ON ca.audiobook_id = a.id
	WHERE
    ca.category_id = 2
	AND a.approval_status = 1 AND a.for_app = true
	LIMIT 25;

	SELECT
    a.id,
    a.name,
    a.author_name,
    a.thumb_path,
    (SELECT
            IFNULL(AVG(r.rating), @default_rate)
        FROM
            ratings AS r
        WHERE
            r.audiobook_id = a.id) AS rating
	FROM
    audiobooks AS a
	WHERE
    a.approval_status = 1 AND a.for_app = true
	ORDER BY RAND()
	LIMIT 25;

	SELECT
    a.id, a.name, a.author_name, a.thumb_path, rating
	FROM
    (SELECT
        ia.id,
            ia.name,
            ia.author_name,
            ia.thumb_path,
            (SELECT
                   IFNULL(AVG(r.rating), @default_rate)
                FROM
                    ratings AS r
                WHERE
                    r.audiobook_id = ia.id) AS rating
    FROM
        audiobooks AS ia
    WHERE
        ia.approval_status = 1 AND ia.for_app = true
    ORDER BY id DESC
    LIMIT 25) AS a
	ORDER BY id ASC;
END$$

CREATE PROCEDURE get_combined_data_by_category_seemore(
IN p_category_name VARCHAR(255)
)
BEGIN
SELECT
            a.id,
            a.name,
            a.description,
            a.author_name,
            a.premium,
            a.thumb_path,
            a.price,
            (SELECT
                    IFNULL(AVG(r.rating), 5)
                FROM
                    ratings AS r
                WHERE
                    r.audiobook_id = a.id) AS rating
        FROM
            audiobooks AS a
        WHERE
            a.approval_status = 1
                AND a.id IN (SELECT
                    cs.audiobook_id
                FROM
                    categories_audiobooks AS cs
                WHERE
                    cs.category_id IN (SELECT
                    categories.id
                FROM
                    categories
                WHERE
                    categories.name = p_category_name))
                AND a.deleted = FALSE
        ORDER BY created_at DESC;
END$$

DELIMITER ;
