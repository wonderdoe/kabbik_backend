const ToffeeModel = require('../data/models/toffee-model');
const S3Helper = require('../utils/s3-helper');
const HttpException = require('../utils/httpexception-utils');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const { validationResult } = require('express-validator');
const multer = require('multer');
const coreUtils = require('../utils/core-utils');
const contentUtils = require('../utils/content-utils');
const Authvalidator = require('../validators/auth-validator')
require('dotenv').config();
const NodeCache = require("node-cache");
const GlobalTask = require('../utils/global-tasker');
const cache = new NodeCache();


class ToffeeController {

    userRecentAudiobookList = async (req, res) => {
        const combinedData = await ToffeeModel.userRecentAudiobookList(req);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    };
    getHomeDataAppFromCacheFree = async (req, res) => {
        try {
            const cachedData = cache.get("homeFree");
            GlobalTask.insertLogsToffeeOptional({
                USERID: req.currentUser ? req.currentUser.id : "",
                userAction: "GetHomeDataAppFromCacheFree",
                endpoint: "/v4/toffee/home/free",
                forTask: "Home",
                source: "Toffee",
                platform: "App",
                user_ip: req.user_ip
            })
                .catch(error => {
                    console.error("Error:", error);
                });
            if (cachedData) {
                return ResponseUtils.respond(res, constants.HTTP_200, cachedData);
            }

            const homeData = await ToffeeModel.getFreeHomeDataApp(req);
            if (!homeData) {
                return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
            }

            cache.set("homeFree", homeData, 100);
            return ResponseUtils.respond(res, constants.HTTP_200, homeData);
        } catch (error) {
            console.error("getHomeDataAppFromCacheFree failed:", error);
            return ResponseUtils.respondError(
                res,
                constants.HTTP_500,
                constants.INTERNAL_SERVER_ERROR
            );
        }
    }

    getFreeHomeDataApp = async (req, res) => {

        const combinedData = await ToffeeModel.getFreeHomeDataApp(req);
                if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }

                return combinedData;
    }
    getHomeBannerList = async (req, res) => {
        const combinedData = await ToffeeModel.getHomeBannerList();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
    getHomeBannerListV2 = async (req, res) => {
        const combinedData = await ToffeeModel.getHomeBannerListV2();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
    getHomeTopBannerToffee = async (req, res) => {
        const combinedData = await ToffeeModel.getHomeTopBannerToffeeFromCache(req, res);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }



    getAudiobookDetails = async (req, res) => {
        const data = await ToffeeModel.getAudiobookDetails(
            [
                req.params.id,
                req.params.userId
            ], req, res
        );

        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


    getHomeBannerWeb = async (req, res) => {
        const combinedData = await ToffeeModel.getHomeBannerWeb(req.query.user_id);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
    getIfPromoActive = async (req, res) => {
        const combinedData = await ToffeeModel.getIfPromoActive(req.query.user_id);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: combinedData });
    }

    getActiveHomeAd = async (req, res) => {
        const combinedData = await ToffeeModel.getActiveHomeAd(req.query.user_id);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: combinedData });
    }
    getEpisodeLimit = async (req, res) => {
        const combinedData = await ToffeeModel.getEpisodeLimit(req.query.user_id);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: combinedData });
    }
    webGetPromoCodePageData = async (req, res) => {
        const combinedData = await ToffeeModel.webGetPromoCodePageData(req);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: combinedData });
    }
    getPromoCode = async (req, res) => {
        const combinedData = await ToffeeModel.getPromoCode(req.query.user_id);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }

    seemoreCategoryWiseFree = async (req, res) => {
        // Get page and pageSize from query parameters
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10000;

        // Calculate offset
        const offset = (page - 1) * pageSize;
        
        GlobalTask.insertLogsToffeeOptional({
            USERID: req.currentUser ? req.currentUser.id : "",
            userAction: "SeeMoreCategoryWise",
            endpoint: "/v4/toffee/home/seemore/free?name=",
            forTask: "SeeMore",
            source: "Toffee",
            platform: "App",
            user_ip: req.user_ip
        })
            .catch(error => {
                console.error("Error:", error);
            });

        // Pass offset and pageSize to the model function
        const data = await ToffeeModel.seemoreCategoryWiseFree(req.query.name, offset, pageSize);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    checkPromoCode = async (req, res) => {
                                const combinedData = await ToffeeModel.checkPromoCode(req, req.query.user_id, req.query.promocode, req.query.for_package);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }
    CornJobgetHomeDataApp = async () => {
        const combinedData = await ToffeeModel.CornJobgetHomeDataApp();
        if (!combinedData) {
            return "failed";
        }
        return "success";
    }

}

module.exports = new ToffeeController;