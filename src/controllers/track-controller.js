const TrackModel = require('../data/models/track-model');
const S3Helper = require('../utils/s3-helper');
const HttpException = require('../utils/httpexception-utils');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const { validationResult } = require('express-validator');
const multer = require('multer');
const coreUtils = require('../utils/core-utils');
const contentUtils = require('../utils/content-utils');
const Authvalidator = require('../validators/auth-validator')
require('dotenv').config();


class TrackController {

    testPost = (req, res) => {
        const result = Authvalidator.coreValidation(req)
        if (result) {
            res.send("in to the test post!!")
        } else {
            return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ)
        }
    }

    getById = async (req, res, next) => {
        this.checkValidation(req);
        const data = await TrackModel.findOne(
            [
                req.params.id,
                req.query.user_id
            ]
        );
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    getCombinedDataForApp = async (req, res) => {

        const combinedData = await TrackModel.getCombinedDataForApp();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        var contentData = await contentUtils.getBannerContents().catch(
            err => {
                                // contentData = [];
            }
        );
        if (!contentData) {
            contentData = [];
        }
        // [0..5] has expected data
        const data = {
            data: [
                {
                    name: 'ট্রেন্ডিংস',
                    data: combinedData[0]
                },
                {
                    name: 'থ্রীলার',
                    data: combinedData[1]
                },
                {
                    name: 'রোমান্স',
                    data: combinedData[2]
                },
                {
                    name: 'বিনোদোন',
                    data: combinedData[3]
                },
                {
                    name: 'ছোট গল্প',
                    data: combinedData[4]
                },
                {
                    name: 'উপন্যাস',
                    data: combinedData[5]
                }
            ],
            bannerList: contentData
        };
        return ResponseUtils.respond(res, constants.HTTP_200, data);

    }

    sendEmail = async (req, res, next) => {
        // const { to, subject, html, text, from } = req.body;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const reportDate = yesterday.toISOString().split('T')[0];

        const subjectTxt = `Daily Signup & Subscription Report - ${reportDate}`;
        const emailData = {
            from: "\"No-Reply kabbik\" <no-reply@kabbik.com>",
            to: "faishal@wondersoftsolution.com,  mdfaishal329@gmail.com,  shemoon8@gmail.com, info@wondersoftsolution.com ",
            // tanin@wondersoftsolution.com, info@wondersoftsolution.com, shemoon8@gmail.com,
            subject: subjectTxt,
            // html: "<p>your html here</p>",
            text: "plain text fallback"
          }
        const { to, subject, html, text, from } = emailData;
 
        if (!to || !subject) {
            return ResponseUtils.respondError(res, constants.HTTP_400, 'to and subject are required.');
        }
 
        const data = await TrackModel.sendEmail({ to, subject, text, from });
 
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_500, constants.INTERNAL_SERVER_ERROR);
        }
 
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            { messageId: data.messageId }
        );
    };

    getCombinedData = async (req, res, next) => {
        const combinedData = await TrackModel.getCombinedData();
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        var contentData = await contentUtils.getBannerContents().catch(
            err => {
                                // contentData = [];
            }
        );
        if (!contentData) {
            contentData = [];
        }
        // [0..5] has expected data
        const data = {
            data: [
                {
                    name: 'ট্রেন্ডিংস',
                    data: combinedData[0]
                },
                {
                    name: 'থ্রীলার',
                    data: combinedData[1]
                },
                {
                    name: 'রোমান্স',
                    data: combinedData[2]
                },
                {
                    name: 'বিনোদোন',
                    data: combinedData[3]
                },
                {
                    name: 'ছোট গল্প',
                    data: combinedData[4]
                },
                {
                    name: 'উপন্যাস',
                    data: combinedData[5]
                }
            ],
            bannerList: contentData
        };
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    emailQuizReportSender = async (req, res) => {
        const data = await TrackModel.emailQuizReportSender(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    getPlaylist = async (req, res, next) => {
        const data = await TrackModel.getPlaylist(req.query.count);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            { data: data }
        );
    };

    createTrack = async (req, res, next) => {
        S3Helper.upload(req, res, async function (err) {
            if (err) {
                if (err instanceof multer.MulterError) {
                    // A Multer error occurred when uploading.
                    coreUtils.printStringify(err);
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                } else {
                    // An unknown error occurred when uploading.
                    coreUtils.printStringify(err);
                    return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
                }
            }
            //console.log('uploaded');
            // good to go
            const thumbUrl = req.files[0].location;
            const audioUrl = coreUtils.replaceHTTP(req.files[1].location);
            const {
                title,
                description,
                author,
                audiobook,
                contributing_artists: contributingArtists,
                category,
                genre
            } = req.body;
            const result = await TrackModel.createTrack(
                title,
                description,
                author,
                audiobook,
                contributingArtists,
                category,
                genre,
                thumbUrl,
                audioUrl
            );
            if (!result) {
                return ResponseUtils.respondError(res, constants.HTTP_401, 'Unable to create');
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_201,
                {
                    id: result.id,
                    image_file_url: thumbUrl,
                    audio_file_url: audioUrl
                }
            );
        });
    };

    createTrackTemp = async (req, res, next) => {
        // this.checkValidation(req);
        const thumbUrl = 'url test';
        const audioUrl = 'url test';
        const {
            title,
            description,
            author,
            audiobook,
            contributing_artists: contributingArtists,
            category,
            genre
        } = req.body;
        const result = await TrackModel.createTrack(
            title,
            description,
            author,
            audiobook,
            contributingArtists,
            category,
            genre,
            thumbUrl,
            audioUrl
        );
        if (!result) {
            return ResponseUtils.respondError(res, constants.HTTP_401, 'Unable to create');
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_201,
            {
                id: result.id,
                image_file_url: thumbUrl,
                audio_file_url: audioUrl
            }
        );
    };

    updateTrackFiles = async (req, res, next) => {
        S3Helper.upload(req, res, async function (err) {
            if (err) {
                if (err instanceof multer.MulterError) {
                    // A Multer error occurred when uploading.
                    coreUtils.printStringify(err);
                    return ResponseUtils.respondError(res, constants.HTTP_500, 'Unable to upload');
                } else {
                    // An unknown error occurred when uploading.
                    coreUtils.printStringify(err);
                    return ResponseUtils.respondError(res, constants.HTTP_500, 'Unable to upload');
                }
            }
            //console.log('uploaded');
            const thumbUrl = req.files[0].location;
            const audioUrl = coreUtils.replaceHTTP(req.files[1].location);
            const {
                id
            } = req.body;
            //console.log(id)
            const results = await TrackModel.updateTrackFiles(
                id,
                thumbUrl,
                audioUrl
            );
            if (!results) {
                return ResponseUtils.respondError(res, constants.HTTP_401, 'Unable to create');
            }
            //console.log(results.affectedRows)
            return ResponseUtils.respond(
                res,
                constants.HTTP_201,
                {
                    id: results.affectedRows,
                    image_file_url: thumbUrl,
                    audio_file_url: audioUrl
                }
            );
        });
    };

    checkValidation = (req) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            throw new HttpException(400, 'Validation faild', errors);
        }
    }

    debugger = async (req, res, next) => {
        const data = req.body;
        console.log('###########################debugger data###########################',data);
        return ResponseUtils.respond(res, constants.HTTP_200, { message: 'success' });
    };
}

module.exports = new TrackController;