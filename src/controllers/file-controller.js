const S3Helper = require('../utils/s3-helper');
const MulterHelper = require('../utils/multer-helper');
const ResponseUtils = require('../utils/res-utils');
const LoggerError = require('../utils/logger-error');
const constants = require('../utils/constants');

class FileController {

    upload = async (req, res) => {
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
            if (!req.files || req.files.length == 0) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            const fileUrls = req.files.map(f => f.location)
            //console.log(fileUrls);
            return ResponseUtils.respond(
                res,
                constants.HTTP_200,
                {
                    file_urls: fileUrls
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
            if (!req.files || req.files.length == 0) {
                return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
            }
            const fileUrls = req.files.map(f => f.destination + '/' + f.filename)
            return ResponseUtils.respond(
                res,
                constants.HTTP_200,
                {
                    file_urls: fileUrls
                }
            );
        }); */
    };

    stream = async (req, res) => {
        const stream = S3Helper.getObjectStream(req.params.name)
        res.set('Accept-Ranges', 'bytes')
        res.set('Content-Type', 'audio/mpeg')
        stream.pipe(res)
    };
}

module.exports = new FileController;