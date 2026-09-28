const UserModel = require('../data/models/user-model');
const HttpException = require('../utils/httpexception-utils');
const { validationResult } = require('express-validator');
const ResponseUtils = require('../utils/res-utils');
const S3Helper = require('../utils/s3-helper');
const MulterHelper = require('../utils/multer-helper');
const multer = require('multer');
const constants = require('../utils/constants');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const coreUtils = require('../utils/core-utils');
const cons = require('../utils/constants');
dotenv.config();

class UserController {

    getAllUsers = async (req, res, next) => {
        let userList = await UserModel.getAll();
        if (!userList) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }

        // userList = userList.map(user => {
        //     const { password, ...userWithoutPassword } = user;
        //     return userWithoutPassword;
        // });

        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            userList
        );

    };

    getUserById = async (req, res, next) => {
        // Ownership check: a user may only read their own record (see #3.1)
        if (String(req.user?.user_id) !== String(req.params.id)) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.UNAUTH_REQ);
        }
                const user = await UserModel.findById(req.params.id);
        if (!user) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            user
        );
    };

    getUserByUserName = async (req, res, next) => {
        const user = await UserModel.findOne({ username: req.params.username });
        if (!user) {
            throw new HttpException(404, 'User not found');
        }

        const { password, ...userWithoutPassword } = user;

        res.send(userWithoutPassword);
    };

    getCurrentUser = async (req, res, next) => {
        const { password, ...userWithoutPassword } = req.currentUser;

        res.send(userWithoutPassword);
    };


    createUser = async (req, res, next) => {
        this.checkValidation(req, res);

        const result = await UserModel.create(req.body);

        if (!result) {
            throw new HttpException(500, 'Something went wrong');
        }

        res.status(201).send('User was created!');
    };

    updateUser = async (req, res) => {
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
                return ResponseUtils.respondError(res, constants.HTTP_400, 'Unable to create');
            }
            const {
                full_name, phone_email, city_name, address, post_code
            } = req.body;
            const result = await UserModel.updateUser(
                full_name,
                phone_email,
                city_name,
                address,
                post_code,
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
    };

    updateUserWithoutImagePhone = async (req, res, next) => {
        this.checkValidation(req, res);
        const { full_name, phone_phone, city_name, address, post_code } = req.body;
        const result = await UserModel.updateUserWithoutImagePhone(
            full_name,
            phone_phone,
            city_name,
            address,
            post_code,
            req.params.id);
        if (!result) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.NOT_FOUND);
        }
        const { affectedRows, changedRows } = result;
        if (!affectedRows) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_404,
                'User not found'
            );
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                message: 'User updated successfully'
            }
        );
    };


    updateUserWithoutImage = async (req, res, next) => {
        this.checkValidation(req, res);
        const { full_name, phone_email, city_name, address, post_code,user_email } = req.body;
        const result = await UserModel.updateUserWithoutImage(
            full_name,
            phone_email,
            city_name,
            address,
            post_code,
            user_email,
            req.params.id);
        if (!result) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.NOT_FOUND);
        }
        const { affectedRows, changedRows } = result;
        if (!affectedRows) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_404,
                'User not found'
            );
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                message: 'User updated successfully'
            }
        );
    };

    updateUserWhilePayment = async (req, res) => {
                        const { full_name, city_name, address, post_code, phone_no } = req.body;
        const result = await UserModel.updateUserWhilePayment(
            full_name,
            city_name,
            address,
            post_code,
            phone_no,
            req.params.id);
        if (!result) {
            return ResponseUtils.respondError(res, constants.HTTP_401, constants.NOT_FOUND);
        }
        const { affectedRows, changedRows } = result;
        if (!affectedRows) {
            return ResponseUtils.respond(
                res,
                constants.HTTP_404,
                'User not found'
            );
        }
        return ResponseUtils.respond(
            res,
            constants.HTTP_200,
            {
                message: 'User updated successfully'
            }
        );
    };

    deleteUser = async (req, res, next) => {
        const result = await UserModel.delete(req.params.id);
        if (!result) {
            throw new HttpException(404, 'User not found');
        }
        res.send('User has been deleted');
    };

    softDelete = async (req, res, next) => {
       try{
                        let user = req?.user?.user_id;
            if(!user){
                console
                return ResponseUtils.respondError(res, constants.HTTP_401, constants.NOT_FOUND);
            }
                        const result = await UserModel.softDelete(user);
            if (!result) {
                throw new HttpException(404, 'User not found');
            }
            return ResponseUtils.respond(
                res,
                constants.HTTP_200,
                {
                    message: 'User deleted successfully'
                }
            );;
       }catch(e){
            console.log("req-eeeeeeeeeeeeeeeeeeeeeee",e);
       }
    };

    userLogin = async (req, res, next) => {
        this.checkValidation(req, res);

        const { email, password: pass } = req.body;

        const user = await UserModel.findOne({ email });

        if (!user) {
            throw new HttpException(401, 'Unable to login!');
        }

        const isMatch = await bcrypt.compare(pass, user.password);

        if (!isMatch) {
            throw new HttpException(401, 'Incorrect password!');
        }

        // user matched!
        const secretKey = process.env.SECRET_JWT || "";
        const token = jwt.sign({ user_id: user.id.toString() }, secretKey, {
            expiresIn: '24h'
        });

        const { password, ...userWithoutPassword } = user;

        res.send({ ...userWithoutPassword, token });
    };

    checkValidation = (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            throw new HttpException(400, 'Validation faild', errors);
        }
    }

    getForUserPurchase = async (req, res) => {
        const data = await UserModel.findForUserIdPurchase(
            req.query.user_id
        );
        if (!data) {
            return ResponseUtils.respondError(res, cons.HTTP_404, cons.NOT_FOUND);
        }
        const purchase = [];
        var datum;
        for (let index in data) {
            datum = coreUtils.stringifyToObject(data[index]);
            datum.is_purchase = true;
            purchase.push(datum);
        }
        return ResponseUtils.respond(
            res,
            cons.HTTP_200,
            {
                data: purchase
            }
        );
    };

    getByIds = async (req, res, next) => {
        // Ownership check: a user may only query their own purchase status (see #3.1)
        if (String(req.user?.user_id) !== String(req.query.user_id)) {
            return ResponseUtils.respondError(res, cons.HTTP_401, cons.UNAUTH_REQ);
        }
        const data = await UserModel.findOnesPurchase(
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

}

module.exports = new UserController;