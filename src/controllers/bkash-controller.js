const HttpException = require("../utils/httpexception-utils");
const { validationResult } = require("express-validator");
const ResponseUtils = require("../utils/res-utils");
const BkashModel = require("../data/models/bkash-model");
const constants = require("../utils/constants");
const axios = require("axios").default;
const JWTHelper = require("../utils/jwt-helper");
const dotenv = require("dotenv");
const authController = require("./auth-controller");
const userModel = require("../data/models/user-model");
dotenv.config();

class BkashController {
  getAll = async (req, res) => {
    const data = await BkashModel.getAll();
    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, data);
  };

  paymentBkashNotification = async (req, res) => {
    const data = await BkashModel.paymentBkashNotification(
      req.headers,
      req.body
    );

    if (!data) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    } else {
      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: data,
      });
    }
  };

  paymentBkashNotificationSandbox = async (req, res) => {
    const fromEndpoint = req;
    // console.log(bodyData);
    const result =
      await BkashModel.paymentBkashNotificationSandboxAndProduction(
        req.headers,
        req.body,
        "Sandbox"
      );
    // res.status(200).end()
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: "success",
    });
  };
  paymentBkashNotificationProduction = async (req, res) => {
    const fromEndpoint = req;
    // console.log(bodyData);
    const result =
      await BkashModel.paymentBkashNotificationSandboxAndProduction(
        req.headers,
        req.body,
        "Production"
      );
    // res.status(200).end()
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: "success",
    });
  };
  paymentBkashNotificationTest = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));
    // console.log("Body: " + JSON.stringify(req.body));
    // console.log(bodyData);
    const result = await BkashModel.paymentBkashNotificationTest(
      req.headers,
      req.body
    );
    // res.status(200).end()
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: "success",
    });
  };

  // // for notifying those users whose bkash payment is unsuccessful
  paymentNotifyUser = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));
    // console.log("Body: " + JSON.stringify(req.body));
    // console.log(bodyData);
    const userId = req.params.userId;
    const result = await BkashModel.bkashPaymentNotify(userId);
    //console.log(result);
    // res.status(200).end()
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: result,
    });
  };

  bkashOnetimeCreatePayment = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));
    // console.log("Body: " + JSON.stringify(req.body));
    // console.log(bodyData);

    const result = await BkashModel.bkashOnetimeCreatePayment(req, res);

    // res.status(200).end()
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: result,
    });
  };

  bkashOnetimeCreatePaymentBkashMicrosite = async (req, res) => {
    const result = await BkashModel.bkashOnetimeCreatePaymentBkashMicrosite(
      req,
      res
    );
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: result,
    });
  };

  bkashOnetimeCreatePaymentAudioBookPurchase = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));
    // console.log("Body: " + JSON.stringify(req.body));
    // console.log(bodyData);

    const result = await BkashModel.bkashOnetimeCreatePaymentAudioBookPurchase(
      req,
      res
    );

    // res.status(200).end()
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: result,
    });
  };

  bkashEbookFulfillPayment = async (req, res) => {
    const paymentId = req.body?.paymentId || req.body?.paymentID;
    const result = await BkashModel.bkashEbookFulfillPayment(paymentId);

    if (result?.gateway_response) {
      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: result,
      });
    }

    if (!result?.success) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        result?.message || constants.BAD_REQUEST,
      );
    }

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: result,
    });
  };

  bkashOnetimeCreatePaymentCoursePurchase = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));
    // console.log("Body: " + JSON.stringify(req.body));
    // console.log(bodyData);

    // const result = await BkashModel.bkashOnetimeCreatePaymentCoursePurchase(
    //   req,
    const result = await BkashModel.bkashOnetimeCreatePaymentVoiceAcademy(
      req
    );

    // res.status(200).end()
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: result,
    });
  };

  bkashOnetimeCallback = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));
    // console.log(bodyData);

    const returnValue = await BkashModel.bkashOnetimeCallback(req.query);

    // var returnValue = await BkashModel.addResponseDataRedirectSuccess(req.query.reference)
    var redirectURL;
    if (
      returnValue.fromSource == "Banglalink" &&
      returnValue.platform == "app"
    ) {
      if (returnValue.success == false) {
        redirectURL =
          "https://mybl.kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://mybl.kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashStatus=" +
          req.query.status +
          "&status=SUCCEEDED";
      }
    } else if (
      returnValue.fromSource == "bkash" &&
      returnValue.platform == "app"
    ) {
      if (returnValue.success == false) {
        redirectURL =
          "https://bkash.kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://bkash.kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashStatus=" +
          req.query.status +
          "&status=SUCCEEDED";
      }
    } else {
      if (returnValue.success == false) {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashStatus=" +
          req.query.status +
          "&status=SUCCEEDED";
      }
    }
    // if (returnValue == false) {
    //     redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.paymentID + "&paymentType=BKASHONETIME" + "&bkashdStatus=" + req.query.status + "&status=FAILED"

    // } else {
    //     redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.paymentID + "&paymentType=BKASHONETIME" + "&bkashStatus=" + req.query.status + "&status=SUCCEEDED"

    // }
    // res.status(200).end()

    res.redirect(redirectURL);
  };

  bkashOnetimeCallbackBkashMicrosite = async (req, res) => {
    const returnValue = await BkashModel.bkashOnetimeCallbackBkashMicrosite(
      req.query
    );
    var redirectURL;
    if (returnValue.fromSource == "bkash" && returnValue.platform == "app") {
      if (returnValue.success == false) {
        redirectURL =
          "https://bkash.kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://bkash.kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashStatus=" +
          req.query.status +
          "&status=SUCCEEDED";
      }
    } else {
      if (returnValue.success == false) {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashStatus=" +
          req.query.status +
          "&status=SUCCEEDED";
      }
    }
    res.redirect(redirectURL);
  };

  bkashOnetimeAudioBookPurchaseCallback = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));
    // console.log(bodyData);

    const returnValue = await BkashModel.bkashOnetimeAudioBookPurchaseCallback(
      req.query
    );

    // var returnValue = await BkashModel.addResponseDataRedirectSuccess(req.query.reference)
    var redirectURL;
    if (
      returnValue.fromSource == "Banglalink" &&
      returnValue.platform == "app"
    ) {
      if (returnValue.success == false) {
        redirectURL =
          "https://mybl.kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://mybl.kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashStatus=" +
          req.query.status +
          "&status=SUCCEEDED";
      }
    } else {
      if (returnValue.success == false) {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashStatus=" +
          req.query.status +
          "&status=SUCCEEDED";
      }
    }
    // if (returnValue == false) {
    //     redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.paymentID + "&paymentType=BKASHONETIME" + "&bkashdStatus=" + req.query.status + "&status=FAILED"

    // } else {
    //     redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.paymentID + "&paymentType=BKASHONETIME" + "&bkashStatus=" + req.query.status + "&status=SUCCEEDED"

    // }
    // res.status(200).end()

    res.redirect(redirectURL);
  };

  bkashOnetimeCoursePurchaseCallback = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));
    // console.log(bodyData);

    // const returnValue = await BkashModel.bkashOnetimeCoursePurchaseCallback(
    console.log("-------------------------------------------------bkashOnetimeCoursePurchaseCallback-------------------------------------------------",req.query);
        const returnValue = await BkashModel.bkashOnetimeVoiceAcademyCallback(
      req.query
    );

    // var returnValue = await BkashModel.addResponseDataRedirectSuccess(req.query.reference)
    var redirectURL;
   
      if (returnValue.success == false) {
        console.log("-------------------------------------------------falsebkashOnetimeCoursePurchaseCallback-------------------------------------------------",returnValue);
        if(returnValue?.type==='ebook'){
          redirectURL =
          `https://kabbik.com/payment-info?status=failed&` +
          "paymentId=" + req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status ;
        } else {
        redirectURL =
          `https://voice-academy.wondersoftsolution.com/checkout/${returnValue.enrollment_id}/failed?` +
          "paymentId=" + req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status +
          "&status=FAILED";
        }
      } else {
        console.log("-------------------------------------------------truebkashOnetimeCoursePurchaseCallback-------------------------------------------------",returnValue);
        if(returnValue?.type==='ebook'){
          redirectURL =
          `https://kabbik.com/payment-info?status=success&` +
          "paymentId=" + req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashdStatus=" +
          req.query.status ;
        } else {
        redirectURL =
          `https://voice-academy.wondersoftsolution.com/checkout/${returnValue.enrollment_id}/success?` +
          "paymentId=" + req.query.paymentID +
          req.query.paymentID +
          "&paymentType=BKASHONETIME" +
          "&bkashStatus=" +
          req.query.status +
          "&status=SUCCEEDED";
        }
      }
    
    // if (returnValue == false) {
    //     redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.paymentID + "&paymentType=BKASHONETIME" + "&bkashdStatus=" + req.query.status + "&status=FAILED"

    // } else {
    //     redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.paymentID + "&paymentType=BKASHONETIME" + "&bkashStatus=" + req.query.status + "&status=SUCCEEDED"

    // }
    // res.status(200).end()

    res.redirect(redirectURL);
  };

  bkashLogin = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));

    var moment = require("moment");
    // console.log(bodyData);
    if (
      req.body.username == "bkashLogin" &&
      req.body.password == "asAS12!@" &&
      req.body.mobile_number != null
    ) {
      const userName = req.body.mobile_number;
      const authSrc = "bkashApp";
      const fullName = "User";
      const imageUrl = null;
      const user = await userModel.createOrReturnNew(
        userName,
        fullName,
        constants.PHONE,
        imageUrl,
        authSrc
      );
      if (!user) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_401,
          "Unable to login!"
        );
      }
      const token = JWTHelper.generateToken({
        user_id: user.id.toString(),
        role: user.role,
      });
      var now = moment();
      var formattedDateTime = now.format("DD-MM-YY HH:mm:ss");
      return ResponseUtils.respond(res, constants.HTTP_200, {
        id_token: token,
        update_time: formattedDateTime,
      });
    }

    return ResponseUtils.respondError(
      res,
      constants.HTTP_401,
      "Unable to login!"
    );
  };

  bkashLoginStaging = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));

    var moment = require("moment");
    // console.log(bodyData);
    if (
      req.body.username == "bkashLoginStaging" &&
      req.body.password == "0" &&
      req.body.mobile_number != null
    ) {
      const userName = req.body.mobile_number;
      const authSrc = "bkashApp";
      const fullName = "User";
      const imageUrl = null;
      const user = await userModel.createOrReturnNew(
        userName,
        fullName,
        constants.PHONE,
        imageUrl,
        authSrc
      );
      if (!user) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_401,
          "Unable to login!"
        );
      }
      const token = JWTHelper.generateToken({
        user_id: user.id.toString(),
        role: user.role,
      });
      var now = moment();
      var formattedDateTime = now.format("DD-MM-YY HH:mm:ss");
      return ResponseUtils.respond(res, constants.HTTP_200, {
        id_token: token,
        update_time: formattedDateTime,
      });
    }

    return ResponseUtils.respondError(
      res,
      constants.HTTP_401,
      "Unable to login!"
    );
  };


    bkashCreateMicrositeRecurringSubscription = async (req, res) => {

 
         const bkashResponse = await BkashModel.bkashCreateMicrositeRecurringSubscription(req);

 
        if (!bkashResponse) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200, {
                data: "Error"
            }
            );
        }

        return ResponseUtils.respond(
            res,
            constants.HTTP_200, {
            data: bkashResponse
        }
        );
    };


  getBkashRedirectMC = async (req, res) => {
    const { reference } = req.query;
    const returnValue = await BkashModel.microSiteRedirectURL(reference);

    let redirectURL = `https://bkash.kabbik.com/payment-status?reference=${reference}`;

    if (returnValue.environment === "DEVELOPMENT") {
      redirectURL = `https://bkash-staging.kabbik.com/payment-status?reference=${reference}`;
    }

    if (returnValue.success === false) {
      redirectURL += "&status=FAILED";
      if (returnValue.message) {
        redirectURL += `&message=${encodeURIComponent(returnValue.message)}`;
      }
    } else {
      redirectURL += "&status=SUCCEEDED";
    }

    res.redirect(redirectURL);
  };



  getMcBkashPaymentListSubscriptionID = async (req, res) => {

        const bkashResponse = await BkashModel.getMcBkashPaymentListSubscriptionID(req.query.subscriptionid, req.headers);

        if (!bkashResponse) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        if (bkashResponse.status == constants.BAD_REQ) {
            return ResponseUtils.respondError(res, constants.HTTP_404, bkashResponse);
        }

        return ResponseUtils.respond(
            res,
            constants.HTTP_200, {
            data: bkashResponse
        }
        );
    };

   getBkashRefundPayment_mc = async (req, res) => {

        const bkashResponse = await BkashModel.getBkashRefundPayment_mc(req.query.paymentId, req.query.amount );

        if (bkashResponse.status == "BAD_REQUEST") {

            return ResponseUtils.respond(res, constants.HTTP_400, {
                data: bkashResponse
            });
        } else if (bkashResponse.status == "NOT_FOUND") {

            return ResponseUtils.respond(res, constants.HTTP_404, {
                data: bkashResponse
            });
        } else {
            return ResponseUtils.respond(res, constants.HTTP_200, {
                data: "Successful"
            });
        }
    };


    paymentBkashNotificationMC = async (req, res) => {
        const data = await BkashModel.paymentBkashNotificationMicroSite(req.headers, req.body);

        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }

        else {
            return ResponseUtils.respond(
                res,
                constants.HTTP_200, {
                data: 'success'
            }
            );
        }
    }




  bkashCreateSubscriptionRequest = async (req, res) => {
        const bkashResponse = await BkashModel.bkashCreateSubscriptionRequest(
      req.body,
      req.headers
    );
    if (!bkashResponse) {
      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: "Error",
      });
    }

    // var redirectURL = bkashResponse.redirectURL
    // console.log(redirectURL)
    // Redirect(
    //     redirectURL
    // )

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };

  bkashCreateSubscriptionRequestApp = async (req, res) => {
    // console.log("here: " + JSON.stringify(req.headers))
        const bkashResponse = await BkashModel.bkashCreateSubscriptionRequestApp(req);

    //await BkashModel.addResponseDataCreate(bkashResponse, req);
    // console.log("val: " + JSON.stringify(bkashResponse))
    if (!bkashResponse || !bkashResponse.success) {
      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: bkashResponse,
      });
    }

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };

  bkashCreateSubscriptionRequestAppBkashMicrosite = async (req, res) => {
    const bkashResponse =
      await BkashModel.bkashCreateSubscriptionRequestAppBkashMicrosite(
        req.body,
        req.headers
      );
    await BkashModel.addResponseDataCreateBkashMicrosite(bkashResponse, req);
    if (!bkashResponse) {
      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: "Error",
      });
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };

  getBkashQuerySubscriptionRequest = async (req, res) => {

    const bkashResponse = await BkashModel.getBkashQuerySubscriptionRequest(
      req.query.subscriptionrequestid,
      req.headers
    );
    // var redirectURL = bkashResponse.redirectURL
    // console.log(redirectURL)
    // Redirect(
    //     redirectURL
    // )

    if (!bkashResponse) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    // if (bkashResponse.status == constants.NOT_FOUND) {
    //     return ResponseUtils.respondError(res, constants.HTTP_404, bkashResponse);
    // }

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };

  getBkashPaymentListSubscriptionID = async (req, res) => {

    const bkashResponse = await BkashModel.getBkashPaymentListSubscriptionID(
      req.query.subscriptionid,
      req.headers
    );
    // var redirectURL = bkashResponse.redirectURL
    // console.log(redirectURL)
    // Redirect(
    //     redirectURL
    // )

    if (!bkashResponse) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    if (bkashResponse.status == constants.BAD_REQ) {
      return ResponseUtils.respondError(res, constants.HTTP_404, bkashResponse);
    }

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };

  getBkashPaymentInfoByPaymentID = async (req, res) => {
    const bkashResponse = await BkashModel.getBkashPaymentInfoByPaymentID(
      req.query.paymentid,
      req.headers
    );
    if (!bkashResponse) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }

    if (bkashResponse.status == constants.NOT_FOUND) {
      return ResponseUtils.respondError(res, constants.HTTP_404, bkashResponse);
    }

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };

  getBkashCancelSubscription = async (req, res) => {
    const bkashResponse = await BkashModel.getBkashCancelSubscription(req);
    if (!bkashResponse) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }

    if (bkashResponse.status == constants.NOT_FOUND) {
      return ResponseUtils.respondError(res, constants.HTTP_404, bkashResponse);
    }

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };
  getBkashCancelSubscriptionApp = async (req, res) => {
    const bkashResponse = await BkashModel.getBkashCancelSubscriptionApp(
      req,
      req.query.userId,
      req.query.subscriptionid,
      req.query.reason,
      req.headers
    );
    // const subscriptionStatusResponse =  await BkashModel.getBkashQueryBySubscriptionIDAndUpdate(req.query.userId, req.query.subscriptionid,  req.headers)
    // if (!subscriptionStatusResponse) {
    //     return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
    // }
    if (!bkashResponse) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }

    if (bkashResponse.status == constants.NOT_FOUND) {
      return ResponseUtils.respondError(res, constants.HTTP_404, bkashResponse);
    }

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };


 


  getBkashQueryBySubscriptionID = async (req, res) => {
    const bkashResponse = await BkashModel.getBkashQueryBySubscriptionID(
      req.query.subscriptionid,
      req.headers
    );
    if (!bkashResponse) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }

    if (bkashResponse.status == constants.NOT_FOUND) {
      return ResponseUtils.respondError(res, constants.HTTP_404, bkashResponse);
    }

    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };

  getBkashPaymentSchedule = async (req, res) => {
        const bkashResponse = await BkashModel.getBkashPaymentSchedule(
      req.query.frequency,
      req.query.startDate,
      req.query.expiryDate,
      req.headers
    );
    if (!bkashResponse) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }

    if (bkashResponse.status == constants.NOT_FOUND) {
      return ResponseUtils.respondError(res, constants.HTTP_404, bkashResponse);
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      data: bkashResponse,
    });
  };

  getBkashRefundPayment = async (req, res) => {
    const bkashResponse = await BkashModel.getBkashRefundPayment(
      req.query.paymentId,
      req.query.amount,
      req.headers
    );
    // if (!bkashResponse) {
    //     return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
    // }

    if (bkashResponse.status == "BAD_REQUEST") {
      return ResponseUtils.respond(res, constants.HTTP_400, {
        data: bkashResponse,
      });
    } else if (bkashResponse.status == "NOT_FOUND") {
      return ResponseUtils.respond(res, constants.HTTP_404, {
        data: bkashResponse,
      });
    } else {
      return ResponseUtils.respond(res, constants.HTTP_200, {
        data: "Successful",
      });
    }
  };

  getBkashRedirect = async (req, res) => {
 
    var returnValue = await BkashModel.addResponseDataRedirectSuccess(
      req.query.reference
    );
    let redirectURL = `https://kabbik.com/payment-status?reference=${req.query.reference}`;

    if (returnValue.fromSource === "Banglalink" && returnValue.platform === "app") {
      redirectURL = `https://mybl.kabbik.com/payment-status?reference=${req.query.reference}`;
    }

    if (returnValue.success === false) {
      redirectURL += "&status=FAILED";
      if (returnValue.message) {
        redirectURL += `&message=${encodeURIComponent(returnValue.message)}`+(returnValue?.payer?`&phone=${returnValue?.payer}`:'');
      }
    } else {
      redirectURL += "&status=SUCCEEDED"+'&paymentMethod=bKash'+(returnValue?.payer?`&phone=${returnValue?.payer}`:'');
    }

    res.redirect(redirectURL);
  };
  getBkashRedirectBkashMicrosite = async (req, res) => {
    var returnValue =
      await BkashModel.addResponseDataRedirectSuccessBkashMicrosite(
        req.query.reference
      );
    var redirectURL;
    if (returnValue.fromSource == "bkash" && returnValue.platform == "app") {
      if (returnValue.success == false) {
        redirectURL =
          "https://bkash.kabbik.com/payment-status?reference=" +
          req.query.reference +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://bkash.kabbik.com/payment-status?reference=" +
          req.query.reference +
          "&status=SUCCEEDED";
      }
    } else {
      if (returnValue.success == false) {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.query.reference +
          "&status=FAILED";
      } else {
        redirectURL =
          "https://kabbik.com/payment-status?reference=" +
          req.query.reference +
          "&status=SUCCEEDED";
      }
    }
    res.redirect(redirectURL);
  };

  getBkashRedirectTest = async (req, res) => {
    // const bkashResponse = await BkashModel.getBkashRedirect(req.query);

    // var returnValue = await BkashModel.addResponseDataRedirectSuccess(req.query.reference)
    var redirectURL;
    // console.log("returnValue: " + returnValue)
    // if (returnValue == false) {
    redirectURL =
      "https://kabbik.com/payment-status?reference=" +
      req.query.reference +
      "&status=FAILED";

    // } else {
    // redirectURL = "https://kabbik.com/payment-status?reference=" + req.query.reference + "&status=SUCCEEDED"

    // }
    // console.log(redirectURL)
    //redirect with header uid
    res.setHeader("uid", req.query.uid);
    res.redirect(redirectURL);
  };

  getBkashRedirectBkashApp = async (req, res) => {
    // const bkashResponse = await BkashModel.getBkashRedirect(req.query);
    var returnValue = await BkashModel.addResponseDataRedirectSuccessBkashApp(
      req.query.reference
    );
    var redirectURL;
    if (returnValue == false) {
      redirectURL =
        "https://bkash.kabbik.com/payment-status?reference=" +
        req.query.reference +
        "&status=FAILED";
    } else {
      redirectURL =
        "https://bkash.kabbik.com/payment-status?reference=" +
        req.query.reference +
        "&status=SUCCEEDED";
    }
    // console.log(redirectURL)
    res.redirect(redirectURL);
  };
}

module.exports = new BkashController();
