const ResponseUtils = require("../../utils/res-utils");
const DB = require("../db");

class BlogModel {
  getAll = async (req) => {
    try {
      const queryList = `
        SELECT * FROM blogs ${
          req.query.type === "pending"
            ? "WHERE approved = 0"
            : req.query.type === "approved"
            ? "WHERE approved = 1"
            : ""
        }
        ORDER BY created_at DESC                                                                                                                                                                                                              
        ${
          req.query.offset || req.query.limit
            ? `LIMIT ${req.query.limit} OFFSET ${req.query.offset}`
            : ""
        }
      `;
      const queryCount = `
        SELECT COUNT(*) AS count FROM blogs ${
          req.query.type === "pending"
            ? "WHERE approved = 0"
            : req.query.type === "approved"
            ? "WHERE approved = 1"
            : ""
        }
      `;
      const list = await DB.query(
        queryList,
        Number(req.query.limit),
        Number(req.query.offset)
      );
      const count = await DB.query(
        queryCount,
        Number(req.query.limit),
        Number(req.query.offset)
      );
      return { list, count: count[0].count };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  getById = async (id) => {
    try {
      const query = `SELECT * FROM blogs WHERE id = ?`;
      const result = await DB.query(query, [id]);
      if (result.length) return result[0];
      return null;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  getApprovedBySlug = async (slug) => {
    try {
      const query = `SELECT * FROM blogs WHERE slug = ? AND approved = 1`;
      const result = await DB.query(query, [slug]);
      if (result.length) return result[0];
      return null;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  getAllByUserId = async (userId) => {
    try {
      const query = `SELECT * FROM blogs WHERE user_id = ?`;
      const result = await DB.query(query, [userId]);
      return result;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  create = async (req) => {
    try {
      const {
        title,
        excerpt,
        categories,
        contentBody,
        featuredImageUrl,
        alterTextForFeaturedImage,
        author,
        userId,
      } = req.body;
      const slug = title.replaceAll(" ", "-");
      const query = `
        INSERT INTO blogs (
          title,
          slug,
          excerpt,
          categories,
          content_body,
          featured_image,
          alter_text_for_featured_image,
          author,
          user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const result = await DB.query(query, [
        title,
        slug,
        excerpt,
        categories,
        contentBody,
        featuredImageUrl,
        alterTextForFeaturedImage,
        author,
        userId,
      ]);
      return { success: true, message: "Blog created successfully" };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  update = async (req) => {
    try {
      const {
        title,
        excerpt,
        categories,
        contentBody,
        featuredImageUrl,
        alterTextForFeaturedImage,
        author,
        metaTitle,
        metaDescription,
        metaKeywords,
        metaAuthor,
      } = req.body;
      const slug = title.replaceAll(" ", "-");
      const query = `
        UPDATE blogs SET
          title = ?,
          slug = ?,
          excerpt = ?,
          categories = ?,
          content_body = ?,
          featured_image = ?,
          alter_text_for_featured_image = ?,
          author = ?,
          meta_title = ?,
          meta_description = ?,
          meta_keywords = ?,
          meta_author = ?
        WHERE id = ?;
      `;
      const result = await DB.query(query, [
        title,
        slug,
        excerpt,
        categories,
        contentBody,
        featuredImageUrl,
        alterTextForFeaturedImage,
        author,
        metaTitle,
        metaDescription,
        metaKeywords,
        metaAuthor,
        req.params.id,
      ]);
      if (result.changedRows === 0) {
        return { success: false, message: "No changes made to the blog" };
      }
      return { success: true, message: "Blog updated successfully" };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  toggle = async (id) => {
    try {
      const query = `
        UPDATE blogs
        SET approved = NOT approved,
          publish_date = NOW()
        WHERE id = ?
      `;
      const result = await DB.query(query, [id]);
      if (result.changedRows === 0) {
        return { success: false, message: "No changes made to the blog" };
      }
      return { success: true, message: "Blog approval changed successfully" };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  delete = async (id) => {
    try {
      const query = `DELETE FROM blogs WHERE id = ?`;
      const result = await DB.query(query, [id]);
            return { success: true, message: "Blog deleted successfully" };
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
}

module.exports = new BlogModel();
