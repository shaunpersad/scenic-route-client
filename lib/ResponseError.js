"use strict";

class ResponseError extends Error {

    constructor(validationErrors, message = 'Unexpected response format') {

        super(message);

        this.name = this.constructor.name;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.validationErrors = validationErrors;
    }
}

module.exports = ResponseError;

