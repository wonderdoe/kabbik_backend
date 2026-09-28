const express = require("express");
const router = express.Router();
const RewardController = require("../../controllers/reward-controller"); 

router.get('/create-reward',    RewardController.insertEarningPoint);
router.get('/get-all-tier_reward',  RewardController.getAllTierReward);
router.get('/get-user-reward-profile',  RewardController.getUserRewardProfile);
router.post('/claim-reward',    RewardController.claimReward);

router.get('/tier-faq',    RewardController.getRewardFaq);
router.get('/get-all-task',  RewardController.getAllTask);
router.get('/user-point-details',  RewardController.pointDetails);

 


module.exports = router;
