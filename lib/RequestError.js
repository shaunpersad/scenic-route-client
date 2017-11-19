"use strict";

class RequestError extends Error {

    constructor(validationErrors, message = 'Unexpected inputs') {

        super(message);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);

        this.validationErrors = validationErrors;
    }
}

module.exports = RequestError;
