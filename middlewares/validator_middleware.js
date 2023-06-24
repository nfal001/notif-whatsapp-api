const { body, validationResult } = require('express-validator');

const inputCreateClientValidator = (req, res, next) => {
    body.checkBody('clientname', 'The clientname field cannot be empty.').isEmpty();
    body.checkBody('clientname', 'The clientname field must start and end with an alphanumeric character.').isSlug().isString();

    const errors = req.validationErrors();

    if (errors){
        return res.status(400).json({
            status: false,
            error: errors
        });
    } else {
        next();
    }
}

module.exports = {
    inputCreateClientValidator
}