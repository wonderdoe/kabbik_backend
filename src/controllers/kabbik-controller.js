const KabbikModel = require('../data/models/kabbik-model');
const TrackModel = require('../data/models/track-model');
const EpisodeModel = require('../data/models/episode-model');
const S3Helper = require('../utils/s3-helper');
const MulterHelper = require('../utils/multer-helper');
const HttpException = require('../utils/httpexception-utils');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const { validationResult } = require('express-validator');
const multer = require('multer');
const coreUtils = require('../utils/core-utils');
const contentUtils = require('../utils/content-utils');
const LoggerError = require('../utils/logger-error');
const axios = require('axios');
const podcastFeedParser = require("podcast-feed-parser")
const ChannelModel = require('../data/models/channel-model')
const parseString = require('xml2js').parseString;

require('dotenv').config();

class KabbikController {

    getAll = async (req, res) => {
        const data = await KabbikModel.getAll();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    totalPurchaseAmount = async (req, res) => {
        
                const data = await KabbikModel.totalPurchaseAmount();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    totalPurchaseAmountDateWise = async (req, res) => {
        const datevalue =req.query.date;
                const data = await KabbikModel.totalPurchaseAmountDateWise(datevalue);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


    lastTransactionList = async (req, res) => {
        const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.lastTransactionList(totalTransaction);
        const dataTotal = await KabbikModel.totalItem();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data,
            total_item: dataTotal
        });
    };


    lastFailedTransactionList = async (req, res) => {
        const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.lastFailedTransactionList(totalTransaction);
        const dataTotal = await KabbikModel.totalItemFailed();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data,
            total_item: dataTotal
        });
    };

 

    lastSuccessfulTransactionList = async (req, res) => {
        const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.lastSuccessfulTransactionList(totalTransaction);
        const dataTotal = await KabbikModel.totalItemSuccessFull();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data,
            total_item: dataTotal
        });
    };
    lastSubscriptionList = async (req, res) => {
        const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.lastSubscriptionList();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };
    latestSubscribedUser = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.latestSubscribedUser();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };    
    
    lifetimeSubscribedUser = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.lifetimeSubscribedUser();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };    
    revenueSummary = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.revenueSummary();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };    
    revenueSummaryPGW = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.revenueSummaryPGW();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };
    
    revenueSummaryPGW30Days = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.revenueSummaryPGW30Days();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };    
    allPGWSubscriberCount = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.allPGWSubscriberCount();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };
    latestTransactionsWebhook = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.latestTransactionsWebhook();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };
    wasSubscribedThenCanceled = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.wasSubscribedThenCanceled();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };
    firstSubscribedTryThenFailed = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.firstSubscribedTryThenFailed();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };    
    todayCancelledSubscription = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.todayCancelledSubscription();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };    
    todaySubscriptionNew = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.todaySubscriptionNew();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };
    latestReviewList = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.latestReviewList(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };
    updatePayer = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.updatePayer();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };
    totalSubscribedUserCount = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        const data = await KabbikModel.totalSubscribedUserCount();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200,{
            data : data
        });
    };
    userSummary = async (req, res) => {
        // const totalTransaction =req.query.totalTransaction;
        // const data = await KabbikModel.userSummary(req.query.userId, req);
        // if (!data) {
        //     return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        // }
        return ResponseUtils.respondError(res, constants.HTTP_400, constants.NOT_FOUND);
    };

    signupHistory = async (req, res) => {
        const previousDays =req.query.previousDays;
        const data = await KabbikModel.signupHistory(previousDays);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    signupHistoryChannel = async (req, res) => {
        const fromChannel =req.query.fromChannel;
        const data = await KabbikModel.signupHistoryChannel(fromChannel);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    mostListenedAudiobook = async (req, res) => {
        const totalItemFetch =req.query.totalItemFetch;
        const data = await KabbikModel.mostListenedAudiobook(totalItemFetch);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    mostPurchasedAudiobook = async (req, res) => {
        const totalItemFetch =req.query.totalItemFetch;
        const data = await KabbikModel.mostPurchasedAudiobook(totalItemFetch);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    mostRatedAudiobook = async (req, res) => {
        const lastdaysago =req.query.lastdaysago;
        const data = await KabbikModel.mostRatedAudiobook(lastdaysago);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
//
//
//
//
//
//
    audioBookPlayCount = async (req, res) => {
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const data = await KabbikModel.audioBookPlayCount(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    audioBookPlayCountTotal = async (req, res) => {
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const data = await KabbikModel.audioBookPlayCountTotal(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    audioBookPlayCountTotalFromWeb = async (req, res) => {
        
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const data = await KabbikModel.audioBookPlayCountTotalFromWeb(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


    audioBookPlayCountTotalFromAndroid = async (req, res) => {
        
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;

        const data = await KabbikModel.audioBookPlayCountTotalFromAndroid(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    audioBookPlayCountTop10 = async (req, res) => {
        
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;

        const data = await KabbikModel.audioBookPlayCountTop10(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    dailyAudiobookPlaylist = async (req, res) => {
        
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;

        const data = await KabbikModel.dailyAudiobookPlaylist(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


    audioBookPlayCountEpisodeTotalFromWeb = async (req, res) => {
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const data = await KabbikModel.audioBookPlayCountEpisodeTotalFromWeb(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


    audioBookPlayCountTotalEpisodeFromAndroid = async (req, res) => {
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const data = await KabbikModel.audioBookPlayCountTotalEpisodeFromAndroid(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    topUsersEpisode = async (req, res) => {
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const data = await KabbikModel.topUsersEpisode(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    topUsersAudiobook = async (req, res) => {
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const data = await KabbikModel.topUsersAudiobook(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    top10Users = async (req, res) => {
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const data = await KabbikModel.top10Users(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

     topListnerLeaderBoard = async (req, res) => {
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const user_id =req.query.user_id;
        const data = await KabbikModel.topListnerLeaderBoard(startDate, endDate,user_id);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

   userListneningHistoryCont = async (req, res) => {
                const user_id =req.query.user_id;
        const data = await KabbikModel.userListneningHistory(user_id);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    audioBookPlayCountEpisodeTotal = async (req, res) => {
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const data = await KabbikModel.audioBookPlayCountEpisodeTotal(startDate, endDate);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    audioBookPlayCountEpisode = async (req, res) => {
        const lastdaysago =req.query.lastdaysago;
        const data = await KabbikModel.audioBookPlayCountEpisode(lastdaysago);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


    
    yesterdayTotalPlayCount = async (req, res) => {
        
                const data = await KabbikModel.yesterdayTotalPlayCount();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    
    todayTotalPlayCount = async (req, res) => {
        
                const data = await KabbikModel.todayTotalPlayCount();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    
    
    yesterdayTotalPlayCountAudiobook = async (req, res) => {
        
                const data = await KabbikModel.yesterdayTotalPlayCountAudiobook();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
        
    todayTotalPlayCountAudiobook = async (req, res) => {
        
                const data = await KabbikModel.todayTotalPlayCountAudiobook();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    
    
    todayTotalPlayCountEpisode = async (req, res) => {
        
                const data = await KabbikModel.todayTotalPlayCountEpisode();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    
    yesterdayTotalPlayCountEpisode = async (req, res) => {
        
                const data = await KabbikModel.yesterdayTotalPlayCountEpisode();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    
    yesterdayTotalPurchase = async (req, res) => {
        
                const data = await KabbikModel.yesterdayTotalPurchase();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    
    todayTotalPurchase = async (req, res) => {
        
                const data = await KabbikModel.todayTotalPurchase();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    
    yesterdayTotalSignup = async (req, res) => {
        
                const data = await KabbikModel.yesterdayTotalSignup();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    
    todayTotalSignup = async (req, res) => {
        
                const data = await KabbikModel.todayTotalSignup();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    promotionTracker = async (req, res) => {
        
                const data = await KabbikModel.promotionTracker(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };    
    
    totalListening = async (req, res) => {
        
                
        const startDate =req.query.startDate;
        const endDate =req.query.endDate;
        const lifetime = req.query.lifetime;

                        const data = await KabbikModel.totalListening(startDate, endDate, lifetime);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    promotionAudiobooks = async (req, res) => {
        
                const data = await KabbikModel.promotionAudiobooks(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    getPromocodeAdmin = async (req, res) => {
        
                const data = await KabbikModel.getPromocodeAdmin(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };



    postSubscriptionLogs = async (req, res) => {
        const result = await KabbikModel.postSubscriptionLogs(req);
	        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                data: 'success'
            }
        );
    }



    audiobookDownloadLog = async (req, res) => {
        const {
            userId, audiobookId, episodeId, fromChannel
        } = req.body;

                const result = await KabbikModel.audiobookDownloadLog(
            userId,
            audiobookId,
            episodeId,
            fromChannel
        );


        const { affectedRows } = result;
        if (!affectedRows) {
            return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                success: true
            }
        );
    };

    getAudiobookDownloadLog = async (req, res) => {
        const {
            user_id : userId
        } = req.query;

                const data = await KabbikModel.getAudiobookDownloadLog(
            userId
        );

        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

  

}

module.exports = new KabbikController;