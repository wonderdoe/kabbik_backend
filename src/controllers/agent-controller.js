const AgentModel = require('../data/models/agent-model');
const S3Helper = require('../utils/s3-helper');
const HttpException = require('../utils/httpexception-utils');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const { validationResult } = require('express-validator');
const multer = require('multer');
const coreUtils = require('../utils/core-utils');
const contentUtils = require('../utils/content-utils');
const UserModel = require('../data/models/user-model');
const SmsNotificationHelper = require('../utils/sms-notification-helper');
require('dotenv').config();

class AgentController {

    getAll = async (req, res) => {
        const data = await AgentModel.getAll();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    getBlockedAgent = async (req, res) => {
        const data = await AgentModel.getBlockedAgent();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }

    updateAgentStatus = async (req, res) => {
        const data = await AgentModel.updateAgentStatus(req.params.id, req.body.deletestatus);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }


    getAgentsAudiobook = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentsAudiobook(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    getAgentSubscribedUsers = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentSubscribedUsers(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
        
    getAgentSubscriptionReport = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentSubscriptionReport(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    
    checkUsersSubscription = async (req, res) => {
        this.checkValidation(req);
        const data = await UserModel.findByUsername(req.body.username)
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        // console.log(data);
        return ResponseUtils.respond(res, constants.HTTP_200, {
            data : {
                username: data.user_name,
                fullname : data.full_name,
                phone: data.phone_no,
                email : data.user_email,
                subscription_status : data.is_subscribed,
                purchase_time : data.purchase_time,
                next_purchase_time : data.next_purchase_time,
                payment_methd: data.payment_method,
                subscriptionDetails: data.subscriptionDetails
            }
        });
    };
    getAgentsById = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentsById(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    updateAgents = async (req, res) => {
        this.checkValidation(req);
                if (req.body.imageUrl == null) {
            S3Helper.upload(req, res, async function (err) {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        // A Multer error occurred when uploading.
                                                LoggerError.log(err)
                        return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                    } else {
                        // An unknown error occurred when uploading.
                                                LoggerError.log(err)
                        return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                    }
                }

                let imageUrl = null
                if (req.files && req.files.length > 0) {
                    imageUrl = req.files[0].location;
                }
                if (imageUrl == null) {
                    return ResponseUtils.respondError(res, constants.HTTP_400, 'Unable to upload');
                }
                // const {
                //     title, size, description, 
                // } = req.body;


                const { email, phone, full_name: fullName, address, id, en_name } = req.body

                                const result = await AgentModel.updateAgentById(email,
                    phone,
                    fullName,
                    address, imageUrl, id, en_name);

                                if (!result) {
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                }
                return ResponseUtils.respond(
                    res,
                    constants.HTTP_201, {
                    data: "Success"
                }
                );
            });
        } else {


            const { email, phone, full_name: fullName, address, id, imageUrl, en_name } = req.body

                        const result = await AgentModel.updateAgentById(email,
                phone,
                fullName,
                address, imageUrl, id, en_name);
            if (!result) {
                return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
            }
            return ResponseUtils.respond(res, constants.HTTP_200, {
                result: result
            });
        }
    };
    addSubscription = async (req, res) => {

        const { phone, name, email, packageId, fromAgent, agentId } = req.body
        const user = await UserModel.createOrReturnNew(phone, name, constants.PHONE, "", "Agent");
        // console.log(user);

        // console.log(await UserModel.findById(user.id))
        if (!user) {
            const result = await AgentModel.addSubscription(phone, name, email, packageId, fromAgent, 
                agentId, user.is_subscribed, user.purchase_time, user.next_purchase_time,
                user.id, "Unable to Give Subscription!", 0
                );
            return ResponseUtils.respond(res, constants.HTTP_200, {
                status: constants.HTTP_401,
                data: 'Unable to Give Subscription!'
            });
        }

        if (user.is_subscribed == 1) {
            

            const result = await AgentModel.addSubscription(phone, name, email, packageId, fromAgent, 
                agentId, user.is_subscribed, user.purchase_time, user.next_purchase_time,
                user.id, "User Already Subscribed!", 0
                );
            return ResponseUtils.respond(res, constants.HTTP_200, {
                status: constants.HTTP_401,
                data: 'User Already Subscribed!'
            });
        } else {
            var userFinalResponse = await UserModel.giveSubscriptionByAgent(user.id, packageId)

            if (!userFinalResponse) {
                const result = await AgentModel.addSubscription(phone, name, email, packageId, fromAgent, 
                    agentId, user.is_subscribed, user.purchase_time, user.next_purchase_time,
                    user.id, "Unable to Give Subscription Final Response Error!", 0
                    );
                return ResponseUtils.respond(res, constants.HTTP_200, {
                    status: constants.HTTP_401,
                    data: 'Unable to Give Subscription!'
                });
            }

            


            await AgentModel.addSubscription(phone, name, email, packageId, fromAgent, 
                agentId, userFinalResponse.is_subscribed, userFinalResponse.purchase_time, userFinalResponse.next_purchase_time,
                userFinalResponse.id, "Subscription Provided to user", 1
                );
            const resPack = await AgentModel.getSubscriptionPackageById(packageId)
            await SmsNotificationHelper.sendSMS(phone, 
                `Dear ${name}, \nWelcome to Kabbik! Your ${resPack.name} subscription is now active. To enjoy our audiobooks, simply log in using your mobile number (${phone.startsWith('88') ? phone.slice(2) : phone}) on our app/website. \nWebsite Link: https://kabbik.com\nDownload our app from the Play Store: https://bit.ly/3BKD1RJ\nDownload our app from the App Store: https://bit.ly/kabbik`)
                return ResponseUtils.respond(res, constants.HTTP_200, {
                    status: constants.HTTP_200,
                    data: "Subscription Provided to user : " + user.id
                });
            // return ResponseUtils.respond(res, constants.HTTP_200, {
            //     result: "Subscription Provided to user : " + user.id
            // });
        }
    };

    getAgentslist = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentslist(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    updateAgent = async (req, res) => {
        // this.checkValidation(req);
        const data = await AgentModel.updateAgent(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    getCurrentAgent = async (req, res) => {
        // this.checkValidation(req);
        const data = req.currentUser
        delete data.pass_hash;
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    getAgentsAudiobookSummary = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentsAudiobookSummary(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    getAgentPackageList = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentPackageList(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };
    getAgentsPaidUsersSummary = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentsPaidUsersSummary(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    getAgentsAudiobookSummaryToday = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentsAudiobookSummaryToday(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    getAgentsAudiobookSummaryYesterday = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.getAgentsAudiobookSummaryYesterday(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };


    update = async (req, res) => {
        const {
            full_name: fullName,
            address
        } = req.body;
        // sp with update query returns obj with affected rows
        const result = await AgentModel.update(
            fullName,
            address,
            req.params.id
        );
        if (!result) {
            return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                success: result.affectedRows > 0 ? true : false
            }
        )
    };

    getAdminPublishserId = async (req, res) => {
        let data = await AgentModel.getAdminPublishserId(req.params.id)
        //console.log(req.params.admin_id)
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND)
        }
        data.kabbik_percentage = 100 - data.percentage
        return ResponseUtils.respond(res, constants.HTTP_200, data)
    }

    delete = async (req, res) => {
        this.checkValidation(req);
        const data = await AgentModel.delete(
            req.params.id
        );
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    checkValidation = (req) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            throw new HttpException(400, 'Validation faild', errors);
        }
    }
}

module.exports = new AgentController;