const express = require("express");
const router = express.Router();
const cron = require("node-cron");
const authorize = require("../../middlewares/auth-middleware");

const SessionController = require("../../controllers/session-controller");

router.get("/init", authorize, SessionController.init);
router.get("/log", authorize, SessionController.log);
router.get("/init-kabbik", authorize, SessionController.initKabbik);
router.get("/log-kabbik", authorize, SessionController.logKabbik);
router.get("/log-kabbik-app", authorize, SessionController.logKabbikApp);



// router.get('/insertBlReport',   SessionController.insertBlReport);
router.get("/cronjob/trigger", SessionController.cronjob);
router.get(
  "/admin/get-user-stats-date-wise",
  SessionController.searchUserStatsDateWise
);
router.get("/cronjob/redis-sync", SessionController.redisSync);
router.get(
  "/cronjob/kabbik-session-redis-sync",
  SessionController.kabbikSessionRedisSync
);

router.get("/show-all-keys", SessionController.showAllKeys);
router.get(
  "/show-keys-by-pattern-with-data",
  SessionController.showKeysByPatternWithData
);
router.get("/show-keys-by-pattern", SessionController.showKeysByPattern);
router.get("/delete-keys-by-pattern", SessionController.deleteKeysByPattern);
router.get("/flush-db", SessionController.flushDb);


cron.schedule('38 0 * * *', function () {
  SessionController.kabbikUserReportCron();
});


cron.schedule("40 1 * * *", function () {
  SessionController.dashboardDataCornjob();
});

cron.schedule("40 4 * * *", function () {
  SessionController.sendMyBlDashboardNotifyMail();
});

module.exports = router;
