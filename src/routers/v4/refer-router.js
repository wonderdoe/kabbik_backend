const express = require("express");
const router = express.Router();
const ReferController = require("../../controllers/refer-controller");

router.get('/earn-log', ReferController.insertReferEarnLogFromApi);
router.post('/claim-request', ReferController.requestToClaim);
router.get('/get-user-earning', ReferController.getUserEarning);
router.get('/get-claim-history', ReferController.getClaimHistoryEarning);
router.get('/get-refer-history', ReferController.getReferHistory);


module.exports = router;
