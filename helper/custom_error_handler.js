var custom_error_handler = function(message, status_code, next) {
    var custom_err = new Error(message);
    custom_err.status = status_code;
    next(custom_err);
};

module.exports = custom_error_handler;