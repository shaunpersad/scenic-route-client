"use strict";
const Ajv = require('ajv');
const join = require('./join');
const uriWithParams = require('./uriWithParams');
const paramsFromUri = require('./paramsFromUri');
const RequestError = require('./RequestError');
const ResponseError = require('./ResponseError');
const noOp = () => {};

const defaultOptions = {
    input: {},
    inputProperties: {},
    success: {},
    error: {},
    events: {
        onRequestStart: noOp,
        onRequestEnd: noOp,
        onInvalidRequest: noOp,
        onInvalidResponse: noOp,
        onError: noOp,
        onRoute: noOp
    },
    namespace: '',
    ajvOptions: {
        useDefaults: true
    }
};

const defaultRouteOptions = Object.assign({}, defaultOptions, {
    uri: '/',
    method: 'get'
});

const defaultGroupOptions = Object.assign({}, defaultOptions, {
    prefix: '/'
});


class Router {

    constructor(baseUrl, requestHandler, operations = {}) {
        this.baseUrl = baseUrl;
        this.requestHandler = requestHandler;
        this.operations = operations;
        this.inputProperties = [];
        this.inputs = [];
        this.responses = [];
        this.events = [];
        this.namespaces = [];
        this.prefixes = [];
        this.ajvOptions = [];
    }

    /**
     *
     * @param {string|object} options
     * @param {function(Router)} closure
     * @returns {Router}
     */
    group(options, closure) {

        if (typeof options === 'string' || options instanceof String) {
            options = {
                prefix: options
            };
        }

        const Router = this.constructor;
        const groupOptions = Router.createGroupOptions(options);
        const router = new Router(this.baseUrl, this.requestHandler, this.operations);

        router.inputProperties = this.inputProperties.concat(groupOptions.inputProperties);
        router.inputs = this.inputs.concat(groupOptions.input);
        router.responses = this.responses.concat(Router.convertSuccessAndErrorToResponse(groupOptions.success, groupOptions.error));
        router.events = this.events.concat(groupOptions.events);
        router.namespaces = this.namespaces.concat(groupOptions.namespace);
        router.prefixes = this.prefixes.concat(groupOptions.prefix);
        router.ajvOptions = this.ajvOptions.concat(groupOptions.ajvOptions);

        closure(router);

        return this;
    }

    /**
     *
     * @param {string|object} options
     * @param {string} name
     */
    route(options, name) {

        if (typeof options === 'string' || options instanceof String) {
            options = {
                uri: options
            };
        }
        if (!name) {
            throw new Error('Please supply a name for this route.');
        }

        const Router = this.constructor;
        const routeOptions = Router.createRouteOptions(options, name);
        const events = Router.reduceEvents(this, routeOptions);
        const { operations, requestHandler, executeEvent } = this;

        executeEvent(events, 'onRoute', [routeOptions, name]);

        const { method } = routeOptions;
        const url = Router.reduceUrl(this, routeOptions);
        const inputValidators = Router.reduceInputProperties(this, routeOptions);
        const inputs = Router.reduceInputs(this, routeOptions);
        const responses = Router.reduceResponses(this, routeOptions);
        const path = Router.reduceNamespaces(this, routeOptions);


        operations[path] = {
            url,
            /**
             *
             * @param {function} contextHandler
             * @returns {function(object, function)}
             */
            create(contextHandler) {

                /**
                 * @param {object} input
                 * @param {function} callback
                 */
                return (input, callback) => {

                    const finalInput = Object.assign({
                        headers: {},
                        query: {},
                        params: {},
                        body: {},
                        meta: {}
                    }, inputs, input);

                    const finalUrl = uriWithParams(url, finalInput.params);
                    const context = contextHandler({
                        url: finalUrl,
                        method,
                        input: finalInput
                    });

                    executeEvent(events, 'onRequestStart', [context]);

                    const invalid = inputValidators.find(validate => {

                        return !validate(context.input);
                    });

                    if (invalid) {

                        const requestError = new RequestError(invalid.errors);

                        executeEvent(events, 'onInvalidRequest', [requestError, context]);
                        executeEvent(events, 'onError', [requestError, context]);
                        executeEvent(events, 'onRequestEnd', [requestError, context]);

                        return callback(requestError);
                    }

                    requestHandler(context.url, context.method, context.input, (err, payload, status, headers) => {

                        Object.assign(context, {
                            payload,
                            status,
                            headers
                        });

                        if (!err) {

                            const response = responses[`${status}`];

                            if (response && !response.validate(payload)) {

                                const responseError = new ResponseError(response.validate.errors);

                                if (response.isSuccessResponse) {
                                    err = responseError;
                                }

                                executeEvent(events, 'onInvalidResponse', [responseError, context]);
                            }
                        }

                        if (err) {

                            executeEvent(events, 'onError', [err, context]);
                        }

                        executeEvent(events, 'onRequestEnd', [err, context]);

                        callback(err, payload, status, headers);
                    });
                };
            }
        };
    }

    /**
     *
     * @param {string} name
     * @param {object} [params]
     * @param {object} [options]
     * @returns {string}
     */
    url(name, params = {}, options = {}) {

        const operation = this.operations[name];
        if (!operation) {
            throw new Error(`No URL found for "${name}"`);
        }
        const { url } = operation;

        return uriWithParams(url, params, {}, options);
    }

    /**
     *
     * @param {string} name
     * @param {function|[function]} contextHandler
     * @returns {(function(object, function))}
     */
    operation(name, contextHandler = this.constructor.defaultContextHandler) {

        const operation = this.operations[name];
        if (!operation) {
            throw new Error(`No URL found for "${name}"`);
        }
        const handler = [].concat(contextHandler).reduce((contextHandler, currentContextHandler) => {

            if (contextHandler === currentContextHandler) {
                return contextHandler;
            }
            return (context) => {
                return currentContextHandler(contextHandler(context));
            };

        }, this.constructor.defaultContextHandler);


        return operation.create(handler);
    }

    /**
     *
     * @param {[function]} events
     * @param {string} eventName
     * @param {[]} [args]
     */
    executeEvent(events, eventName, args = []) {

        events.forEach(events => {
            if (events[eventName]) {
                events[eventName].apply(this, args);
            }
        });
    }
    /**
     *
     * @param {Router} router
     * @param {object} routeOptions
     * @returns {string}
     */
    static reduceUrl(router, routeOptions) {

        return join([router.baseUrl].concat(router.prefixes).concat(routeOptions.uri));
    }

    /**
     *
     * @param {Router} router
     * @param {object} routeOptions
     * @returns {[function]}
     */
    static reduceEvents(router, routeOptions) {

        return router.events.concat(routeOptions.events);
    }

    /**
     *
     * @param {Router} router
     * @param {object} routeOptions
     * @returns {[function]}
     */
    static reduceInputProperties(router, routeOptions) {

        const Router = this;
        const url = Router.reduceUrl(router, routeOptions);
        const uriParams = paramsFromUri(url);
        const uriParamsAll = uriParams.required.concat(uriParams.optional);
        const ajvOptions = Router.reduceAjvOptions(router, routeOptions);
        const ajv = new Ajv(ajvOptions);

        let inputProperties = router.inputProperties;

        if (uriParamsAll.length) {

            const paramsSchema = {
                params: {
                    properties: {}
                }
            };
            uriParamsAll.forEach(param => {

                paramsSchema.params.properties[param] = {
                    required: uriParams.required.includes(param)
                };
            });
            inputProperties = [paramsSchema].concat(inputProperties);
        }

        return inputProperties.concat(routeOptions.inputProperties).filter(inputProperties => {

            return !!Object.keys(inputProperties || {}).length;

        }).map(inputProperties => {

            const inputTypes = Object.keys(inputProperties || {});
            const schema = {
                type: 'object',
                properties: {},
                required: inputTypes
            };
            
            inputTypes.forEach(inputType => {

                const inputTypeSchema = Object.assign({
                    type: 'object',
                    properties: {},
                    required: []
                }, inputProperties[inputType]);

                const properties = Object.keys(inputTypeSchema.properties);
                const required = properties.concat(inputTypeSchema.required).filter(property => {
                    const required = inputTypeSchema.properties[property].required;
                    if (required === undefined) {
                        return true;
                    }
                    const isRequired = !!required;
                    delete inputTypeSchema.properties[property].required;
                    return isRequired;
                });
                inputTypeSchema.required = Array.from(new Set(required));

                schema.properties[inputType] = inputTypeSchema;
            });

            return ajv.compile(schema);
        });
    }

    /**
     *
     * @param {Router} router
     * @param {object} routeOptions
     * @returns {object}
     */
    static reduceInputs(router, routeOptions) {

        return router.inputs.concat(routeOptions.input).reduce((totalInput, currentInput) => {

            Object.keys(currentInput).forEach(field => {

                if (!totalInput[field]) {
                    totalInput[field] = {};
                }

                Object.assign(totalInput[field], currentInput[field]);
            });

            return totalInput;
        }, {});
    }

    /**
     *
     * @param {Router} router
     * @param {object} routeOptions
     * @returns {object}
     */
    static reduceResponses(router, routeOptions) {

        const responses = Object.assign.apply(null, router.responses.concat(Router.convertSuccessAndErrorToResponse(routeOptions.success, routeOptions.error)));

        Object.keys(responses).forEach(status => {

            const response = responses[status];
            const ajv = new Ajv(response.ajvOptions);

            response.validate = ajv.compile(response.schema);
        });

        return responses;
    }

    /**
     *
     * @param {Router} router
     * @param {object} routeOptions
     * @returns {string}
     */
    static reduceNamespaces(router, routeOptions) {

        return router.namespaces.filter(namespace => !!namespace).concat(routeOptions.name).join('');
    }

    /**
     *
     * @param {Router} router
     * @param {object} routeOptions
     * @returns {object}
     */
    static reduceAjvOptions(router, routeOptions) {

        return Object.assign.apply(null, router.ajvOptions.concat(routeOptions.ajvOptions));
    }
    
    /**
     *
     * @param {object} options
     * @param {string} name
     * @returns {object}
     */
    static createRouteOptions(options = {}, name = '') {

        const routeOptions = Object.assign({ name }, defaultRouteOptions, options);
        routeOptions.method = routeOptions.method.toLowerCase();

        return routeOptions;
    }

    /**
     *
     * @param {object} options
     * @returns {object}
     */
    static createGroupOptions(options = {}) {

        return Object.assign({}, defaultGroupOptions, options);
    }

    /**
     *
     * @param {function} context
     * @returns {*}
     */
    static defaultContextHandler(context) {

        return context;
    }

    static convertSuccessAndErrorToResponse(success, error) {

        const responses = {};
        Object.keys(success).forEach(status => {

            responses[status] = {
                schema: success[status],
                isSuccessResponse: true
            }
        });
        Object.keys(error).forEach(status => {

            responses[status] = {
                schema: error[status],
                isSuccessResponse: false
            }
        });

        return responses;
    }
}

module.exports = Router;
