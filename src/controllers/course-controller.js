const ResponseUtils = require('../utils/res-utils');
const CourseModel = require('../data/models/course-model');
const constants = require('../utils/constants');
const {
    validationResult
} = require('express-validator');
 

require('dotenv').config();

class CourseController {

    createCourse = async (req, res) => {
        const data = await CourseModel.createCourse(req);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }; 
    
    getAllCourse = async (req, res) => {
         const data = await CourseModel.getAllCourse(req, req.query.userId);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, data);
    }


 getCourseById = async (req, res) => {
        const data = await CourseModel.getCourseById(req);
       if (!data) {
           return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
       }
       return ResponseUtils.respond(res, constants.HTTP_200, data);
   };


    getPurchasedCourse = async (req, res) => {
         const data = await CourseModel.getPurchasedCourse(req, req.params.id);
        if (!data) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, {
            data: data
        });
    };
}

module.exports = new CourseController;