const EpisodeModel = require("../data/models/episode-model");
const S3Helper = require("../utils/s3-helper");
const MulterHelper = require("../utils/multer-helper");
const HttpException = require("../utils/httpexception-utils");
const ResponseUtils = require("../utils/res-utils");
const constants = require("../utils/constants");
const { validationResult } = require("express-validator");
const coreUtils = require("../utils/core-utils");
require("dotenv").config();

class EpisodeController {
  getAllBYAudiobookId = async (req, res) => {
    const data = await EpisodeModel.getAllBYAudiobookId(req.query.audiobook_id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  create = async (req, res) => {
    S3Helper.upload(req, res, async function (err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
                    LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        } else {
          // An unknown error occurred when uploading.
                    LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        }
      }

      // good to go
      let audioUrl = null;
      if (req.files && req.files.length > 0) {
        audioUrl = coreUtils.replaceHTTP(req.files[0].location);
      }
      if (audioUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to create"
        );
      }
      const { name, audiobook_id: audiobookId } = req.body;
      const result = await EpisodeModel.create(name, audioUrl, audiobookId);
      if (!result) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_201, {
        id: result.last_id,
      });
    });

    /* MulterHelper.upload(req, res, async function (err) {
            if (err) {
                if (err instanceof multer.MulterError) {
                    // A Multer error occurred when uploading.
                    LoggerError.log(err)
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                } else {
                    // An unknown error occurred when uploading.
                    LoggerError.log(err)
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                }
            }
            // good to go
            console.log(req.files)
            const file = req.files[0]
            const imageUrl = file.destination + '/' + file.filename;
            const fileAudio = req.files[1]
            const fileUrl = fileAudio.destination + '/' + fileAudio.filename;
            const {
                name,
                description,
                author,
                contributing_artists: contributingArtists,
                price,
                category_id: categoryId,
                channel_id: channelId
            } = req.body;
            const priceFloat = parseFloat(price).toFixed(2)
            const result = await AudiobookModel.createCombined(
                name,
                description,
                author,
                contributingArtists,
                priceFloat,
                imageUrl,
                fileUrl,
                categoryId,
                channelId
            );
            if (!result) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_201,
                {
                    id: result.last_id,
                    image_file_url: imageUrl
                }
            );
        }); */
  };
  createV3 = async (req, res) => {
    S3Helper.upload(req, res, async function (err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
                    LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        } else {
          // An unknown error occurred when uploading.
                    LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        }
      }

      // good to go

      let audioUrl = null;
      if (req.files && req.files.length > 0) {
        audioUrl = coreUtils.replaceHTTP(req.files[0].location);
      }

      if (audioUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to create"
        );
      }
      const { name, duration, audiobook_id: audiobookId } = req.body;
      const result = await EpisodeModel.createV3(
        name,
        duration,
        audioUrl,
        audiobookId
      );
      if (!result) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_201, {
        id: result.last_id,
      });
    });

    /* MulterHelper.upload(req, res, async function (err) {
            if (err) {
                if (err instanceof multer.MulterError) {
                    // A Multer error occurred when uploading.
                    LoggerError.log(err)
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                } else {
                    // An unknown error occurred when uploading.
                    LoggerError.log(err)
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                }
            }
            // good to go
            console.log(req.files)
            const file = req.files[0]
            const imageUrl = file.destination + '/' + file.filename;
            const fileAudio = req.files[1]
            const fileUrl = fileAudio.destination + '/' + fileAudio.filename;
            const {
                name,
                description,
                author,
                contributing_artists: contributingArtists,
                price,
                category_id: categoryId,
                channel_id: channelId
            } = req.body;
            const priceFloat = parseFloat(price).toFixed(2)
            const result = await AudiobookModel.createCombined(
                name,
                description,
                author,
                contributingArtists,
                priceFloat,
                imageUrl,
                fileUrl,
                categoryId,
                channelId
            );
            if (!result) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_201,
                {
                    id: result.last_id,
                    image_file_url: imageUrl
                }
            );
        }); */
  };

  update = async (req, res) => {
    S3Helper.upload(req, res, async function (err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
          LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        } else {
          // An unknown error occurred when uploading.
          LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        }
      }
      // good to go
      let audioUrl = null;
      if (req.files && req.files.length > 0) {
        audioUrl = coreUtils.replaceHTTP(req.files[0].location);
      }
      if (audioUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to create"
        );
      }
      const { name } = req.body;
      const episodeId = req.query.episodeId;
      const result = await EpisodeModel.updateEpisode(
        name,
        audioUrl,
        episodeId
      );
      if (!result) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
      });
    });
  };

  updateWithFile = async (req, res) => {
    S3Helper.upload(req, res, async function (err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
          LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        } else {
          // An unknown error occurred when uploading.
          LoggerError.log(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        }
      }
      // good to go
      let audioUrl = null;
      if (req.files && req.files.length > 0) {
        audioUrl = coreUtils.replaceHTTP(req.files[0].location);
      }
      if (audioUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to create"
        );
      }
      const { name, duration } = req.body;
      const episodeId = req.query.episodeId;
      const result = await EpisodeModel.updateEpisodeWithFile(
        name,
        audioUrl,
        duration,
        episodeId
      );
      if (!result) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
      });
    });
  };

  updateWithoutFile = async (req, res) => {
    const episodeName = req.body.name;
    const episodeId = req.query.episodeId;
    const result = await EpisodeModel.updateEpisode(
      episodeName,
      null,
      episodeId
    );
    if (!result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: true,
    });
  };

  checkValidation = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new HttpException(400, "Validation faild", errors);
    }
  };

  addEpisodes = async (req, res) => {
        const data = await EpisodeModel.addEpisodes(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getSignedUrl = async (req, res) => {
    const { audiobookId, episodeId } = req.query;
    const obj = await EpisodeModel.getEpisodeUrl(audiobookId, episodeId);
    if (obj) {
      const data = S3Helper.getSignedUrl(obj);
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    }
    return ResponseUtils.respondError(
      res,
      constants.HTTP_404,
      constants.NOT_FOUND
    );
  };
}

module.exports = new EpisodeController();
