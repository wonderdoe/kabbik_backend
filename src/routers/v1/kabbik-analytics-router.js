const express = require('express');
const router = express.Router();
const KabbikController = require('../../controllers/kabbik-controller');
const authorize = require('../../middlewares/auth-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');


router.get('/total-purchase', authorizeAdmin,  KabbikController.totalPurchaseAmount);
// ?date=? YYYYMMDD no 01 in MM/DD use Value without 0 at start
router.get('/total-purchase-date-wise', authorizeAdmin,  KabbikController.totalPurchaseAmountDateWise);
//Last 20 Transaction Request
// ?totalTransaction=? default all
router.get('/last-transaction-list', authorizeAdmin, KabbikController.lastTransactionList);
//Last 20 Successful Transaction
// ?totalTransaction=? default all
router.get('/last-successful-transaction-list', authorizeAdmin, KabbikController.lastSuccessfulTransactionList);
//Last 20 Failed Transaction
// ?totalTransaction=? default all
router.get('/last-failed-transaction-list', authorizeAdmin, KabbikController.lastFailedTransactionList);

//Last 7 Days Signup History
// ?previousDays=? default 7
router.get('/signup-history', authorizeAdmin,  KabbikController.signupHistory);
//Signup History from channel
// ?fromChannel=? default all
router.get('/signup-history-channel', authorizeAdmin,  KabbikController.signupHistoryChannel);
//Most Listened Audiobooks
// ?totalItemFetch=? default all
router.get('/audiobook-most-listened', authorizeAdmin,  KabbikController.mostListenedAudiobook);
//Most Purchased Audiobooks Last 30 days
// ?totalItemFetch=? default all
router.get('/audiobook-most-purchased', authorizeAdmin,  KabbikController.mostPurchasedAudiobook);
//Most Rated AUdiobook Last 30 days
// ?lastdaysago=? default all
router.get('/audiobook-most-rated', authorizeAdmin,  KabbikController.mostRatedAudiobook);


router.get('/audiobook-play', authorizeAdmin,  KabbikController.audioBookPlayCount);
router.get('/audiobook-play-count-total', authorizeAdmin,  KabbikController.audioBookPlayCountTotal);

router.get('/audiobook-play-episode', authorizeAdmin,  KabbikController.audioBookPlayCountEpisode);
router.get('/audiobook-play-count-episode-total', authorizeAdmin,  KabbikController.audioBookPlayCountEpisodeTotal);



router.get('/audiobook-play-count-total-from-web', authorizeAdmin,  KabbikController.audioBookPlayCountTotalFromWeb);
router.get('/audiobook-play-count-total-from-android', authorizeAdmin,  KabbikController.audioBookPlayCountTotalFromAndroid);



router.get('/audiobook-play-count-total-episode-from-web', authorizeAdmin,  KabbikController.audioBookPlayCountEpisodeTotalFromWeb);
router.get('/audiobook-play-count-total-episode-from-android', authorizeAdmin,  KabbikController.audioBookPlayCountTotalEpisodeFromAndroid);

router.get('/top-users-audiobook', authorizeAdmin,  KabbikController.topUsersAudiobook);
router.get('/top-users-episode', authorizeAdmin,  KabbikController.topUsersEpisode);


//Daily top 10
//Set startDate and endDate dynamic api
router.get('/top-10-users', authorizeAdmin,  KabbikController.top10Users);
router.get('/top-listner-leaderBoard',  KabbikController.topListnerLeaderBoard);
router.get('/user-listning-history',  KabbikController.userListneningHistoryCont);


// Daily top 10
//Set startDate and endDate dynamic api
router.get('/top-10-audios', authorizeAdmin,  KabbikController.audioBookPlayCountTop10);

//Daily audiobook playlist
router.get('/daily-audiobook-playlist', authorizeAdmin,  KabbikController.dailyAudiobookPlaylist);
//Lates Subscribers list
router.get('/latest-subscribers', authorizeAdmin,  KabbikController.lastSubscriptionList);
//User Summary
router.get('/user-summary',authorize,  KabbikController.userSummary);


//Latest Subscribers list bKash or Google Pay
router.get('/latest-subscribed-user', authorizeAdmin,  KabbikController.latestSubscribedUser);
router.get('/latest-transactions-webhook', authorizeAdmin,  KabbikController.latestTransactionsWebhook);
router.get('/was_subscribed_then_canceled', authorizeAdmin,  KabbikController.wasSubscribedThenCanceled);
router.get('/first_subscribed_try_then_failed', authorizeAdmin,  KabbikController.firstSubscribedTryThenFailed);
router.get('/today-cancelled-subscription',  KabbikController.todayCancelledSubscription);
router.get('/today-subscription-new',  KabbikController.todaySubscriptionNew);


//Review list
router.get('/latest_review_list', authorizeAdmin,  KabbikController.latestReviewList);


// router.get('/updatePayer', authorizeAdmin,  KabbikController.updatePayer);









router.get('/yesterday-total-play-count', authorizeAdmin,  KabbikController.yesterdayTotalPlayCount);
router.get('/today-total-play-count',  KabbikController.todayTotalPlayCount);
router.get('/today-total-play-count-audiobook',  KabbikController.todayTotalPlayCountAudiobook);
router.get('/yesterday-total-play-count-audiobook', authorizeAdmin,  KabbikController.yesterdayTotalPlayCountAudiobook);
router.get('/today-total-play-count-episode', authorizeAdmin,  KabbikController.todayTotalPlayCountEpisode);
router.get('/yesterday-total-play-count-episode', authorizeAdmin,  KabbikController.yesterdayTotalPlayCountEpisode);
router.get('/yesterday-total-purchase', authorizeAdmin,  KabbikController.yesterdayTotalPurchase);
router.get('/today-total-purchase', authorizeAdmin,  KabbikController.todayTotalPurchase);
router.get('/yesterday-total-signup', authorizeAdmin,  KabbikController.yesterdayTotalSignup);
router.get('/today-total-signup', authorizeAdmin,  KabbikController.todayTotalSignup);
router.get('/total-subscriber-count', authorizeAdmin,  KabbikController.totalSubscribedUserCount);


//get user purchased audiobook
//get user download log
router.post('/audiobook-download-log', KabbikController.audiobookDownloadLog);

router.get('/audiobook-download-log', KabbikController.getAudiobookDownloadLog);








//promotion_track_table


router.get('/promotion-tracker',  KabbikController.promotionTracker);
router.get('/promotion-audiobooks',  KabbikController.promotionAudiobooks);
router.get('/getPromocodeAdmin',  KabbikController.getPromocodeAdmin);




//logs_subscription
router.post('/postSubscriptionLogs',  KabbikController.postSubscriptionLogs);

//Total listening count on last 30 days
// Life time listening count
router.get('/totalListening',  KabbikController.totalListening);



// Life time subscriber count, cancelled count, unsubscribed count
router.get('/lifetime-subscribed-user', authorizeAdmin,  KabbikController.lifetimeSubscribedUser);

// Package wise Active subscribers count (monthly count, half yearly, yearly)

// Actice Promocode, redeemcode, without any code subscribers count.

// Last 7 days revenue total

router.get('/revenueSummaryBkashRecurring', authorizeAdmin,  KabbikController.revenueSummary);

// Last 7 days revenue pgw wise

router.get('/revenueSummaryPGW', authorizeAdmin,  KabbikController.revenueSummaryPGW);

// Last 30 days report for same

router.get('/revenueSummaryPGW30Days', authorizeAdmin,  KabbikController.revenueSummaryPGW30Days);


//all pgw wise subscriber count lifetime
router.get('/allPGWSubscriberCount', authorizeAdmin,  KabbikController.allPGWSubscriberCount);

module.exports = router;