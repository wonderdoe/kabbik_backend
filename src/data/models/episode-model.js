const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const coreUtils = require("../../utils/core-utils");
const { param } = require("../../routers/v1/auth-router");
const { duration } = require("moment");

class EpisodeModel {
  tableName = "episodes";

  getAllBYAudiobookId = async (params) => {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE audiobook_id = ?`;
      const result = await DB.query(sql, [params[0]]);
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

  create = async (name, fileUrl, audiobookId) => {
    const sql = "CALL create_episode(?, ?, ?)";
    try {
      const results = await DB.query(sql, [name, fileUrl, audiobookId]);
      if (results) {
        // sp returns extra data, need the first one
        return results[0][0];
      }
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  createV3 = async (name, duration, fileUrl, audiobookId) => {
    const sql = "CALL create_episode_v3(?, ?, ?, ?)";
    try {
      const results = await DB.query(sql, [
        name,
        duration,
        fileUrl,
        audiobookId,
      ]);
      if (results) {
        // sp returns extra data, need the first one
        return results[0][0];
      }
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  updateEpisode = async (name, audioUrl, episodeId) => {
    if (audioUrl == null) {
      const sql = `UPDATE ${this.tableName} SET name = ? WHERE id = ? `;
      const results = await DB.query(sql, [name, episodeId]);
      if (results) {
        return results;
      }
    } else {
      const sql = `UPDATE  ${this.tableName} SET name = ?, file_path = ? WHERE id =  ?;`;
      const results = await DB.query(sql, [name, audioUrl, episodeId]);
      if (results) {
        return results;
      }
    }
  };
  updateEpisodeWithFile = async (name, audioUrl, duration, episodeId) => {
    // if (audioUrl == null) {
    //     const sql = `UPDATE ${this.tableName} SET name = ? WHERE id = ? `;
    //     const results = await DB.query(sql, [name, episodeId]);
    //     if (results) {
    //         return results;
    //     }

    // } else {
    const sql = `UPDATE  ${this.tableName} SET name = ?, file_path = ?, duration = ? WHERE id =  ?;`;
    const results = await DB.query(sql, [name, audioUrl, duration, episodeId]);
    if (results) {
      return results;
    }
    // }
  };

  addEpisodes = async (req, withAudiobook = false) => {
    try {
            const { episodeList, audiobookId } = req.body;
      if (episodeList.length) {
        const query = `
        INSERT INTO episodes (
          name,
          duration,
          file_path,
          audiobook_id,
          bgm_filepath
          ) VALUES ${episodeList.map(() => "(?, ?, ?, ?, ?)").join(", ")};
          `;
        const values = episodeList.flatMap((ep) => [
          ep.name,
          ep.duration,
          ep.path,
          audiobookId,
          ep.bgm === "" ? null : ep.bgm,
        ]);

                const result = await DB.query(query, values);
                return {
          success: true,
          message: withAudiobook
            ? "Audiobook created with episodes"
            : "Episodes uploaded",
        };
      }
      return undefined;
    } catch (err) {
      console.error(err);
      LoggerError.log(err);
      return undefined;
    }
  };

  getEpisodeUrl = async (audiobookId, episodeId) => {
    try {
      const query = `SELECT file_path, duration FROM episodes WHERE id = ? AND audiobook_id = ?;`;
      const result = await DB.query(query, [episodeId, audiobookId]);
      return result[0];
    } catch (err) {
      console.error(err);
      LoggerError.log(err);
      return undefined;
    }
  };
}

module.exports = new EpisodeModel();
