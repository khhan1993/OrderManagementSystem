'use strict';

function async_final(err, res, next, data) {
    if(err) {
        let custom_err = new Error('Database query error!');
        custom_err.status = 500;
        next(custom_err);
    }
    else {
        res.jsonp({
            state: true,
            mesasge: "OK",
            data: data
        });
    }
}

function custom_error_handler(status_code, message, data, next) {
    let custom_err = new Error(message);
    custom_err.status = status_code;
    custom_err.data = data;
    next(custom_err);
}

exports.async_final = async_final;
exports.custom_error_handler = custom_error_handler;