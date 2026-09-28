const ResponseUtils = require('../utils/res-utils');
const xlsx = require("xlsx");
const fs = require("fs");
const constants = require('../utils/constants');
require('dotenv').config();
const DB = require('../data/db');
const affiliateModel = require('../data/models/affiliate-model');

class AffiliateController {

    otpRequest = async (req, res) => {
        const data = await affiliateModel.otpRequest(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respondError(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    otpVerificationRequest = async (req, res) => {
        const data = await affiliateModel.otpVerificationRequest(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    login = async (req, res) => {
        const data = await affiliateModel.login(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    getProducts = async (req, res) => {
        const data = await affiliateModel.getProducts(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

  getSubscriptionPackage = async (req, res) => {
        const data = await affiliateModel.getSubscriptionPackage(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    withdrawalHistory = async (req, res) => {
        const data = await affiliateModel.withdrawalHistory(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };



 searchProducts = async (req, res) => {
        const data = await affiliateModel.searchProducts(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


    generateReferLink = async (req, res) => {
        const data = await affiliateModel.generateReferLink(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    redirectToTarget = async (req, res) => {
        const data = await affiliateModel.redirectToTarget(
            req
        );
        if (!data || data.success === false) {
            return res.redirect('https://kabbik.com');
        }
	        return res.redirect(data.redirectUrl);
    };

    getLeaderboard = async (req, res) => {
        const data = await affiliateModel.getLeaderboard(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


    requestToWithDraw = async (req, res) => {
        const data = await affiliateModel.requestToWithDraw(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };



    dashBoardData = async (req, res) => {
        const data = await affiliateModel.dashBoardData(
            req
        );
        if (!data || data.success === false) {
            return ResponseUtils.respond(res, constants.HTTP_404, data);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

}

module.exports = new AffiliateController;


