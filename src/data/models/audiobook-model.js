const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const coreUtils = require("../../utils/core-utils");

const axios = require("axios");
const GlobalTask = require("../../utils/global-tasker");
const { body } = require("express-validator");

class AudiobookModel {
  tableName = "audiobooks";

  getAll = async () => {
    try {
      const sql =
        "SELECT a.*, c.name AS category_name FROM audiobooks AS a LEFT JOIN categories AS c ON c.id = a.category_id WHERE a.approval_status = 1 AND a.deleted = 0 order by created_at desc";
      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };


   getAllWithRectBanner = async () => {
    try {
      const sql =
        "SELECT * FROM audiobooks ab WHERE ab.rect_banner IS NOT NULL;";
      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };


  getByCategory = async (id) => {
    try {
      const sql = "CALL get_audiobook_by_category(?)";
      const result = await DB.query(sql, [id]);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAuthorDetails = async (name) => {
    try {
      const sql = "CALL get_author_details(?)";
      const result = await DB.query(sql, [name]);
      if (result) {
        return result[0];
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAppAuthorDataEpisodes = async (name) => {
    try {
      const sql = "CALL get_author_audiobook_details(?)";
      const result = await DB.query(sql, [name]);
      if (result) {
        return result[0];
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getCastcrewDetails = async (name) => {
    try {
      var arrayHere = new Array();
      if (name.includes(",")) {
        arrayHere = name.split(",").map((item) => item.trim());
      } else {
        arrayHere.push(name);
      }
      // $friendsArray2 = "'" .implode("','", $friendsArray  ) . "'";
      var ids = "'" + arrayHere.join() + "'";
      const sql =
        "SELECT cc.*, count(ab.id) AS total_audiobooks FROM cast_crew as cc  left JOIN audiobooks as ab  ON ab.contributing_artists like CONCAT('%', cc.name, '%') where cc.name in ('" +
        arrayHere.join("','") +
        "') group by cc.name;";
      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return "Go";
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      console.log(e);
      return undefined;
    }
  };

  getAppCastcrewAudiobook = async (name) => {
    try {
      var default_rate = 5;
      // const sql = 'CALL get_castcrew_audiobook_details(?)';
      const sql =
        "SELECT a.id, a.name, a.description, a.author_name,a.premium, a.thumb_path, a.price, a.play_count, (SELECT IFNULL(AVG(r.rating), " +
        default_rate +
        ") FROM ratings AS r WHERE r.audiobook_id = a.id) AS rating FROM audiobooks AS a WHERE a.contributing_artists like '%" +
        name +
        "%' AND  a.approval_status = 1 AND a.deleted = FALSE ORDER BY created_at DESC;";
      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAllCastCrew = async () => {
    try {
      var default_rate = 5;
      // const sql = 'CALL get_castcrew_audiobook_details(?)';
      const sql =
        "SELECT * FROM cast_crew WHERE deleted = FALSE ORDER BY created_at DESC;";
      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e.message);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  findCastCrewById = async (id) => {
    try {
      var default_rate = 5;
      // const sql = 'CALL get_castcrew_audiobook_details(?)';
      const sql =
        "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
      const result = await DB.query(sql, [id]);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e.message);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  updateCastCrewById = async (req, imageUrl) => {
    try {
      const { id, name, en_name, description, isActive } = req.body;
      // var default_rate = 5
      // const sql = 'CALL get_castcrew_audiobook_details(?)';

      const sql = `UPDATE cast_crew SET name = ?, en_name =?, description = ?, imageUrl = ?, isActive = ? WHERE id = ? `;
      const result = await DB.query(sql, [
        name,
        en_name,
        description,
        imageUrl,
        isActive,
        id,
      ]);
      // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
      // const result = await DB.query(sql,[id]);
      if (result) {
        return "Success";
      }
      return undefined;
    } catch (e) {
      console.log(e.message);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  addCastCrew = async (req, imgUrl) => {
    try {
      const { name, description, en_name } = req.body;
      // var default_rate = 5
      // const sql = 'CALL get_castcrew_audiobook_details(?)';

      const sql = `INSERT INTO cast_crew (name, en_name, description, imageUrl) VALUES (?,?,?,?)`;
      const result = await DB.query(sql, [name, en_name, description, imgUrl]);
      // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
      // const result = await DB.query(sql,[id]);
      if (result) {
        return "Success";
      }
      return undefined;
    } catch (e) {
      console.log(e.message);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAllAuthors = async () => {
    try {
      var default_rate = 5;
      // const sql = 'CALL get_castcrew_audiobook_details(?)';
      const sql =
        "SELECT * FROM authors WHERE deleted = FALSE ORDER BY created_at DESC;";
      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e.message);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  findAuthorsById = async (id) => {
    try {
      var default_rate = 5;
      // const sql = 'CALL get_castcrew_audiobook_details(?)';
      const sql =
        "SELECT * FROM authors WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
      const result = await DB.query(sql, [id]);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      console.log(e.message);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  updateAuthorsById = async (req, imageUrl) => {
    try {
      const { id, name, description, isActive, en_name } = req.body;
      // var default_rate = 5
      // const sql = 'CALL get_castcrew_audiobook_details(?)';

      const sql = `UPDATE authors SET name = ?, en_name = ?, description = ?, imageUrl = ?, isActive = ? WHERE id = ? `;
      const result = await DB.query(sql, [
        name,
        en_name,
        description,
        imageUrl,
        isActive,
        id,
      ]);
      // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
      // const result = await DB.query(sql,[id]);
      if (result) {
        return "Success";
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  addAuthors = async (req, imgUrl) => {
    try {
      const { name, description, en_name } = req.body;
      // var default_rate = 5
      // const sql = 'CALL get_castcrew_audiobook_details(?)';

      const sql = `INSERT INTO authors (name, en_name, description, imageUrl) VALUES (?,?,?, ?)`;
      const result = await DB.query(sql, [name, en_name, description, imgUrl]);
      // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
      // const result = await DB.query(sql,[id]);
      if (result) {
        return "Success";
      }
      return undefined;
    } catch (e) {
      console.log(e.message);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getByCategoryApp = async (id) => {
    try {
      const sql = "CALL get_audiobook_by_category_app(?)";
      const result = await DB.query(sql, [id]);
      if (result) {
        return result[0];
      }
      return undefined;
      s;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getFree = async () => {
    try {
      const sql = `SELECT *, (SELECT 
                IFNULL(AVG(r.rating), 5)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = a.id) AS rating FROM audiobooks as a WHERE a.price = 0 AND a.approval_status = 1 AND a.deleted = 0 ORDER BY a.created_at`;
      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getPremium = async (req) => {
    try {
      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetPremiumAudiobookList",
        endpoint: "/v1/audiobooks/premium-audiobooks",
        forTask: "Premium",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      const sql = `SELECT *, (SELECT 
                IFNULL(AVG(r.rating), 5)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = a.id) AS rating FROM audiobooks as a WHERE a.price > 0 AND a.approval_status = 1 AND a.deleted = 0 ORDER BY a.created_at`;
      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getPodcast = async (req) => {
    try {
      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetPodcastList",
        endpoint: "/v1/audiobooks/podcast-audiobooks",
        forTask: "Podcast",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      const sql = `SELECT *, (SELECT 
                IFNULL(AVG(r.rating), 5)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = a.id) AS rating FROM audiobooks as a WHERE a.approval_status = 1 AND a.podcast = 1 AND a.deleted = 0 ORDER BY a.created_at DESC`;
      const result = await DB.query(sql);
      if (result) {
        return result;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getApprovedByChannelId = async (id) => {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE approval_status = ? AND deleted = ? AND  channel_id = ?`;
      const results = await DB.query(sql, [1, 0, id]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  getAllPendings = async () => {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE approval_status = ? AND deleted = ?`;
      const results = await DB.query(sql, [0, 0]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  getPendingsByChannelId = async (id) => {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE approval_status = ? AND deleted = ? AND channel_id = ?`;
      const results = await DB.query(sql, [0, 0, id]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  getAllRejecteds = async () => {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE approval_status = ? AND deleted = ?`;
      const results = await DB.query(sql, [2, 0]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  getRejectedByChannelId = async (id) => {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE approval_status = ? AND deleted = ? AND channel_id = ?`;
      const results = await DB.query(sql, [2, 0, id]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  updateAudioBook = async (
    name,
    en_name,
    authorName,
    vocalArtist,
    categoryVal,
    compareVal,
    description,
    price,
    imageUrl,
    id,
    publisher_id
  ) => {
    categoryVal.map(async (el) => {
      const sql =
        "INSERT INTO categories_audiobooks (category_id, audiobook_id) VALUES (?, ?)";
      const results = await DB.query(sql, [el.id, id]);
    });
    compareVal.map(async (el) => {
      const sql = `DELETE FROM categories_audiobooks WHERE id = ?`;
      const results = await DB.query(sql, [el.ca_id]);
    });
    try {
      if (imageUrl == null) {
        const sql = `UPDATE ${this.tableName} SET name = ?, author_name = ?, contributing_artists = ?, description = ?, price = ?, en_name = ?, publisher_id =? WHERE id = ? `;
        const results = await DB.query(sql, [
          name,
          authorName,
          vocalArtist,
          description,
          price,
          en_name,
          publisher_id,
          id,
        ]);
        if (results) {
          return results;
        }
      } else {
        const sql = `UPDATE  ${this.tableName} SET name = ?, author_name= ?, contributing_artists= ?, description= ?, price = ?, thumb_path =  ?, en_name = ?, publisher_id = ? WHERE id =  ?;`;
        const results = await DB.query(sql, [
          name,
          authorName,
          vocalArtist,
          description,
          price,
          imageUrl,
          en_name,
          publisher_id,
          id,
        ]);
        if (results) {
          return results;
        }
      }
    } catch (e) {
      LoggerError.log(e);
      console.log(e);
      return undefined;
    }
  };

  updatePendings = async (id, status) => {
    try {
      const sql = `UPDATE ${this.tableName} SET approval_status = ? WHERE id = ?`;
      const results = await DB.query(sql, [status, id]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  getAllByChannelId = async (channelId) => {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE channel_id = ? AND approval_status = 1 AND deleted = ?`;
      const results = await DB.query(sql, [channelId, 0]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  findOne = async (params, req) => {
    try {
      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetAudioBookDetails",
        endpoint: "/v3/audiobooks/",
        forTask: "Audiobooks",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      const sql = "CALL get_audiobook(?, ?)";
      const results = await DB.query(sql, [params[0], params[1]]);
      let audiobook = results[0][0];
      let rate = results[1][0];
      audiobook.rating = rate.rating;
      audiobook.rating_count = rate.rating_count;
      let userRatingReview = results[2][0];
      audiobook.user_rating = userRatingReview.user_rating;
      audiobook.review = userRatingReview.review;
      const audiobookCountObj = results[3][0];
      let key = Object.keys(audiobookCountObj)[0];
      audiobook.is_favorite = audiobookCountObj[key] > 0 ? true : false;
      // episodes are in index [4]
      audiobook.episodes = results[4];
      if (audiobook) {
        return audiobook;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };



   getAllPurchasedAudioBooks = async (req) => {
    try {
      const Sql = `SELECT 
      r.user_id, 
      r.audiobook_id, 
      r.is_purchased, 
      r.purchased_at,
      r.expired_at,
      b.name, 
      b.price, 
      b.thumb_path,
      b.banner_path, 
      b.play_count,
      b.author_name,
      b.total_duration
  FROM 
      audiobooks_rent AS r 
  INNER JOIN 
      audiobooks AS b ON r.audiobook_id = b.id 
  WHERE 
      r.user_id = ? 
      AND r.expired_at > NOW()
  
  UNION
   
  SELECT 
      pc.user_id, 
      ab.id AS audiobook_id, 
      pc.is_purchased,
      pc.created_at,
      pc.expired_at, 
      ab.name, 
      ab.price, 
      ab.thumb_path,
      ab.banner_path, 
      ab.play_count,
      ab.author_name,
      ab.total_duration
  FROM 
      purchased_category pc
  JOIN 
      categories_audiobooks ca ON pc.category_id = ca.category_id
  JOIN 
      audiobooks ab ON ca.audiobook_id = ab.id
  WHERE 
      pc.user_id = ? 
      AND pc.expired_at > NOW() AND ab.deleted = 0 AND ab.approval_status = 1`;
      // const purchasedBooks = await DB.query(Sql, [req.params.id, req.params.id]);

      const expiredSql = `SELECT 
      r.user_id, 
      r.audiobook_id, 
      r.is_purchased, 
      r.purchased_at,
      r.expired_at,
      b.name, 
      b.price, 
      b.thumb_path,
      b.banner_path, 
      b.play_count,
      b.author_name,
      b.total_duration
  FROM 
      audiobooks_rent AS r 
  INNER JOIN 
      audiobooks AS b ON r.audiobook_id = b.id 
  WHERE 
      r.user_id = ? 
      AND r.expired_at < NOW()`;
      // const expiredPurchasedBooks = await DB.query(expiredSql, [req.params.id, req.params.id]);
      
      const [purchasedBooks, expiredPurchasedBooks] = await Promise.all([
        DB.query(Sql, [req.params.id, req.params.id]),
        DB.query(expiredSql, [req.params.id, req.params.id])
      ]);
      if (purchasedBooks) {
        return {data:purchasedBooks,expiredData:expiredPurchasedBooks};
      }
      return undefined;
    } catch (e) {
      console.log(e)
      return undefined;
    }
  };


  findSingleBooks = async (params, req) => {
    try {
      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetAudioBookDetails",
        endpoint: "/v3/audiobooks/",
        forTask: "Audiobooks",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      const sql = "CALL get_audiobook(?, ?)";
      const results = await DB.query(sql, [params[0], params[1]]);
      let audiobook = results[0][0];
      audiobook.file_path =
        audiobook.premium === 1 ? null : audiobook.file_path;
      let rate = results[1][0];
      audiobook.rating = rate.rating;
      audiobook.rating_count = rate.rating_count;
      let userRatingReview = results[2][0];
      audiobook.user_rating = userRatingReview.user_rating;
      audiobook.review = userRatingReview.review;
      const audiobookCountObj = results[3][0];
      let key = Object.keys(audiobookCountObj)[0];
      audiobook.is_favorite = audiobookCountObj[key] > 0 ? true : false;

      const filteredEpisodes = results[4].map((ep, index) => {
        const { file_path, ...rest } = ep;
        return ep.isfree === 1 ||
          audiobook.isPurchased === 1 ||
          req.currentUser.is_subscribed === 1
          ? ep
          : { ...rest, file_path: null };
      });
      audiobook.episodes = filteredEpisodes;
	audiobook.publisher = results[5];
      if (audiobook) {
        return audiobook;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };


  findSecuredAudiobook = async (params, req) => {
    try {
      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetSecuredAudioBookDetails",
        endpoint: "/v3/audiobooks/",
        forTask: "Audiobooks",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      const sql = "CALL get_audiobook(?, ?)";
      const results = await DB.query(sql, [params[0], params[1]]);
      let audiobook = results[0][0];
      audiobook.file_path = null;
      let rate = results[1][0];
      audiobook.rating = rate.rating;
      audiobook.rating_count = rate.rating_count;
      let userRatingReview = results[2][0];
      audiobook.user_rating = userRatingReview.user_rating;
      audiobook.review = userRatingReview.review;
      const audiobookCountObj = results[3][0];
      let key = Object.keys(audiobookCountObj)[0];
      audiobook.is_favorite = audiobookCountObj[key] > 0 ? true : false;
      audiobook.isPurchased = 0;

      const checkbookPurchaseSql = `SELECT * from audiobooks_rent WHERE audiobook_id = ? AND user_id = ?`;

      let checkIfAudioBookIsPurchase;

      try {
        checkIfAudioBookIsPurchase = await DB.query(checkbookPurchaseSql, [
          params[0],
          params[1],
        ]);
      } catch (e) {
        console.error("Eroorrrrrrrrrr:", e);
      }
      if (checkIfAudioBookIsPurchase.length > 0) {
        const checkIfDateIsExpired =
          new Date() >
          new Date(
            checkIfAudioBookIsPurchase[
              checkIfAudioBookIsPurchase.length - 1
            ].expired_at
          );
        audiobook.isPurchased = checkIfDateIsExpired ? 0 : 1;
      }
      const filteredEpisodes = results[4].map((ep, index) => {
        const { file_path, ...rest } = ep;
        return rest;
      });
      audiobook.episodes = filteredEpisodes;
      if (audiobook) {
        return audiobook;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  findOneMybl = async (params, req) => {
    try {
      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetAudioBookDetails",
        endpoint: "/v4/mybl/audiobookid",
        forTask: "Audiobooks",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      const sql = "CALL get_audiobook_mybl(?, ?)";
      const results = await DB.query(sql, [params[0], params[1]]);
      let audiobook = results[0][0];
      let rate = results[1][0];
      audiobook.rating = rate.rating;
      audiobook.rating_count = rate.rating_count;
      let userRatingReview = results[2][0];
      audiobook.user_rating = userRatingReview.user_rating;
      audiobook.review = userRatingReview.review;
      const audiobookCountObj = results[3][0];
      let key = Object.keys(audiobookCountObj)[0];
      audiobook.is_favorite = audiobookCountObj[key] > 0 ? true : false;
      // episodes are in index [4]
      audiobook.episodes = results[4];
      if (audiobook) {
        return audiobook;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  findnextSuggestedAudiobooks = async (params, req) => {
    try {
      let categories = [];

      GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetAudioBookDetails",
        endpoint: "/v3/audiobooks/",
        forTask: "Audiobooks",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      }).catch((error) => {
        console.error("Error:", error);
      });
      const sql2 = `Select ca.category_id as id from categories_audiobooks as ca where ca.audiobook_id = ${params[0]}`;
      const result2 = await DB.query(sql2);

      if (result2) {
        let jsResult2 = Object.values(JSON.parse(JSON.stringify(result2)));
        jsResult2.map((el) => {
          categories.push(el.id);
        });
      }
      const sql3 = `SELECT 
                a.id,
                a.name,
                a.en_name,
                a.author_name,
                a.premium,
                a.thumb_path,
                a.price,
                a.play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), 5)
                    FROM
                        ratings AS r
                    WHERE
                        r.audiobook_id = a.id) AS rating
            FROM
                audiobooks AS a
                    INNER JOIN
                categories_audiobooks ON a.id = categories_audiobooks.audiobook_id
            WHERE
                categories_audiobooks.category_id = 36
                    AND a.approval_status = 1
                    AND a.deleted = FALSE
                    AND categories_audiobooks.category_id
            ORDER BY created_at DESC
            LIMIT 20;`;
      const results3 = await DB.query(sql3);
      if (results3) {
        return {
          data: results3,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getByIdDynamic = async (params, req, res) => {
    try {
      await GlobalTask.insertLogsOptional({
        USERID: req.currentUser ? req.currentUser.id : "",
        userAction: "GetAudioBookDetails",
        endpoint: "/v3/audiobooks/",
        forTask: "Audiobooks",
        source: req.query.source,
        platform: req.query.platform,
        user_ip: req.user_ip,
      });

      // Retrieve audiobook details
      const query1 = `
            SELECT
              a.approval_status,
              a.author_name,
              a.banner_path,
              a.category_id,
              a.channel_id,
              a.contributing_artists,
              a.created_at,
              a.deleted,
              a.description,
              a.discount_price,
              a.for_app,
              a.guid,
              a.id,
              a.name,
              a.en_name,
              a.play_count,
              a.podcast,
              a.premium,
              a.price,
              a.publish_year,
              a.thumb_path,
              a.updated_at,
              a.publisher_id,
              c.name AS c_name,
              e.file_name,
              e.file_path
            FROM
              audiobooks AS a
              LEFT JOIN categories AS c ON c.id = a.category_id
              LEFT JOIN episodes AS e ON e.audiobook_id = a.id
            WHERE
              a.id = ? LIMIT 1;
          `;
      const [audiobookDetails] = await DB.query(query1, [params[0]]);
      let audiobook = audiobookDetails;
      // Retrieve average rating and rating count
      const query2 = `
            SELECT
              IFNULL(AVG(r.rating), 5) AS rating,
              IF(COUNT(r.rating) > 0, COUNT(r.rating), 1) AS rating_count
            FROM
              ratings AS r
            WHERE
              r.audiobook_id = ?;
          `;
      const [ratingDetails] = await DB.query(query2, [params[0]]);
      let rate = ratingDetails;
      audiobook.rating = rate.rating;
      audiobook.rating_count = rate.rating_count;

      // Retrieve user rating and review
      const query3 = `
            SELECT
              COALESCE(MIN(ur.rating), 0.0) AS user_rating,
              COALESCE(MIN(ur.review), '') AS review
            FROM
              ratings AS ur
            WHERE
              ur.audiobook_id = ?
              AND ur.user_id = ?
            LIMIT 1;
          `;
      let [userRatingReview] = await DB.query(query3, [params[0], params[1]]);
      userRatingReview = userRatingReview;
      audiobook.user_rating = userRatingReview.user_rating;
      audiobook.review = userRatingReview.review;

      // Check if there is a match in users_audiobooks
      const query4 = `
            SELECT
              EXISTS(
                SELECT *
                FROM users_audiobooks
                WHERE user_id = ? AND audiobook_id = ?
              ) AS MATCH_COUNT;
          `;
      const [audiobookCountObj] = await DB.query(query4, [
        params[1],
        params[0],
      ]);
      let key = Object.keys(audiobookCountObj)[0];
      audiobook.is_favorite = audiobookCountObj[key] > 0 ? true : false;

      // Retrieve episodes for the audiobook
      const query5 = `
            SELECT
              *
            FROM
              episodes
            WHERE
              audiobook_id = ?;
          `;
      const episodes = await DB.query(query5, [params[0]]);
      const episodesData = await episodes.map((episode) => {
        return {
          ...episode,
          file_path: `https://api.kabbik.com/v3/audiobooks/episodes/${episode.id}/audio`, // Replace getBlobUrl with your function
        };
      });
      audiobook.episodes = episodesData;

      if (audiobook) {
        return audiobook;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };
  streamEpisode = async (params, req, res) => {
    try {
      const episodeId = parseInt(req.params.id);

      // Retrieve episode details from the database (replace this with your own logic)
      const query = `
            SELECT
              *
            FROM
              episodes
            WHERE
              id = ? LIMIT 1;
          `;
      const [episode] = await DB.query(query, episodeId);

      if (!episode) {
        return res.status(404).send("Episode not found");
      }

      const fileUrl = episode.file_path;

      // Fetch file content directly from the URL
      const response = await axios.get(fileUrl, {
        responseType: "arraybuffer",
      });

      // Set appropriate headers for byte range requests
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", response.data.length);
      res.setHeader(
        "Content-Range",
        `bytes 0-${response.data.length - 1}/${response.data.length}`
      );
      res.setHeader("Content-Disposition", `attachment; filename="${fileUrl}"`);
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for one year, adjust as needed

      // Send the Buffer as a response
      res.status(200).send(response.data);
    } catch (error) {
      console.error("Error fetching file:", error.message);
      res.status(500).send("Error fetching file");
    }
  };

  findNextOne = async (params, req) => {
    try {
      const sql =
        "select * from audiobooks join (select * from categories_audiobooks where category_id = (select category_id from categories_audiobooks where audiobook_id = ? limit 1) and categories_audiobooks.audiobook_id <> ?) as temp on audiobooks.id = temp.audiobook_id order by rand() limit 1";
      const result = await DB.query(sql, [params[0], params[0]]);
      return result;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

   getByIdNewReview = async (params) => {
    try {
      const sql =
        "SELECT ku.user_name,ku.full_name, ku.image_url, kr.* FROM kabbik.ratings as kr join users as ku where kr.user_id = ku.id and kr.audiobook_id = ?  order by kr.updated_at desc";

      const results = await DB.query(sql, [params[0]]);
      if (results) {
        let parentMapper={},childMapper={};
                results?.forEach((item)=>{
          
          if(item?.parent_id){
            if(!childMapper[item?.parent_id]){
              childMapper[item?.parent_id]=[]
            }
            childMapper[item.parent_id].push(item);
          }else{
            parentMapper[item?.id]=item;
          }
        })
        Object.keys(childMapper).map(key=>{
          if(parentMapper[key])parentMapper[key].reply=childMapper[key];
        })
        return Object.values(parentMapper);
      }
      return undefined;
    } catch (e) {
      console.log(e,"error In getReview")
      LoggerError.log(e);
      return undefined;
    }
  };

  findOneforAdmin = async (params) => {
    try {
      const sql = "CALL get_audiobook(?, ?)";
      const results = await DB.query(sql, [params[0], 1]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  findOneOld = async (params) => {
    try {
      const sql = "CALL get_audiobook_old(?, ?)";
      const results = await DB.query(sql, [params[0], params[1]]);
      var audiobook = results[0][0];
      const audiobookCountObj = results[1][0];
      let key = Object.keys(audiobookCountObj)[0];
      audiobook.is_favorite = audiobookCountObj[key] > 0 ? true : false;
      if (audiobook) {
        return audiobook;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getCombinedData = async () => {
    const sql = "CALL get_combined_data()";
    try {
      const results = await DB.query(sql);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getPlaylist = async (count) => {
    const sql = "CALL get_playlist(?)";
    try {
      const results = await DB.query(sql, [count]);
      if (results) {
        return results[0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  create = async (
    name,
    description,
    author,
    contributingArtists,
    price,
    premium,
    audiobookImageUrl,
    bannerImageUrl,
    category_value,
    channelId,
    publisher_id
  ) => {
    const sql =
      "CALL create_audiobook_stand_alone(?, ?, ?, ?, ?, ?, ?, ?, ?,?)";
    try {
      const results = await DB.query(sql, [
        name,
        description,
        author,
        contributingArtists,
        price,
        premium,
        audiobookImageUrl,
        bannerImageUrl,
        channelId,
        publisher_id,
      ]);
      if (results) {
        // sp returns extra data, need the first one
        let count = 0;
        const audioBookId = results[0][0].last_id;
        category_value.forEach(async (element) => {
          const sql = `INSERT INTO categories_audiobooks (category_id, audiobook_id) VALUES (${element.id}, ${audioBookId})`;
          const result = await DB.query(sql);
          if (result) {
            count++;
          }
        });
        return results[0][0];
      }
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  createV3 = async (
    name,
    description,
    author,
    contributingArtists,
    price,
    premium,
    audiobookImageUrl,
    bannerImageUrl,
    category_value,
    channelId,
    publisher_id
  ) => {
    const sql =
      "CALL create_audiobook_stand_alone(?, ?, ?, ?, ?, ?, ?, ?, ?,?)";
    try {
      const results = await DB.query(sql, [
        name,
        description,
        author,
        contributingArtists,
        price,
        premium,
        audiobookImageUrl,
        bannerImageUrl,
        channelId,
        publisher_id,
      ]);
      if (results) {
        // sp returns extra data, need the first one
        let count = 0;
        const audioBookId = results[0][0].last_id;
        category_value.forEach(async (element) => {
          const sql = `INSERT INTO categories_audiobooks (category_id, audiobook_id) VALUES (${element.id}, ${audioBookId})`;
          const result = await DB.query(sql);
          if (result) {
            count++;
          }
        });
        return results[0][0];
      }
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  uploadBannerImage = async (title, img_url, size, description, deleted) => {
    let sql = null;
    try {
      if (img_url) {
        sql = `INSERT INTO image_stack (title, img_url, size, description, deleted) VALUES (?, ?, ?, ?, ?);`;
        const results = await DB.query(sql, [
          title,
          img_url,
          size,
          description,
          0,
        ]);
        if (results) {
          return results;
        }
      } else {
        // sql = `INSERT INTO categories (name, deleted) VALUES (?, ?);`;
        // const results = await DB.query(sql, [category_name, 0]);
        // if (results) {
        return "Failed to upload. no image";
        // }
      }
    } catch (error) {
      console.log(error);
      LoggerError.log(error);
      return undefined;
    }
  };

  createCombined = async (
    name,
    description,
    author,
    contributingArtists,
    price,
    guid,
    premium,
    thumbPath,
    bannerPath,
    filePath,
    category_value,
    channelId,
    podcastStatus,
    publisher_id
  ) => {
    if (podcastStatus == null) {
      podcastStatus = 3;
    }

    const sql =
      "CALL create_audiobook_combined_podcast(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    try {
      const results = await DB.query(sql, [
        name,
        description,
        author,
        contributingArtists,
        price,
        guid,
        premium,
        thumbPath,
        bannerPath,
        filePath,
        channelId,
        podcastStatus,
        publisher_id,
      ]);
      if (results) {
        // sp returns extra data, need the first one
        const category_value_obj = JSON.parse(category_value);
        let count = 0;
        const audioBookId = results[1][0].last_id;
        if (category_value != null) {
          category_value_obj.forEach(async (element) => {
            const sql = `INSERT INTO categories_audiobooks (category_id, audiobook_id) VALUES (${element.id}, ${audioBookId})`;
            const result = await DB.query(sql);
            if (result) {
              count++;
            }
          });
        }
        return results[0][0];
      }
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  createCombinedV3 = async (
    name,
    description,
    author,
    contributingArtists,
    price,
    guid,
    premium,
    thumbPath,
    bannerPath,
    filePath,
    category_value,
    channelId,
    podcastStatus,
    publisher_id,
    duration
  ) => {
    if (podcastStatus == null) {
      podcastStatus = 3;
    }
    const sql =
      "CALL create_audiobook_combined_podcast_v3(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    try {
      const results = await DB.query(sql, [
        name,
        description,
        author,
        contributingArtists,
        price,
        guid,
        premium,
        thumbPath,
        bannerPath,
        filePath,
        channelId,
        podcastStatus,
        publisher_id,
        duration,
      ]);
      if (results) {
        // sp returns extra data, need the first one
        const category_value_obj = JSON.parse(category_value);
        let count = 0;
        const audioBookId = results[1][0].last_id;
        if (category_value != null) {
          category_value_obj.forEach(async (element) => {
            const sql = `INSERT INTO categories_audiobooks (category_id, audiobook_id) VALUES (${element.id}, ${audioBookId})`;
            const result = await DB.query(sql);
            if (result) {
              count++;
            }
          });
        }
        return results[0][0];
      }
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  createFromRssFeed = async (
    name,
    thumbPath,
    filePath,
    categoryId,
    channelId
  ) => {};

  findWithGuid = async () => {
    const sql = `SELECT guid FROM ${this.tableName} WHERE NOT guid=''`;
    try {
      const results = await DB.query(sql);
      if (results) {
        return results;
      }
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

   createOrUpdateRating = async (rating, review, audiobookId, userId,parent) => {
    try {
      let results, results2;
      if(parent){
                let sql2 = `INSERT INTO ratings  (rating,review,deleted,audiobook_id,user_id,parent_id) 
        VALUES(?,?,?,?,?,?)`
        results2 = await DB.query(sql2, [
          rating,
          review,
          false,
          audiobookId,
          userId,
          parent
        ]);
      }else{
        const sql = "CALL create_or_update_rating(?, ?, ?, ?)";
        results = await DB.query(sql, [
          rating,
          review,
          audiobookId,
          userId,
        ]);
      }
      
      if (results || results2) {
        // sp returns extra data, need the first one
        let data;
        if(results){
          coreUtils.getValueForKey(results?.[0]?.[0]);
        }
        return data || 1;
      }
    } catch (e) {
      console.log(e,"hahamessage")
      LoggerError.log(e);
      return undefined;
    }
  };
  updatePlayCount = async (
    audiobookId,
    userId,
    episodeId,
    fromChannel,
    req
  ) => {
    var isPremiumUser = 0;
    if (!userId) {
      userId = 0;
    } else {
      const getUsers = "SELECT id from users where id = ? && is_subscribed = ?";
      const resulgetUsers = await DB.query(getUsers, [userId, 1]);

      if (resulgetUsers.length > 0) {
        isPremiumUser = 1;
      } else {
        isPremiumUser = 0;
      }
    }
    if (!fromChannel) {
      fromChannel = "Not Defined";
      // do error stuff
    }

    const getUsersgetAudiobook =
      "SELECT id from audiobooks where id = ? && price = ?";
    const resulgetAudiobook = await DB.query(getUsersgetAudiobook, [
      audiobookId,
      0,
    ]);

    var premium = 0;
    if (resulgetAudiobook.length > 0) {
      premium = 0;
    } else {
      premium = 1;
    }

    let user_ip;

    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }

    const insertSql =
      "INSERT INTO audiobook_play_count_log(user_id, audiobook_id, episode_id, from_channel, isPremiumAudiobook, isSubscribedUser, user_ip) VALUES (?, ?, ?,?, ?, ?, ?);";
    try {
      const resultsInsertSql = await DB.query(insertSql, [
        userId,
        audiobookId,
        episodeId,
        fromChannel,
        premium,
        isPremiumUser,
        user_ip,
      ]);
      if (resultsInsertSql) {
        return resultsInsertSql;
      }
      return undefined;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  };

  updatePlayCountEpisodes = async (episodeId, userId, fromChannel, req) => {
    var isPremiumUser = 0;
    if (!userId) {
      userId = 0;
    } else {
      const getUsers = "SELECT id from users where id = ? && is_subscribed = ?";
      const resulgetUsers = await DB.query(getUsers, [userId, 1]);

      if (resulgetUsers.length > 0) {
        isPremiumUser = 1;
      } else {
        isPremiumUser = 0;
      }
    }
    if (!fromChannel) {
      fromChannel = "Not Defined";
      // do error stuff
    }
    const getEpisode = "SELECT id from episodes where id = ? && isfree = ?;";
    const resulgetEpisode = await DB.query(getEpisode, [episodeId, 0]);

    var premium = 0;
    if (resulgetEpisode.length > 0) {
      premium = 1;
    } else {
      premium = 0;
    }
    let user_ip;
    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }

    const insertSql =
      "INSERT INTO audiobook_play_count_log(user_id, episode_id, from_channel, isPremiumEpisode, isSubscribedUser, user_ip) VALUES (?, ?, ?, ?, ?, ?);";
    try {
      const resultsInsertSql = await DB.query(insertSql, [
        userId,
        episodeId,
        fromChannel,
        premium,
        isPremiumUser,
        user_ip,
      ]);

      const sqlFind = "SELECT audiobook_id FROM episodes Where id = ?;";
      const resultFind = await DB.query(sqlFind, [episodeId]);

      if (resultFind.length > 0) {
        try {
          var audiobookId = resultFind[0].audiobook_id;
          const sql = "CALL update_play_count(?)";
          const result = await DB.query(sql, [audiobookId]);
          if (result) {
            return result;
          }
        } catch (e) {
          console.log(e);
          LoggerError.log(e);
          return undefined;
        }
      }

      return resultFind;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  updatePlayCountMybl = async (
    audiobookId,
    userId,
    episodeId,
    fromChannel,
    req
  ) => {
    var isPremiumUser = 0;
    if (!userId) {
      userId = 0;
    } else {
      const getUsers = "SELECT id from users where id = ? && is_subscribed = ?";
      const resulgetUsers = await DB.query(getUsers, [userId, 1]);
      if (resulgetUsers.length > 0) {
        isPremiumUser = 1;
      } else {
        isPremiumUser = 0;
      }
    }
    if (!fromChannel) {
      fromChannel = "Not Defined";
      // do error stuff
    }

    const getUsersgetAudiobook =
      "SELECT id from audiobooks where id = ? && price = ?";
    const resulgetAudiobook = await DB.query(getUsersgetAudiobook, [
      audiobookId,
      0,
    ]);

    var premium = 0;
    if (resulgetAudiobook.length > 0) {
      premium = 0;
    } else {
      premium = 1;
    }

    let user_ip;

    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }

    const insertSql =
      "INSERT INTO audiobook_play_count_log_mybl(user_id, audiobook_id, episode_id, from_channel, isPremiumAudiobook, isSubscribedUser, user_ip) VALUES (?, ?, ?,?, ?, ?, ?);";
    try {
      const resultsInsertSql = await DB.query(insertSql, [
        userId,
        audiobookId,
        episodeId,
        fromChannel,
        premium,
        isPremiumUser,
        user_ip,
      ]);
      if (resultsInsertSql) {
        return resultsInsertSql;
      }
      return undefined;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  };

  updatePlayCountEpisodesMybl = async (episodeId, userId, fromChannel, req) => {
    var isPremiumUser = 0;
    if (!userId) {
      userId = 0;
    } else {
      const getUsers = "SELECT id from users where id = ? && is_subscribed = ?";
      const resulgetUsers = await DB.query(getUsers, [userId, 1]);

      if (resulgetUsers.length > 0) {
        isPremiumUser = 1;
      } else {
        isPremiumUser = 0;
      }
    }
    if (!fromChannel) {
      fromChannel = "Not Defined";
      // do error stuff
    }
    const getEpisode = "SELECT id from episodes where id = ? && isfree = ?;";
    const resulgetEpisode = await DB.query(getEpisode, [episodeId, 0]);

    var premium = 0;
    if (resulgetEpisode.length > 0) {
      premium = 1;
    } else {
      premium = 0;
    }
    let user_ip;

    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }

    const insertSql =
      "INSERT INTO audiobook_play_count_log_mybl(user_id, episode_id, from_channel, isPremiumEpisode, isSubscribedUser, user_ip) VALUES (?, ?, ?, ?, ?, ?);";
    try {
      const resultsInsertSql = await DB.query(insertSql, [
        userId,
        episodeId,
        fromChannel,
        premium,
        isPremiumUser,
        user_ip,
      ]);

      const sqlFind = "SELECT audiobook_id FROM episodes Where id = ?;";
      const resultFind = await DB.query(sqlFind, [episodeId]);

      if (resultFind.length > 0) {
        try {
          var audiobookId = resultFind[0].audiobook_id;
          const sql = "CALL update_play_count_mybl(?)";
          const result = await DB.query(sql, [audiobookId]);
          if (result) {
            return result;
          }
        } catch (e) {
          console.log(e);
          LoggerError.log(e);
          return undefined;
        }
      }

      return resultFind;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  updateIsFree = async (isFree, episodeId, audiobookId) => {
    if (!episodeId) {
      return;
    }

    const updateSql = "UPDATE episodes SET isFree = ?  WHERE id = ?;";
    try {
      const resultUpdateLock = await DB.query(updateSql, [isFree, episodeId]);
      return resultUpdateLock;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAssignedCategory = async (id) => {
    const sql = `SELECT
        c.id,
        c.name,
        ca.id as ca_id
        FROM
        categories AS c
        INNER JOIN categories_audiobooks AS ca
		ON c.id = ca.category_id
		WHERE ca.audiobook_id = ?`;
    try {
      const results = await DB.query(sql, [id]);
      if (results) {
        return results;
      }
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  updateTrackFiles = async (id, thumbPath, filePath) => {
    const sql = "UPDATE tracks SET thumb_path = ?, file_path = ? WHERE id = ?";
    try {
      const results = await DB.query(sql, [thumbPath, filePath, id]);
      if (results) {
        return results;
      }
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  audioBookAnalytics = async (platform, userId, audioBookId) => {
    const deleted = 0;
    const sql =
      "INSERT INTO audiobook_analytics(platform, audiobook_id, user_id, deleted) VALUES (?, ?, ?, ?);";
    try {
      const results = await DB.query(sql, [
        platform,
        audioBookId,
        userId,
        deleted,
      ]);
      if (results) {
        return results;
      }
    } catch (error) {
      console.log(error);
      LoggerError.log(error);
      return undefined;
    }
  };

  getUserPurchased = async (user_id) => {
    const sql = "CALL get_user_purchases(?)";
    try {
      const result = await DB.query(sql, [user_id]);
      if (result) {
        return result[0];
      }
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  deleteAudioBook = async (id, status) => {
    try {
      const sql = `UPDATE ${this.tableName} SET deleted = ? WHERE id = ?`;
      const results = await DB.query(sql, [status, id]);
      if (results) {
        return results;
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  // seemoreCategoryWise = async (name) => {
  //   try {
  //     console.log(name,"inside seemoreCategoryWise model");
  //     let data = {
  //       data: [],
  //     };
  //     var sql;
  //     console.log(name,"inside seemoreCategoryWise");
  //     if(name==="শীর্ষ ১০"){
  //       console.log(name,"inside top 10");
  //       sql = `SELECT 
  //               a.id,
  //           a.name,
  //           a.description,
  //           a.author_name,
  //           a.premium,
  //           a.thumb_path,
  //           a.price,
  //           a.play_count,
  //                   (SELECT 
  //                           IFNULL(AVG(r.rating), 5)
  //                       FROM
  //                           ratings AS r
  //                       WHERE
  //                           r.audiobook_id = a.id) AS rating
  //               FROM
  //                   audiobooks AS a
  //               WHERE
  //                   a.podcast = 0 AND a.approval_status = 1
  //                       AND a.deleted = FALSE
  //                       and a.for_home = 1
  //                       and a.for_rent =1
  //               ORDER BY play_count DESC LIMIT 20;`;
  //     }
  //     else if (name == "ট্রেন্ডিং") {
  //       sql = `SELECT 
  //               a.id,
  //           a.name,
  //           a.description,
  //           a.author_name,
  //           a.premium,
  //           a.thumb_path,
  //           a.price,
  //           a.play_count,
  //                   (SELECT 
  //                           IFNULL(AVG(r.rating), 5)
  //                       FROM
  //                           ratings AS r
  //                       WHERE
  //                           r.audiobook_id = a.id) AS rating
  //               FROM
  //                   audiobooks AS a
  //               WHERE
  //                   a.podcast = 0 AND a.approval_status = 1
  //                       AND a.deleted = FALSE
  //               ORDER BY play_count DESC LIMIT 20;`;
  //     } else if (name == "নতুন") {
  //       sql = `SELECT 
  //           a.id,
  //       a.name,
  //       a.description,
  //       a.author_name,
  //       a.premium,
  //       a.thumb_path,
  //       a.price,
  //       a.play_count,
  //               (SELECT 
  //                       IFNULL(AVG(r.rating), 5)
  //                   FROM
  //                       ratings AS r
  //                   WHERE
  //                       r.audiobook_id = a.id) AS rating
  //           FROM
  //               audiobooks AS a
  //           WHERE
  //               a.podcast = 0 AND a.approval_status = 1
  //                   AND a.deleted = FALSE
  //           ORDER BY created_at DESC LIMIT 20;`;
  //     } else if (name == "ফ্রি") {
  //       sql = `SELECT 
  //           a.id,
  //       a.name,
  //       a.description,
  //       a.author_name,
  //       a.premium,
  //       a.thumb_path,
  //       a.price,
  //       a.play_count,
  //               (SELECT 
  //                       IFNULL(AVG(r.rating), 5)
  //                   FROM
  //                       ratings AS r
  //                   WHERE
  //                       r.audiobook_id = a.id) AS rating
  //           FROM
  //               audiobooks AS a
  //           WHERE
  //               a.podcast = 0 AND a.premium = 0 AND a.approval_status = 1
  //                   AND a.deleted = FALSE
  //           ORDER BY created_at DESC;`;
  //     } else if (name == "প্রিমিয়াম") {
  //       sql = `SELECT 
  //           a.id,
  //       a.name,
  //       a.description,
  //       a.author_name,
  //       a.premium,
  //       a.thumb_path,
  //       a.price,
  //       a.play_count,
  //       (SELECT 
  //               IFNULL(AVG(r.rating), 5)
  //           FROM
  //               ratings AS r
  //           WHERE
  //               r.audiobook_id = a.id
  //       ) AS rating
  //       FROM
  //           audiobooks AS a
  //       WHERE
  //           a.podcast = 0 AND a.premium = 1 AND a.approval_status = 1
  //               AND a.deleted = FALSE`;
  //     } else if (name == "পডকাস্ট") {
  //       sql = `SELECT 
  //               a.id,
  //           a.name,
  //           a.description,
  //           a.author_name,
  //           a.premium,
  //           a.thumb_path,
  //           a.price,
  //           a.play_count,
  //           (SELECT 
  //                   IFNULL(AVG(r.rating), 5)
  //               FROM
  //                   ratings AS r
  //               WHERE
  //                   r.audiobook_id = a.id
  //           ) AS rating
  //           FROM
  //               audiobooks AS a
  //           WHERE
  //               a.podcast = 1 AND a.approval_status = 1
  //                   AND a.deleted = FALSE;`;
  //     } else {
  //       sql = `SELECT 
  //                   a.id,
  //                   a.name,
  //                   a.description,
  //                   a.author_name,
  //                   a.premium,
  //                   a.thumb_path,
  //                   a.price,
  //                   a.play_count,
  //                   (SELECT 
  //                           IFNULL(AVG(r.rating), 5)
  //                       FROM
  //                           ratings AS r
  //                       WHERE
  //                           r.audiobook_id = a.id) AS rating
  //               FROM
  //                   audiobooks AS a
  //               WHERE
  //                   a.approval_status = 1
  //                       AND a.id IN (SELECT 
  //                           cs.audiobook_id
  //                       FROM
  //                           categories_audiobooks as cs
  //                       WHERE
  //                           cs.category_id IN(
  //                   SELECT 
  //                   categories.id
  //               FROM
  //                   categories
  //               WHERE
  //                   categories.name = ?))  AND a.approval_status = 1 AND a.deleted = FALSE
  //                   ORDER BY a.created_at DESC;;`;
  //     }

  //     const result = await DB.query(sql, [name]);
  //     console.log(result,"inside seemoreCategoryWise model");
  //     if (result) {
  //       data.data.push({
  //         name: "data",
  //         data: result,
  //       });
  //     }
  //     if (data) {
  //       return data;
  //     }
  //     return undefined;
  //   } catch (e) {
  //     console.log(e);
  //     coreUtils.printStringify(e);
  //     LoggerError.log(e);
  //     return undefined;
  //   }
  // };

  seemoreCategoryWise = async (name) => {
    try {
      let data = {
        data: [],
      };
      var sql;
      if(name==="শীর্ষ ১০"){
                sql = `SELECT 
                a.id,
            a.name,
            a.description,
            a.author_name,
            a.premium,
            a.thumb_path,
            a.price,
            a.play_count,
                    (SELECT 
                            IFNULL(AVG(r.rating), 5)
                        FROM
                            ratings AS r
                        WHERE
                            r.audiobook_id = a.id) AS rating
                FROM
                    audiobooks AS a
                WHERE
                    a.podcast = 0 AND a.approval_status = 1
                        AND a.deleted = FALSE
                        and a.for_home = 1
                        and a.for_rent =1
                ORDER BY play_count DESC LIMIT 10;`;
      }
      else if (name == "ট্রেন্ডিং") {
        sql = `SELECT 
                a.id,
            a.name,
            a.description,
            a.author_name,
            a.premium,
            a.thumb_path,
            a.price,
            a.play_count,
                    (SELECT 
                            IFNULL(AVG(r.rating), 5)
                        FROM
                            ratings AS r
                        WHERE
                            r.audiobook_id = a.id) AS rating
                FROM
                    audiobooks AS a
                WHERE
                    a.podcast = 0 AND a.approval_status = 1
                        AND a.deleted = FALSE
                ORDER BY play_count DESC LIMIT 20;`;
      } else if (name == "নতুন") {
        sql = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), 5)
                    FROM
                        ratings AS r
                    WHERE
                        r.audiobook_id = a.id) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC LIMIT 20;`;
      } else if (name == "ফ্রি") {
        sql = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
                (SELECT 
                        IFNULL(AVG(r.rating), 5)
                    FROM
                        ratings AS r
                    WHERE
                        r.audiobook_id = a.id) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 0 AND a.premium = 0 AND a.approval_status = 1
                    AND a.deleted = FALSE
            ORDER BY created_at DESC;`;
      } else if (name == "প্রিমিয়াম") {
        sql = `SELECT 
            a.id,
        a.name,
        a.description,
        a.author_name,
        a.premium,
        a.thumb_path,
        a.price,
        a.play_count,
        (SELECT 
                IFNULL(AVG(r.rating), 5)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = a.id
        ) AS rating
        FROM
            audiobooks AS a
        WHERE
            a.podcast = 0 AND a.premium = 1 AND a.approval_status = 1
                AND a.deleted = FALSE`;
      } else if (name == "পডকাস্ট") {
        sql = `SELECT 
                a.id,
            a.name,
            a.description,
            a.author_name,
            a.premium,
            a.thumb_path,
            a.price,
            a.play_count,
            (SELECT 
                    IFNULL(AVG(r.rating), 5)
                FROM
                    ratings AS r
                WHERE
                    r.audiobook_id = a.id
            ) AS rating
            FROM
                audiobooks AS a
            WHERE
                a.podcast = 1 AND a.approval_status = 1
                    AND a.deleted = FALSE;`;
      } else {
        sql = `SELECT 
                    a.id,
                    a.name,
                    a.description,
                    a.author_name,
                    a.premium,
                    a.thumb_path,
                    a.price,
                    a.play_count,
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
                            categories_audiobooks as cs
                        WHERE
                            cs.category_id IN(
                    SELECT 
                    categories.id
                FROM
                    categories
                WHERE
                    categories.name = ?))  AND a.approval_status = 1 AND a.deleted = FALSE
                    ORDER BY a.created_at DESC;;`;
      }
      const result = await DB.query(sql, [name]);
      if (result) {
        data.data.push({
          name: "data",
          data: result,
        });
      }
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      console.log(e);
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  postPurchaedAudioBook = async (req) => {
    const checkExistsQuery = `SELECT Count(*) as is_exist FROM audiobooks_rent  WHERE user_id = ? AND audiobook_id = ?`;

    const insertQuery = `INSERT INTO audiobooks_rent (user_id, audiobook_id, expired_at) VALUES (?,?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 MONTH))`;

    const insertQueryForLog = `INSERT INTO audiobooks_rent_log (user_id, audiobook_id, expired_at) VALUES (?,?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 MONTH))`;

    const updateQuery = `
         UPDATE audiobooks_rent
        SET expired_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 MONTH)
        WHERE user_id = ? AND audiobook_id = ?`;

    const audioBookSearchQuery = `SELECT * FROM audiobooks_rent WHERE user_id = ? AND audiobook_id = ?`;

    try {
      const check = await DB.query(checkExistsQuery, [
        req.body.user_id,
        req.body.audiobook_id,
      ]);
      let data;
      if (check[0].is_exist > 0) {
        await DB.query(updateQuery, [req.body.user_id, req.body.audiobook_id]);

        const updatedData = await DB.query(audioBookSearchQuery, [
          req.body.user_id,
          req.body.audiobook_id,
        ]);

        data = {
          status: true,
          message: "Updated",
          data: updatedData[0],
        };
      } else {
        await DB.query(insertQuery, [req.body.user_id, req.body.audiobook_id]);

        const insertedData = await DB.query(audioBookSearchQuery, [
          req.body.user_id,
          req.body.audiobook_id,
        ]);

        data = {
          status: true,
          message: "Inserted",
          data: insertedData[0],
        };
      }
      DB.query(insertQueryForLog, [req.body.user_id, req.body.audiobook_id]);
      return data;
    } catch (error) {
      console.error("Error in purchaedAudioBook:", error);
      return {
        success: "false",
        message: "Not found",
      };
    }
  };

  uploadAudiobookRefined = async (req) => {
    try {
      const {
        name,
        enName,
        description,
        author,
        contributor,
        price,
        isPremium,
        audiobookImage,
        bannerImage,
        isPodcast,
        publisher,
        category,
      } = req.body;
      const audiobookUploadQuery = `
        CALL create_audiobook_refined(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const result = await DB.query(audiobookUploadQuery, [
        name,
        enName,
        description,
        author,
        contributor,
        price,
        isPremium ? 1 : 0,
        audiobookImage,
        bannerImage,
        isPodcast ? 1 : 0,
        publisher,
      ]);
      const lastAudiobookId = result[0][0].last_id;
      if (lastAudiobookId && category.length) {
        const addCategoryQuery = `
          INSERT INTO categories_audiobooks (category_id, audiobook_id) VALUES ${category.map(
            (cat) => `(${cat}, ${lastAudiobookId})`
          )};
        `;
        const result = await DB.query(addCategoryQuery);
        return {
          success: true,
          message: "Audiobook created without episodes",
          audiobookId: lastAudiobookId,
        };
      }
      return {
        success: true,
        message: "Audiobook created without episodes",
        audiobookId: lastAudiobookId,
      };
    } catch (err) {
      console.error(err);
      return {
        sucess: false,
        message: "Could not create audiobook",
      };
    }
  };

  updateAudiobookRefined = async (req) => {
    try {
      const {
        name,
        enName,
        description,
        author,
        contributor,
        price,
        isPremium,
        audiobookImage,
        bannerImage,
        isPodcast,
        publisher,
        category,
        id,
      } = req.body;
      const audiobookUploadQuery = `
        UPDATE audiobooks
        SET
          name = ?,
          en_name = ?,
          description = ?,
          author_name = ?,
          contributing_artists = ?,
          price = ?,
          premium = ?,
          thumb_path = ?,
          banner_path = ?,
          podcast = ?,
          publisher_id = ?
        WHERE id = ?
      `;
      const result = await DB.query(audiobookUploadQuery, [
        name,
        enName,
        description,
        author,
        contributor,
        price,
        isPremium ? 1 : 0,
        audiobookImage,
        bannerImage,
        isPodcast ? 1 : 0,
        Number(publisher),
        id,
      ]);
      const deletePrevCategoryQuery = `
        DELETE FROM categories_audiobooks WHERE audiobook_id = ?
      `;
      const deleteResult = await DB.query(deletePrevCategoryQuery, [id]);
      if (category.length) {
        const addCategoryQuery = `
          INSERT INTO categories_audiobooks (category_id, audiobook_id) VALUES ${category.map(
            (cat) => `(${cat}, ${id})`
          )};
        `;
        const result = await DB.query(addCategoryQuery);
      }
      return {
        success: true,
        message: "Audiobook updated",
      };
    } catch (err) {
      console.error(err);
      return {
        sucess: false,
        message: "Could not update",
      };
    }
  };
}
module.exports = new AudiobookModel();
