const AudiobookModel = require("../data/models/audiobook-model");
const TrackModel = require("../data/models/track-model");
const EpisodeModel = require("../data/models/episode-model");
const S3Helper = require("../utils/s3-helper");
const MulterHelper = require("../utils/multer-helper");
const HttpException = require("../utils/httpexception-utils");
const ResponseUtils = require("../utils/res-utils");
const constants = require("../utils/constants");
const { validationResult } = require("express-validator");
const multer = require("multer");
const coreUtils = require("../utils/core-utils");
const contentUtils = require("../utils/content-utils");
const LoggerError = require("../utils/logger-error");
const axios = require("axios");
const podcastFeedParser = require("podcast-feed-parser");
const ChannelModel = require("../data/models/channel-model");
const parseString = require("xml2js").parseString;
const EpisodeController = require("../controllers/episode-controller");

const NodeCache = require("node-cache");
const cache = new NodeCache();

require("dotenv").config();

class AudiobookController {
  getUserPurchased = async (req, res) => {
    const id = req.query.user_id;
    const data = await AudiobookModel.getUserPurchased(id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAll = async (req, res) => {
    this.checkValidation(req);
    const data = await AudiobookModel.getAll();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAllWithRectBanner = async (req, res) => {
    this.checkValidation(req);
    const data = await AudiobookModel.getAllWithRectBanner();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getByCategory = async (req, res) => {
    //this.checkValidation(req);
    const data = await AudiobookModel.getByCategory(req.params.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getByCategoryApp = async (req, res) => {
    this.checkValidation(req);
    const data = await AudiobookModel.getByCategoryApp(req.params.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  getFree = async (req, res) => {
    this.checkValidation(req);
    const data = await AudiobookModel.getFree();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPremium = async (req, res) => {
    this.checkValidation(req);
    const data = await AudiobookModel.getPremium(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPodcast = async (req, res) => {
    this.checkValidation(req);
    const data = await AudiobookModel.getPodcast(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getApprovedByChannelId = async (req, res) => {
    const data = await AudiobookModel.getApprovedByChannelId(req.params.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAllPendings = async (req, res) => {
    const data = await AudiobookModel.getAllPendings();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPendingsByChannelId = async (req, res) => {
    const data = await AudiobookModel.getPendingsByChannelId(req.params.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAllRejecteds = async (req, res) => {
    const data = await AudiobookModel.getAllRejecteds();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getRejectedByChannelId = async (req, res) => {
    const data = await AudiobookModel.getRejectedByChannelId(req.params.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  updatePendings = async (req, res) => {
    this.checkValidation(req);
    const result = await AudiobookModel.updatePendings(
      req.params.id,
      req.body.status
    );
    const { affectedRows } = result;
    if (!affectedRows) {
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

  deleteAudioBook = async (req, res) => {
    const data = await AudiobookModel.deleteAudioBook(
      req.query.audio_bookId,
      req.body.status
    );
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAllByChannelId = async (req, res) => {
    const data = await AudiobookModel.getAllByChannelId(req.query.channel_id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getById = async (req, res) => {
    const data = await AudiobookModel.findOne(
      [req.params.id, req.query.user_id],
      req
    );

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAudioById = async (req, res) => {
    const data = await AudiobookModel.findSingleBooks(
      [req.params.id, req.query.user_id],
      req
    );

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    data.excluded_payment_methods = JSON.parse(data.excluded_payment_methods);
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  findSecuredAudiobook = async (req, res) => {
    const data = await AudiobookModel.findSecuredAudiobook(
      [req.params.id, req.query.user_id],
      req
    );

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getAllPurchasedAudioBooks = async (req, res) => {

    const data = await AudiobookModel.getAllPurchasedAudioBooks(req);
        if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data?.data,
      expiredData:data?.expiredData
    });
  };


  getByIdDynamic = async (req, res) => {
    const data = await AudiobookModel.getByIdDynamic(
      [req.params.id, req.query.user_id],
      req,
      res
    );

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };
  streamEpisode = async (req, res) => {
    const referer = req.headers.referer;
    return await AudiobookModel.streamEpisode([req.params.id], req, res);
  };

  getNextIdByCurrentId = async (req, res) => {
    const nextAudio = await AudiobookModel.findNextOne(
      [req.params.id, req.query.user_id],
      req
    );
    const data = await AudiobookModel.findOne(
      [nextAudio[0]?.audiobook_id, req.query.user_id],
      req
    );
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };
  suggestedAudiobooks = async (req, res) => {
    let data;
    if (!req.params.id) {
      // Handle the error here, for example, send a response with an error message
      res.status(400).send({ error: "Missing required fields" });
    } else {
      data = await AudiobookModel.findnextSuggestedAudiobooks(
        [req.params.id],
        req
      );
      // Continue with your code
    }
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getByIdNewReview = async (req, res) => {
    const data = await AudiobookModel.getByIdNewReview([req.query.id]);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  getAudiobookById = async (req, res) => {
    const data = await AudiobookModel.findOneforAdmin([req.params.id]);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getByIdOld = async (req, res, next) => {
    this.checkValidation(req);
    const data = await AudiobookModel.findOneOld([
      req.params.id,
      req.query.user_id,
    ]);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getCombinedData = async (req, res, next) => {
    const combinedData = await TrackModel.getCombinedData();
    if (!combinedData) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    var contentData = await contentUtils.getBannerContents().catch((err) => {
          });
    if (!contentData) {
      contentData = [];
    }
    const data = {
      data: [
        {
          name: "ট্রেন্ডিংস",
          data: combinedData[0],
        },
        {
          name: "থ্রীলার",
          data: combinedData[1],
        },
        {
          name: "রোমান্স",
          data: combinedData[2],
        },
        {
          name: "বিনোদোন",
          data: combinedData[3],
        },
        {
          name: "ছোট গল্প",
          data: combinedData[4],
        },
        {
          name: "উপন্যাস",
          data: combinedData[5],
        },
      ],
      bannerList: contentData,
    };
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  getPlaylist = async (req, res) => {
    const data = await AudiobookModel.getPlaylist(req.query.count);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  postPurchaedAudioBook = async (req, res) => {
    const data = await AudiobookModel.postPurchaedAudioBook(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };
  uploadBannerImage = async (req, res) => {
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

      let imageUrl = null;
      if (req.files && req.files.length > 0) {
        imageUrl = coreUtils.replaceHTTP(req.files[0].location);
      }
      if (imageUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to upload"
        );
      }
        
   imageUrl = imageUrl
  .replace("https://kabbik-space.sgp1.digitaloceanspaces.com", "https://kabbik-space.sgp1.cdn.digitaloceanspaces.com")
  .replace("https://sgp1.digitaloceanspaces.com/kabbik-space", "https://kabbik-space.sgp1.cdn.digitaloceanspaces.com");


      
      const { title, size, description } = req.body;
      const result = await AudiobookModel.uploadBannerImage(
        title,
        imageUrl,
        size,
        description,
        0
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
        image_file_url: imageUrl,
      });
    });
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
      let imageUrl = null;
      let bannerUrl = null;
      let audioUrl = null;
      if (req.files && req.files.length > 0) {
        imageUrl = req.files[0].location;
        if (req.files.length > 1) {
          audioUrl = coreUtils.replaceHTTP(req.files[1].location);
        }
        if (req.files.length > 2) {
          bannerUrl = req.files[2].location;
        }
      }
      if (imageUrl == null || audioUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to create"
        );
      }
      const {
        name,
        description,
        author,
        contributing_artists: contributingArtists,
        price,
        categoryValue: category_value,
        channel_id: channelId,
        publisher_id,
      } = req.body;
      let premium = 0;
      if (price > 0) {
        premium = 1;
      }
      let guid = null;
      const priceFloat = parseFloat(price).toFixed(2);
      const result = await AudiobookModel.createCombined(
        name,
        description,
        author,
        contributingArtists,
        priceFloat,
        guid,
        premium,
        imageUrl,
        bannerUrl,
        audioUrl,
        category_value,
        channelId,
        0,
        publisher_id
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
        image_file_url: imageUrl,
      });
    });
  };

  createV3 = async (req, res) => {
    S3Helper.upload(req, res, async function (err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.

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
      let imageUrl = null;
      let bannerUrl = null;
      let audioUrl = null;
      if (req.files && req.files.length > 0) {
        imageUrl = req.files[0].location;
        if (req.files.length > 1) {
          audioUrl = coreUtils.replaceHTTP(req.files[1].location);
        }
        if (req.files.length > 2) {
          bannerUrl = req.files[2].location;
        }
      }
      if (imageUrl == null || audioUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to create"
        );
      }
      const {
        name,
        description,
        author,
        contributing_artists: contributingArtists,
        price,
        categoryValue: category_value,
        channel_id: channelId,
        publisher_id,
        duration,
      } = req.body;
      let premium = 0;
      if (price > 0) {
        premium = 1;
      }
      let guid = null;
      const priceFloat = parseFloat(price).toFixed(2);
      const result = await AudiobookModel.createCombinedV3(
        name,
        description,
        author,
        contributingArtists,
        priceFloat,
        guid,
        premium,
        imageUrl,
        bannerUrl,
        audioUrl,
        category_value,
        channelId,
        0,
        publisher_id,
        duration
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
        image_file_url: imageUrl,
      });
    });
  };

  createWithEpisodes = async (req, res) => {
    const {
      name,
      description,
      author,
      contributing_artists: contributingArtists,
      price,
      audiobook_image_url: audiobookImageUrl,
      banner_image_url: bannerImageUrl,
      categoryValue: category_value,
      channel_id: channelId,
      episodes,
      publisher_id,
    } = req.body;
    let premium = 0;
    if (price > 0) {
      premium = 1;
    }
    const priceFloat = parseFloat(price).toFixed(2);
    const result = await AudiobookModel.create(
      name,
      description,
      author,
      contributingArtists,
      priceFloat,
      premium,
      audiobookImageUrl,
      bannerImageUrl,
      category_value,
      channelId,
      publisher_id
    );
    if (!result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    // insert episodes
    let episode;
    for (let i = 0; i < episodes.length; i++) {
      episode = episodes[i];
      await EpisodeModel.create(episode.name, episode.file, result.last_id);
    }
    return ResponseUtils.respond(res, constants.HTTP_201, {
      id: result.last_id,
    });
  };

  createWithEpisodesV3 = async (req, res) => {
    const {
      name,
      description,
      author,
      contributing_artists: contributingArtists,
      price,
      audiobook_image_url: audiobookImageUrl,
      banner_image_url: bannerImageUrl,
      categoryValue: category_value,
      channel_id: channelId,
      episodes,
      publisher_id,
    } = req.body;
    let premium = 0;
    if (price > 0) {
      premium = 1;
    }
    const priceFloat = parseFloat(price).toFixed(2);
    const result = await AudiobookModel.create(
      name,
      description,
      author,
      contributingArtists,
      priceFloat,
      premium,
      audiobookImageUrl,
      bannerImageUrl,
      category_value,
      channelId,
      publisher_id
    );
    if (!result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    // insert episodes
    let episode;
    for (let i = 0; i < episodes.length; i++) {
      episode = episodes[i];
      await EpisodeModel.createV3(
        episode.name,
        episode.duration,
        episode.file,
        result.last_id
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_201, {
      id: result.last_id,
    });
  };

  addFromRssFeed = async (req, res) => {
    const rsslink = req.body.rssLink;
    const podcastStatus = req.body.rssType;
    const publisherId = req.body.publisherId;
    let channelId = req.query.channelId;
    let counter = 0;
    let channelCreated = false;
    let existing = await AudiobookModel.findWithGuid();
    var resultArray = Object.values(JSON.parse(JSON.stringify(existing)));
    let existingResult = resultArray.map((el) => el.guid);
    try {
      const podcast = await podcastFeedParser.getPodcastFromURL(rsslink);
      if (channelId == 0) {
        const channelName = podcast.meta.title.split("|", 1);
        const channelImage = podcast.meta.imageURL;
        channelId = await ChannelModel.create(
          channelName[0],
          channelImage,
          publisherId
        );
        if (channelId > 0) {
          channelCreated = true;
        }
      }

      // <p>This Detective Bengali audio story (bangla goyenda golpo) is inspired by "The Adventure of the Musgrave Ritual", a detective suspense thriller, one of the 56 Sherlock Holmes short stories written by Sir Arthur Conan Doyle. &nbsp;The Hypnotic Chroniclers produces detective bengali audio stories like sunday suspense, Sherlock Holmes, শার্লক হোমস, গোয়েন্দা গল্প, feluda, agatha christie, sunday suspense, goyenda golpo audio, goenda golpo, audio story, bangla audio golpo, golpo path, &nbsp;bengali audio story detective, suspense story in bengali, bangladesh audio story, sherlock holmes, &nbsp;sunday suspense new , sherlock holmes bengali audio story, sherlock holmes bangla golpo, Audio Story Detective, Detective Story Bangla, Suspense, Thriller, Murder Mystery, Drama, audio book, suspense story, audio story books bangla, &nbsp;This suspense thriller is inspired by &nbsp;"The Adventure of the Musgrave Ritual", one of the 56 Sherlock Holmes short stories written by Sir Arthur Conan Doyle &nbsp;&nbsp;Voice - (In order of appearance) Introduction: Arpita Das Watson: Subhajit Paul Sherlock: Subhendu Mukherjee Massgrave: Joydeep Dutta Rachel: Satarupa Mukherjee &nbsp;Audio Story Adaptation - Debraj Banerjee Theme Music &nbsp;- Abhik Editing - Subhendu Mukherjee, Debraj Banerjee, Satarupa Mukherjee Direction - Subhendu Mukherjee &nbsp;Cover Page Design - Sourendra Nath Kundu (শঙ্খ) &nbsp;&nbsp;Background Scores: YouTube audio library Sound effects obtained from https://www.zapsplat.com, http://incompetech.com/ &nbsp;Some music by Kevin MacLeod is licensed under a Creative Commons Attribution 4.0 license. https://creativecommons.org/licenses/by/4.0/ &nbsp;Subscribe to us : https://bit.ly/32888WG &nbsp;Like us on Facebook &nbsp;&nbsp;https://www.facebook.com/TheHypnoticChroniclers &nbsp;Follow us on Instagram &nbsp;https://www.instagram.com/thehypnoticchroniclers/ &nbsp;&nbsp;#SuspenseSeries #SherlockHomes #Thriller #Detective</p>

      podcast.episodes.forEach(async (episode) => {
        let duplicate = false;
        let name = episode.title.split("|", 1);
        let guid = episode.guid;
        let description = episode.description;
        let author = podcast.meta.author;
        let contributingArtists = "";
        let priceFloat = 0.0;
        let premium = 0;
        let imageUrl = episode.imageURL;
        let bannerUrl = null;
        let audioUrl = episode.enclosure.url;
        let category_value = null;
        existingResult.every(async (el) => {
          if (el == guid) {
            duplicate = true;
            return false;
          }
        });
        if (!duplicate) {
          let result = await AudiobookModel.createCombined(
            name,
            description,
            author,
            contributingArtists,
            priceFloat,
            guid,
            premium,
            imageUrl,
            bannerUrl,
            audioUrl,
            category_value,
            channelId,
            podcastStatus
          );
          if (result) {
            counter++;
          } else {
            return ResponseUtils.respondError(
              res,
              constants.HTTP_400,
              constants.BAD_REQ
            );
          }
        }
      });
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        newchannelId: channelId,
        //audioCounter: counter,
        channelCreate: channelCreated,
      });
    } catch (error) {
      console.log(error);
    }
  };

   createOrUpdateRating = async (req, res, next) => {
    const { rating, user_id: userId, review,parent } = req.body;
    const data = await AudiobookModel.createOrUpdateRating(
      rating,
      review,
      parseInt(req.params.id),
      userId,
      parent
    );
    if (!data || data <= 0) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: data > 0 ? true : false,
    });
  };

  updatePlayCount = async (req, res) => {
    const { userId, fromChannel, episodeId } = req.body;

    const result = await AudiobookModel.updatePlayCount(
      req.params.id,
      userId,
      episodeId,
      fromChannel,
      req
    );

    const { affectedRows } = result;
    if (!affectedRows) {
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

  updatePlayCountEpisodes = async (req, res) => {
    const { userId, fromChannel } = req.body;
    const result = await AudiobookModel.updatePlayCountEpisodes(
      req.params.id,
      userId,
      fromChannel,
      req
    );
    const { affectedRows } = result;
    if (!affectedRows) {
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

  updatePlayCountMybl = async (req, res) => {
    const { userId, fromChannel, episodeId } = req.body;

    const result = await AudiobookModel.updatePlayCountMybl(
      req.params.id,
      userId,
      episodeId,
      fromChannel,
      req
    );

    const { affectedRows } = result;
    if (!affectedRows) {
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

  updatePlayCountEpisodesMybl = async (req, res) => {
    const { userId, fromChannel } = req.body;
    const result = await AudiobookModel.updatePlayCountEpisodesMybl(
      req.params.id,
      userId,
      fromChannel,
      req
    );
    const { affectedRows } = result;
    if (!affectedRows) {
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

  updateIsFree = async (req, res) => {
    const { userId, fromChannel } = req.body;
    const result = await AudiobookModel.updateIsFree(
      req.body.isFree,
      req.body.episodeId,
      req.body.audiobookId
    );
    const { affectedRows } = result;
    if (!affectedRows) {
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

  updateFiles = async (req, res, next) => {
    S3Helper.upload(req, res, async function (err) {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred when uploading.
          coreUtils.printStringify(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_500,
            "Unable to upload"
          );
        } else {
          // An unknown error occurred when uploading.
          coreUtils.printStringify(err);
          return ResponseUtils.respondError(
            res,
            constants.HTTP_500,
            "Unable to upload"
          );
        }
      }
      const thumbUrl = req.files[0].location;
      const audioUrl = coreUtils.replaceHTTP(req.files[1].location);
      const { id } = req.body;
      const results = await TrackModel.updateTrackFiles(id, thumbUrl, audioUrl);
      if (!results) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_401,
          "Unable to create"
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_201, {
        id: results.affectedRows,
        image_file_url: thumbUrl,
        audio_file_url: audioUrl,
      });
    });
  };
  getAssignedCategory = async (req, res) => {
    const id = req.params.id;
    const result = await AudiobookModel.getAssignedCategory(id);
    if (!result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: result,
    });
  };
  updateAudioBook = async (req, res) => {
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
      // oky captain
      let imageUrl = null;
      if (req.files && req.files.length > 0) {
        imageUrl = req.files[0].location;
      }
      if (imageUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to create"
        );
      }
      const {
        name,
        en_name,
        authorName,
        vocalArtist,
        categoryValue,
        compareCategory,
        description,
        price,
        publisher_id,
      } = req.body;
      //var resultArray = Object.values(JSON.parse(JSON.stringify(categoryValue)))
      let categoryVal = JSON.parse(categoryValue);
      let compareVal = JSON.parse(compareCategory);
      const result = await AudiobookModel.updateAudioBook(
        name,
        en_name,
        authorName,
        vocalArtist,
        categoryVal,
        compareVal,
        description,
        price,
        imageUrl,
        req.params.id,
        publisher_id
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

  updateAudioBookWithoutImage = async (req, res) => {
    const {
      name,
      en_name,
      authorName,
      vocalArtist,
      categoryValues,
      compareCategories,
      description,
      price,
      publisher_id,
    } = req.body;
    const result = await AudiobookModel.updateAudioBook(
      name,
      en_name,
      authorName,
      vocalArtist,
      categoryValues,
      compareCategories,
      description,
      price,
      null,
      req.params.id,
      publisher_id
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

  checkValidation = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
  };

  audioBookAnalytics = async (req, res) => {
    const audioBookId = req.params.id;
    const { platform, user_id } = req.body;
    const result = await AudiobookModel.audioBookAnalytics(
      platform,
      user_id,
      audioBookId
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

  getAuthorDetails = async (req, res) => {
    const data = await AudiobookModel.getAuthorDetails(req.query.name);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  getAppAuthorDataEpisodes = async (req, res) => {
    const data = await AudiobookModel.getAppAuthorDataEpisodes(req.query.name);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  getCastcrewDetails = async (req, res) => {
    const data = await AudiobookModel.getCastcrewDetails(req.query.name);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  getAppCastcrewAudiobook = async (req, res) => {
    const data = await AudiobookModel.getAppCastcrewAudiobook(req.query.name);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  getAllCastCrew = async (req, res) => {
    const data = await AudiobookModel.getAllCastCrew();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  findCastCrewById = async (req, res) => {
    const data = await AudiobookModel.findCastCrewById(req.query.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  updateCastCrewById = async (req, res) => {
    if (req.body.imageUrl == null) {
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

        let imageUrl = null;
        if (req.files && req.files.length > 0) {
          imageUrl = req.files[0].location;
        }
        if (imageUrl == null) {
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            "Unable to upload"
          );
        }
        // const {
        //     title, size, description,
        // } = req.body;
        const result = await AudiobookModel.updateCastCrewById(req, imageUrl);
        if (!result) {
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        }
        return ResponseUtils.respond(res, constants.HTTP_201, {
          data: "Success",
        });
      });
    } else {
      const data = await AudiobookModel.updateCastCrewById(
        req,
        req.body.imageUrl
      );
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: data,
      });
    }
  };

  addCastCrew = async (req, res) => {
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

      let imageUrl = null;
      if (req.files && req.files.length > 0) {
        imageUrl = req.files[0].location;
      }
      if (imageUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to upload"
        );
      }
      // const {
      //     title, size, description,
      // } = req.body;
      const result = await AudiobookModel.addCastCrew(req, imageUrl);
      if (!result) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_201, {
        data: "Success",
      });
    });

    // const data = await AudiobookModel.addCastCrew(req);
    // if (!data) {
    //     return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
    // }
    // return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };

  getAllAuthors = async (req, res) => {
    const data = await AudiobookModel.getAllAuthors();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  findAuthorsById = async (req, res) => {
    const data = await AudiobookModel.findAuthorsById(req.query.id);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: data,
    });
  };

  updateAuthorsById = async (req, res) => {
    if (req.body.imageUrl == null) {
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

        let imageUrl = null;
        if (req.files && req.files.length > 0) {
          imageUrl = req.files[0].location;
        }
        if (imageUrl == null) {
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            "Unable to upload"
          );
        }
        // const {
        //     title, size, description,
        // } = req.body;
        const result = await AudiobookModel.updateAuthorsById(req, imageUrl);
        if (!result) {
          return ResponseUtils.respondError(
            res,
            constants.HTTP_400,
            constants.BAD_REQ
          );
        }
        return ResponseUtils.respond(res, constants.HTTP_201, {
          data: "Success",
        });
      });
    } else {
      const data = await AudiobookModel.updateAuthorsById(
        req,
        req.body.imageUrl
      );
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: data,
      });
    }
  };

  addAuthors = async (req, res) => {
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

      let imageUrl = null;
      if (req.files && req.files.length > 0) {
        imageUrl = req.files[0].location;
      }
      if (imageUrl == null) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to upload"
        );
      }
      // const {
      //     title, size, description,
      // } = req.body;
      const result = await AudiobookModel.addAuthors(req, imageUrl);
      if (!result) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_201, {
        data: "Success",
      });
    });

    // const data = await AudiobookModel.addCastCrew(req);
    // if (!data) {
    //     return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
    // }
    // return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };

  seemoreCategoryWise = async (req, res) => {
    //this.checkValidation(req);

    const cachedData = cache.get(`seemore${req.query.name}`);
    if (cachedData) {
      if (!cachedData) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      return ResponseUtils.respond(res, constants.HTTP_200, cachedData);
    } else {
            const data = await AudiobookModel.seemoreCategoryWise(req.query.name);
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_404,
          constants.NOT_FOUND
        );
      }
      cache.set(`seemore${req.query.name}`, data, 100);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    }
  };

  uploadAudiobookRefined = async (req, res) => {
    const audiobookData = await AudiobookModel.uploadAudiobookRefined(req);
    if (!audiobookData.success) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    req.body.audiobookId = audiobookData.audiobookId;
    const episodesData = await EpisodeModel.addEpisodes(req, true);
    if (audiobookData.success && episodesData) {
      return ResponseUtils.respond(res, constants.HTTP_200, episodesData);
    }
    return ResponseUtils.respond(res, constants.HTTP_200, audiobookData);
  };

  updateAudiobookRefined = async (req, res) => {
    const data = await AudiobookModel.updateAudiobookRefined(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };
}

module.exports = new AudiobookController();
