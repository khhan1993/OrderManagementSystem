var jwt = require('jsonwebtoken');

var jwt_secret_key = 'REPLACE_WITH_YOUR_OWN_SECRET_KEY';

function jwt_checker(token) {

    //Verify and decode JWT. Validation process is also included.
    var decoded_jwt = null;
    try {
        decoded_jwt = jwt.verify(token, 'REPLACE_WITH_YOUR_OWN_SECRET_KEY');
    }
    catch(err) {
        decoded_jwt = null;
    }

    return decoded_jwt;
}

function is_empty_check(checklist) {
    for(var i in checklist) {
        if(typeof checklist[i] == "undefined" || checklist[i] == null || checklist[i] == "") {
            return true;
        }
    }

    return false;
}

function is_positive_integer_check(checklist) {
    for(var i in checklist) {
        if(isNaN(parseInt(checklist[i])) || checklist[i] < 0) {
            return false;
        }
    }

    return true;
}

function get_pagination_info(page_num, contents_per_page, total_num_of_contents) {

    page_num += 1;

    var total_page_count = parseInt(total_num_of_contents / contents_per_page) + 1;

    var prev_active = true;
    var next_active = true;
    var pagination_start_num = page_num - 2;

    if(page_num - 1 <= 2) {
        pagination_start_num = 1;
    }

    if(page_num == 1) {
        prev_active = false;
    }

    if(total_page_count == page_num) {
        next_active = false;
    }

    if(total_page_count - page_num <= 2) {
        pagination_start_num = total_page_count - 4;

        if(pagination_start_num < 1) {
            pagination_start_num = 1;
        }
    }

    var pagination_num_list = [];
    for(var i = pagination_start_num; (i < pagination_start_num + 5) && (i <= total_page_count); i++) {
        pagination_num_list.push(i);
    }

    return {
        current_page: page_num,
        prev_active: prev_active,
        next_active: next_active,
        pagination_num_list: pagination_num_list
    };
}

exports.jwt_secret_key = jwt_secret_key;
exports.jwt_checker = jwt_checker;
exports.is_empty_check = is_empty_check;
exports.is_positive_integer_check = is_positive_integer_check;
exports.get_pagination_info = get_pagination_info;