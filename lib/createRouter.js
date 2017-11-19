"use strict";
const Router = require('./Router');

function createRouter(baseUrl, requestHandler) {

    if (!baseUrl || !requestHandler) {
        throw new Error('Please supply both a baseUrl and a requestHandler to the createRouter function.');
    }

    return new Router(baseUrl.replace(/^\/|\/$/g, ''), requestHandler);
}