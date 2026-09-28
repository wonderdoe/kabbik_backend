const { check, validationResult } = require('express-validator');

module.exports = class Authvalidator {

    static coreValidation = (req) => {
        //console.log(req.body)
        check('name', 'name required').isLength({ min: 2 });
        check('email', 'email required').isEmail();
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            //console.log("in if")
            return false
        } else {
            return true;
        }
    }
}