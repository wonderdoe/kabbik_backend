const UserModel = require("../data/models/user-model");
const HttpException = require("../utils/httpexception-utils");
const { validationResult } = require("express-validator");
const ResponseUtils = require("../utils/res-utils");
const S3Helper = require("../utils/s3-helper");
const MulterHelper = require("../utils/multer-helper");
const multer = require("multer");
const constants = require("../utils/constants");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const coreUtils = require("../utils/core-utils");
const cons = require("../utils/constants");
const UserModelV4 = require("../data/models/user-model-v4");
const userModelV4 = require("../data/models/user-model-v4");
dotenv.config();

class UserControllerV2 {
  updateUserFirstLogin = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.updateUserFirstLogin(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { success: data });
  };

  requestAudiobook = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.requestAudiobook(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { success: data });
  };
  redeem = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.redeem(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { success: data });
  };

  calculateUserEarnings = async () => {
 
    let data;
    data = await UserModelV4.calculateUserEarnings();
    if (!data) {
      return 'false';
    }
    return 'true';
  };

  generateRand = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.generateRand(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { success: data });
  };

 getUserEarning = async (req, res) => { 
    let data;
     
    data = await UserModelV4.getUserEarning(req);
    

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
       success: true,
       data: data[0]
     });
  };

  requestWithdraw = async (req, res) => { 
    let data;
     
    data = await UserModelV4.requestWithdraw(req);
 
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
        data: data
     });
  }

  paymentMethodList = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.paymentMethodList(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };


  paymentMethodListV4 = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.paymentMethodListV4(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };


  paymentMethodListV2 = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.paymentMethodListV2(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };

  paymentMethodListV3 = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.paymentMethodListV3(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };

  paymentMethodListWeb = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.paymentMethodListWeb(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };
  
  continueWatching = async (req, res) => {
     // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    // data = await UserModelV4.continueWatching(req);

    data = "success";

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };
  continueWatchingWeb = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.continueWatchingWeb(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };

  getContinueWatching = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.getContinueWatching(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };
  getContinueWatchingWeb = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.getContinueWatchingWeb(req);
    // }
    if (!data) {
      return res.status(200).json({data: null });
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  continueWatchingAudiobookList = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)
    // if(fullName){
    data = await UserModelV4.continueWatchingAudiobookList(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };
  updateIosSubscription = async (req, res) => {
    let data;
    data = await UserModelV4.updateIosSubscription(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };
  updateGooglepaySubscription = async (req, res) => {
    let data;
    data = await UserModelV4.updateGooglepaySubscription(req);
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };

  accountDeletionRequest = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    let data;
    // if(fullName)

    //console.log("here 2");
    // if(fullName){
    data = await UserModelV4.accountDeletionRequest(req);
    // }

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
  };

  isOpenSavoy = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: {
        isOpenSavoy: true,
      },
    });
  };

  showGlobalPaymentMethod = async (req, res) => {
    // const user_id =req.query.user_id;
    // const phone_no =req.query.phone_no;
    // const fullName = req.query.full_name;

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: {
        showGlobalPaymentMethod: true,
      },
    });
  };
  bankCard = async (req, res) => {
    try {
      const data = await UserModelV4.bankCard(req); // Await the asynchronous operation
      return ResponseUtils.respond(res, constants.HTTP_200, {
        data,
        message:"Data Inserted Successfully",
        status:200
      });
    } catch (error) {
      // Handle the error appropriately, e.g., logging or sending an error response
      console.error("Error in bankCard function:", error);
      return ResponseUtils.respond(res, constants.HTTP_500, {
        error: "Internal Server Error",
      });
    }
  };

  referCode = async (req, res) => {
    try {
      const data = await UserModelV4.referCodeGenerate(req);
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }

      return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
    } catch (error) {

      console.error("Error in bankCard function:", error);
      return ResponseUtils.respond(res, constants.HTTP_500, {
        error: "Internal Server Error",
      });
    }
  };

  membership= async (req, res) => {
    try {
      const data = await UserModelV4.membershipNumberSubmit(req);
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }

      return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
    } catch (error) {

      console.error("Error in bankCard function:", error);
      return ResponseUtils.respond(res, constants.HTTP_500, {
        error: "Internal Server Error",
      });
    }
  };

  cardNumberSubmit= async (req, res) => {
    try {
      const data = await UserModelV4.cardNumberSubmit(req);
      if (!data) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          constants.BAD_REQ
        );
      }

      return ResponseUtils.respond(res, constants.HTTP_200, { data: data });
    } catch (error) {

      console.error("Error in bankCard function:", error);
      return ResponseUtils.respond(res, constants.HTTP_500, {
        error: "Internal Server Error",
      });
    }
  };

}

module.exports = new UserControllerV2();
