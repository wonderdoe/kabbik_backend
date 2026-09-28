const FavModel = require('../data/models/fav-model');
const HttpException = require('../utils/httpexception-utils');
const ResponseUtils = require('../utils/res-utils');
const cons = require('../utils/constants');
const { validationResult } = require('express-validator');
const coreUtils = require('../utils/core-utils');
const constants = require('../utils/constants');
require('dotenv').config();

class FavController {

    getAll = async (req, res, next) => {
        /* let userList = await TrackModel.find();
        if (!userList.length) {
            throw new HttpException(404, 'Users not found');
        }
        userList = userList.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        res.send(userList); */
    };

    getForUser = async (req, res, next) => {
        const data = await FavModel.findForUserId(
            req.query.user_id
        );
        if (!data) {
            return ResponseUtils.respondError(res, cons.HTTP_404, cons.NOT_FOUND);
        }
        const favs = [];
        var datum;
        for (let index in data) {
            datum = coreUtils.stringifyToObject(data[index]);
            datum.is_favorite = true;
            favs.push(datum);
        }
        return ResponseUtils.respond(
            res,
            cons.HTTP_200,
            {
                data: favs
            }
        );
    };

    getByIds = async (req, res, next) => {
        const data = await FavModel.findOne(
            [
                req.query.track_id,
                req.query.user_id
            ]
        );
        if (!data) {
            return ResponseUtils.respondError(res, cons.HTTP_404, cons.NOT_FOUND);
        }
        return ResponseUtils.respond(
            res,
            cons.HTTP_200,
            data
        );
    };

    createFav = async (req, res) => {
        const { audiobook_id, user_id } = req.body;
        const id = await FavModel.createFav(audiobook_id, user_id);
        if(id?.message){
            return ResponseUtils.respondError(res, cons.HTTP_200, id);
        }
        if (!id) {
            return ResponseUtils.respondError(res, cons.HTTP_400, constants.BAD_REQ);
        }
        return ResponseUtils.respond(res, cons.HTTP_201, { id: id });
    };

    deleteFav = async (req, res) => {
        const { audiobook_id: audiobookId, user_id: userId } = req.query;
        const rowCount = await FavModel.delete(
            audiobookId,
            userId
        );
        if (!rowCount || rowCount <= 0) {
            return ResponseUtils.respondError(res, constants.HTTP_400, constants.BAD_REQ);
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                success: rowCount > 0 ? true : false
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

module.exports = new FavController;