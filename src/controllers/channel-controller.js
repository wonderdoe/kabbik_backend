const ChannelModel = require('../data/models/channel-model');
const S3Helper = require('../utils/s3-helper');
const MulterHelper = require('../utils/multer-helper');
const HttpException = require('../utils/httpexception-utils');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const { validationResult } = require('express-validator');
const multer = require('multer');
const LoggerError = require('../utils/logger-error');
require('dotenv').config();

class ChannelController {

    getAll = async (req, res) => {
        const data = await ChannelModel.getAll();
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    getById = async (req, res) => {
        let data = await ChannelModel.findById(
            [
                req.params.id
            ]
        )
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND)
        }
        data.kabbik_percentage = 100 - data.percentage
        return ResponseUtils.respond(res, constants.HTTP_200, data)
    }

    getByPublisherId = async (req, res) => {
        let data = await ChannelModel.getByPublisherId(
            [
                req.query.publisher_id
            ]
        )
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND)
        }
        data.kabbik_percentage = 100 - data.percentage
        return ResponseUtils.respond(res, constants.HTTP_200, data)
    }

    getByAdminId = async (req, res) => {
        let data = await ChannelModel.getByAdminId(
            [
                req.query.admin_id
            ]
        )
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND)
        }
        data.kabbik_percentage = 100 - data.percentage
        return ResponseUtils.respond(res, constants.HTTP_200, data)
    }



    create = async (req, res) => {
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
            // good to go
            let imageUrl = null
            if (req.files && req.files.length > 0) {
                imageUrl = req.files[0].location;
            }
            if (imageUrl == null) {
                return ResponseUtils.respondError(res, constants.HTTP_400, 'Unable to create');
            }
            const {
                name,
                publisher_id: publisherId
            } = req.body;
            const id = await ChannelModel.create(
                name,
                imageUrl,
                publisherId
            );
            if (!id || id <= 0) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_201,
                {
                    id: id,
                    image_file_url: imageUrl
                }
            );
        });
        /* MulterHelper.upload(req, res, async function (err) {
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
            // good to go
            /* console.log(req.files[0])
            const file = req.files[0]
            const imageUrl = file.destination + '/' + file.filename; 
            const imageUrl = ''
            const {
                name,
                publisher_id: publisherId
            } = req.body;
            const id = await ChannelModel.create(
                name,
                imageUrl,
                publisherId
            );
            if (!id || id <= 0) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_201,
                {
                    id: id,
                    image_file_url: imageUrl
                }
            );
        }); */
    };

    createForAdmin = async (req, res) => {
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
            // good to go
            let imageUrl = null
            if (req.files && req.files.length > 0) {
                imageUrl = req.files[0].location;
            }
            if (imageUrl == null) {
                return ResponseUtils.respondError(res, constants.HTTP_400, 'Unable to create');
            }
            const {
                name,
                publisher_id: publisherId
            } = req.body;
            const id = await ChannelModel.createForAdmin(
                name,
                imageUrl,
                publisherId
            );
            if (!id || id <= 0) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_201,
                {
                    id: id,
                    image_file_url: imageUrl
                }
            );
        });
    }

    update = async (req, res) => {
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
            // good to go
            let imageUrl = null
            if (req.files && req.files.length > 0) {
                imageUrl = req.files[0].location;
            }
            if (imageUrl == null) {
                return ResponseUtils.respondError(res, constants.HTTP_400, 'Unable to create');
            }
            const {
                name
            } = req.body;
            const result = await ChannelModel.update(
                name,
                imageUrl,
                req.params.id
            );
            if (!result) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_200,
                {
                    success: true
                }
            );
        });

        /* const imageUrl = 'bbbbb';
        const {
            name
        } = req.body;
        const result = await ChannelModel.update(
            name,
            imageUrl,
            req.params.id
        );
        if (!result) {
            return ResponseUtils.respondError(res, constants.HTTP_401, 'Unable to create');
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                id: result.id,
                image_file_url: imageUrl
            }
        ); */
    };

    updateWithoutImage = async (req, res) => {
        const {
            name
        } = req.body;
        const result = await ChannelModel.update(
            name,
            null,
            req.params.id
        );
        if (!result) {
            return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                success: true
            }
        );
    };

    checkValidation = (req) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            throw new HttpException(400, 'Validation faild', errors);
        }
    }
}

module.exports = new ChannelController;