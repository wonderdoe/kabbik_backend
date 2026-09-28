const CoreModel = require('../data/models/core-model');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const contentUtils = require('../utils/content-utils');

const NodeCache = require("node-cache");
const cache = new NodeCache();

require('dotenv').config();

class CoreController {

    getAppCombinedData = async (req, res)=>{
        const combinedData = await CoreModel.getAppCombinedData();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }


     getFaqContent = async (req, res)=>{
        const combinedData = await CoreModel.getFaqContent();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, {data: combinedData});
    }

    getAnnouncement = async (req, res) => {
        const combinedData = await CoreModel.getAnnouncement(req);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: combinedData });
    }


    getAppNotifications = async (req, res) => {
        const combinedData = await CoreModel.getAppNotifications(req);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: combinedData });
    }

    readAppNotification = async (req, res) => {
        const combinedData = await CoreModel.readAppNotification(req);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: combinedData });
    }

    getAppUnreadNotificationCount = async (req, res) => {
        const combinedData = await CoreModel.getAppUnreadNotificationCount(req);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, {
            data: {
                "success": true,
                "unreadNotification": combinedData
            }
        });
    }



    getAppPremiumData = async (req, res)=>{
        const combinedData = await CoreModel.getPremiumData();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    }

// need to store in cache 
    
    getAppPodcastData = async (req, res)=>{
        const cachedData = cache.get("getAppPodcastData");
      if(cachedData){
        if(!cachedData){
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, cachedData);
      }

      else{
        const combinedData = await CoreModel.getAppPodcastData();
        cache.set("getAppPodcastData", combinedData, 100);
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
      }

    }




    // getCombinedData = async (req, res) => {
    //     const combinedData = await CoreModel.getAppCombinedData();
    //     if (!combinedData) {
    //         return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
    //     }
    //     var contentData = await contentUtils.getBannerContents().catch(
    //         err => {
    //             console.log(err);
    //             // contentData = [];
    //         }
    //     );
    //     //console.log(combinedData[2])
    //     if (!contentData) {
    //         contentData = [];
    //     }
    //     //console.log(contentData);
    //     // [0..5] has expected data
    //     const data = {
    //         data: [
    //             {
    //                 name: 'ট্রেন্ডিংস',
    //                 data: combinedData[0]
    //             },
    //             {
    //                 name: 'কাব্যিক অরিজিনালস',
    //                 data: combinedData[1]
    //             },
    //             {
    //                 name: 'প্র্রিমিয়াম্‌',
    //                 data: combinedData[2]
    //             },
    //             {
    //                 name: 'থ্রিলার',
    //                 data: combinedData[3]
    //             },
    //             {
    //                 name: 'রোমান্স',
    //                 data: combinedData[4]
    //             },
    //             {
    //                 name: 'বিনোদন',
    //                 data: combinedData[5]
    //             },
    //             {
    //                 name: 'জীবনবৃত্তান্ত',
    //                 data: combinedData[6]
    //             },
    //             {
    //                 name: 'ভৌতিক',
    //                 data: combinedData[7]
    //             },
    //             {
    //                 name: 'বৈজ্ঞানিক কল্পকাহিনী',
    //                 data: combinedData[8]
    //             },
    //             {
    //                 name: 'ইতিহাস',
    //                 data: combinedData[9]
    //             },
    //         ],
    //         bannerList: contentData
    //     };
    //     return ResponseUtils.respond(res, constants.HTTP_200, data);
    // };

    getBannerImages = async (req, res) => {
        const data = await CoreModel.getBannerImages();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    getSearch = async (req, res) => {
        const data = await CoreModel.getSearch(req.body.text);        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
    }

    getPopularSearchKeywords=async(req,res)=>{
                const data = await CoreModel.getPopularSearch(req.query?.limit);        
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
    }

    getAudiobookDataForPublisher = async (req, res) => {
        const data = await CoreModel.getAudiobookDataForPublisher(
            req.query.channel_id
        );
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    fbDataDeletion = async (req, res) => {
        var signed_request = $_POST['signed_request'];
        var data = parse_signed_request(signed_request);
        var user_id = data['user_id'];



        function parse_signed_request(signed_request) {

        }

    }
}

module.exports = new CoreController;