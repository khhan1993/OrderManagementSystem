var jwt = require('jsonwebtoken');

var jwt_checker = function(token) {

    //Verify and decode JWT. Validation process is also included.
    var decoded_jwt = null;
    try {
        decoded_jwt = jwt.verify(token, 'REPLACE_WITH_YOUR_OWN_SECRET_KEY');
    }
    catch(err) {
        decoded_jwt = null;
    }

    return decoded_jwt;
};

var is_empty_check = function(checklist) {
    for(var i in checklist) {
        if(typeof checklist[i] == "undefined" || checklist[i] == null || checklist[i] == "") {
            return true;
        }
    }

    return false;
};

var is_positive_integer_check = function(checklist) {
    for(var i in checklist) {
        if(isNaN(parseInt(checklist[i])) || checklist[i] < 0) {
            return false;
        }
    }

    return true;
};

exports.jwt_checker = jwt_checker;
exports.is_empty_check = is_empty_check;
exports.is_positive_integer_check = is_positive_integer_check;