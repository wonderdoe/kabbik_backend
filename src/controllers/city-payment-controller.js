const dotenv = require("dotenv");
const CityPaymentModel = require("../data/models/city-payment-model");
const constants = require("../utils/constants");
const ResponseUtils = require("../utils/res-utils");
dotenv.config();

class CityPaymentController {


    createPayment = async (req, res) => {
        const data = await CityPaymentModel.createPayment(req);

        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }

        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    validatePayment = async (req, res) => {
        const data = await CityPaymentModel.validatePayment(req);

        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }

        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }


    redirectPayment = async (req, res) => {
         let data = await CityPaymentModel.redirectPayment(req);
         return ResponseUtils.respond(res, constants.HTTP_200, data);
    //    return res.redirect(303, "https://kabbik.com/payment-status?stripeStatus=Success&message=Success&status=SUCCEEDED");
    }


    cityPayTransectionReport = async (req, res) => {
        const data = await CityPaymentModel.cityPayTransectionReport(req);

        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }

        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


}

module.exports = new CityPaymentController();
