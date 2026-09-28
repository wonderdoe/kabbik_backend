const ResponseUtils = require('../utils/res-utils');
const constants = require('../utils/constants');
const subs_page_track_model = require('../data/models/subs_page_track_model.js');

require('dotenv').config();

class SubsPageTrackController {
	postToSubsPageTrack = async (req, res) => {
        let {user_id,email,phone,action_type,selected_pack_id,selected_pay_method,track_id} = req.body;
        
       const combinedData = await subs_page_track_model.InsertToSubsPageTracker(
            user_id,email,phone,action_type,selected_pack_id,selected_pay_method,track_id
        );
        if (!combinedData) {
            return ResponseUtils.respondError(res, constants.HTTP_404, constants.NOT_FOUND);
        }
        return ResponseUtils.respond(res, constants.HTTP_200, combinedData);
    };
}

module.exports = new SubsPageTrackController;