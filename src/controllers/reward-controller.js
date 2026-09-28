const ResponseUtils = require('../utils/res-utils');
const constants = require("../utils/constants");
const RewardModel = require('../data/models/reward-model');

class RewardController {

  insertEarningPoint = async (req, res) => {
    const data = await RewardModel.insertEarningPoint(req.query.userId, req.query.taskId);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

  getAllTierReward = async (req, res) => {
    const data = await RewardModel.getAllTierReward(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

  getUserRewardProfile = async (req, res) => {
    const data = await RewardModel.getUserRewardProfile(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

  claimReward = async (req, res) => {
    const data = await RewardModel.claimReward(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        data["message"] || constants.NOT_FOUND
      );
    }
    
    if(!data["success"]){
          return res.status(400).json(data);
    }     

    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

    getRewardFaq = async (req, res) => {
    const data = await RewardModel.getRewardFaq(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        data["message"] || constants.NOT_FOUND
      );
    }
    if(!data["success"]){
          return res.status(400).json(data);
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };


  pointDetails = async (req, res) => {

    const data = await RewardModel.pointDetails(req);
    if (!data || data["success"] == false) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        data["message"] || constants.NOT_FOUND
      );
    }
   
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  }

   getAllTask = async (req, res) => {
    const data = await RewardModel.getAllTask(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        data["message"] || constants.NOT_FOUND
      );
    }
    if(!data["success"]){
          return res.status(400).json(data);
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data });
  };

}

module.exports = new RewardController