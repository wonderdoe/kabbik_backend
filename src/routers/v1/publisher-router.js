const express = require("express");
const router = express.Router();
const PublisherController = require("../../controllers/publisher-controller");

const authorizePublisher = require("../../middlewares/auth-publisher-middleware");
const authorizePublisherBook = require("../../middlewares/auth-publisherbook-middleware");
const authorizeAdmin = require("../../middlewares/auth-admin-middleware");

const cron = require("node-cron");

router.put("/profile", PublisherController.update);
router.get("/", authorizeAdmin, PublisherController.getAll);
router.get(
  "/blocklist",
  authorizeAdmin,
  PublisherController.getBlockedPublisher
);
router.get(
  "/getAdminPublishserId/:id",
  PublisherController.getAdminPublishserId
);
router.put(
  "/status/update/:id",
  authorizeAdmin,
  PublisherController.updatePublisherStatus
);
router.post("/update-publishers", PublisherController.updatePublishers);
router.get("/get-publishers-byID", PublisherController.getPublishersById);
router.get(
  "/publishers-audiobooks",
  PublisherController.getPublishersAudiobooksFromRedis
);
router.get(
  "/manual/publishers-audiobooks",
  PublisherController.getPublishersAudiobooks
);
router.get("/publisherslist", PublisherController.getPublisherslist);
router.get(
  "/month-wise-whole-summary",
  // authorizePublisherBook,
  PublisherController.getMonthWiseWholeSummary
);
router.get(
  "/audiobook-wise-summary",
  PublisherController.getAudiobookWiseWholeSummaryFromRedis
);
// router.get(
//   "/audiobook-wise-summary",
//   PublisherController.getAudiobookWiseWholeSummary
// );
// router.get(
//   "/monthly-unique-count",
//   PublisherController.getMonthlyUniqueCountFromRedis
// );
// router.get(
//   "/monthly-unique-count",
//   PublisherController.getMonthlyUniqueCount
// );
router.get(
  "/cronjob/audiobook-monthly-summary",
  PublisherController.setCronAudiobookSummary
);
router.get(
  "/cronjob/monthly-revenue",
  PublisherController.getMonthlyRevenueByPublisher
);
router.get("/get-revenue", PublisherController.getRevenue);
router.get(
  "/payment-history",
  authorizePublisherBook,
  PublisherController.getPaymentHistory
);
router.get(
  "/get-audiobook-analytics",
  PublisherController.getAudiobooksAnalyticsByPublisher
);
router.get(
  "/publishers-paid-users-summary",
  PublisherController.getPublishersPaidUsersSummary
);
router.get(
  "/publishers-audiobooks-summary-today",
  authorizePublisherBook,
  PublisherController.getPublishersAudiobookSummaryToday
);
router.get(
  "/publishers-audiobooks-summary-yesterday",
  authorizePublisherBook,
  PublisherController.getPublishersAudiobookSummaryYesterday
);
router.get(
  "/cronjob/user-listeners",
  PublisherController.getUserListenersSoFar
);
router.get("/user-listeners", PublisherController.getUserListeners);

// cron.schedule("0 0/5 * * * *", function () {
//   console.log("cron job running locally   0 0/5");
// });

module.exports = router;
