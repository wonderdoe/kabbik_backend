const AdminModel = require('../data/models/admin-model');
const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
require('dotenv').config();

class AdminController {
    getById = async (req, res) => {
        const data = await AdminModel.findOne(
            [req.params.id,]
        );
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    };

    updateAdmin = async (req, res) => {
        const { full_name } = req.body;
        const result = await AdminModel.update(full_name, req.params.id);
        if (!result) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.NOT_FOUND);
        }
        const { affectedRows, changedRows } = result;
        if (!affectedRows) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_404,
                'Profile not found'
            );
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                message: 'Profile updated successfully'
            }
        );
    };
}

module.exports = new AudiobookController;