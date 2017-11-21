"use strict";

/**
 *
 * @param {string} baseUrl
 * @param {function} requestHandler
 * @param {string} [serviceName]
 * @returns {Router}
 */
function createRouter(baseUrl, requestHandler, serviceName = 'http service') {

    if (!baseUrl || !requestHandler) {
        throw new Error('Please supply both a baseUrl and a requestHandler to the createRouter function.');
    }

    const Router = class extends require('./Router') {};

    return new Router(baseUrl.replace(/^\/|\/$/g, ''), requestHandler, serviceName);
}

/**
 *
 * @type {createRouter}
 */
module.exports = createRouter;