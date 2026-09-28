const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const playlistModel = require('../data/models/playlist-model');
require('dotenv').config();

class PlaylistController {
    createFolder = async (req, res) => {
        try{
            let user_id=req.user?.user_id;
            const {folder_name,desc}=req.body;
            const data = await playlistModel.createFolder(
                user_id,folder_name,desc
            );

            return ResponseUtils.respond(res, constants.HTTP_200, data);
        }catch(e){
            console.log(e,"createFolder")
            return ResponseUtils.respond(res, constants.HTTP_500, {success:false});
        }
    };

    addBooksToPlaylist = async (req, res) => {
        try{
            let user_id=req.user?.user_id;
            const {audiobook_id,folders_id}=req.body;
            const data = await playlistModel.addBooksToPlaylist(
                audiobook_id,
              folders_id,
              user_id
            );

            return ResponseUtils.respond(res, constants.HTTP_200, data);
        }catch(e){
            console.log(e,"createFolder")
            return ResponseUtils.respond(res, constants.HTTP_500, {success:false});
        }
    };

    deleteBookFromPlayList = async (req, res) => {
        try{
            let user_id=req.user?.user_id;
            const {bookInPlayListId}=req.params;
            const data = await playlistModel.deleteBookFromPlayList(
                bookInPlayListId,user_id
            );

            return ResponseUtils.respond(res, constants.HTTP_200, data);
        }catch(e){
            console.log(e,"deleteBookFromPlayList")
            return ResponseUtils.respond(res, constants.HTTP_500, {success:false});
        }
    };

    editFoldersName = async (req, res) => {
        try{
            let user_id=req.user?.user_id;
            const {id,folder_name}=req.body;
            const data = await playlistModel.editFoldersName(
                id,folder_name,user_id
            );

            return ResponseUtils.respond(res, constants.HTTP_200, data);
        }catch(e){
            console.log(e,"editFoldersName")
            return ResponseUtils.respond(res, constants.HTTP_500, {success:false});
        }
    };

    getAllBooksForUser = async (req, res) => {
        try{
            let user_id=req.user?.user_id;
            const data = await playlistModel.getAllBooksOfSingleUser(
                Number(user_id)
            );

            return ResponseUtils.respond(res, constants.HTTP_200, data);
        }catch(e){
            console.log(e,"editFoldersName")
            return ResponseUtils.respond(res, constants.HTTP_500, {success:false});
        }
    };


    getAllBooksForUserNew = async (req, res) => {
        try{
            let user_id=req.user?.user_id;
            const data = await playlistModel.getAllBooksOfSingleUserNew(
                Number(user_id)
            );

            return ResponseUtils.respond(res, constants.HTTP_200, data);
        }catch(e){
            console.log(e,"editFoldersName")
            return ResponseUtils.respond(res, constants.HTTP_500, {success:false});
        }
    };

   
}

module.exports = new PlaylistController;