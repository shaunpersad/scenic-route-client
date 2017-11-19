"use strict";
const expect = require('chai').expect;
const Router = require('../lib/Router');

const baseUrl = 'http://localhost/';
const requestHandler = () => {};

describe('Router', function() {

    describe('Router.reduceUrl(router:Router, routeOptions:Object)', function() {

        it('should create a url based on the baseUrl and prefixes of the router + the uri of the route', function() {

            const router = new Router(baseUrl, requestHandler);
            router.group('/', (router) => {

                router.group('/one', (router) => {

                    router.group('/two/', (router) => {

                        router.group('three', (router) => {

                            router.group('four/', (router) => {

                                router.group('/', (router) => {

                                    router.group('/', (router) => {

                                        router.group('/five', (router) => {

                                            const url = Router.reduceUrl(router, Router.createRouteOptions({uri: 'six'}));
                                            expect(url).to.equal('http://localhost/one/two/three/four/five/six');
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('Router.reduceEvents(router:Router, routeOptions:Object)', function() {

        it('should append new routeOptions events to the existing router events', function() {

            const router = new Router(baseUrl, requestHandler);
            let count = 0;
            const increment = () => {
                count++;
            };
            router.group({
                events: {
                    onRequestStart: increment
                }
            }, (router) => {

                router.group({
                    events: {
                        onRequestStart: increment
                    }
                }, (router) => {

                    const events = Router.reduceEvents(router, Router.createRouteOptions({
                        events: {
                            onRequestStart: increment
                        }
                    }));

                    router.executeEvent(events, 'onRequestStart');

                    expect(count).to.equal(3);
                });
            });
        });
    });

    describe('Router.reduceInputProperties(router:Router, routeOptions:Object)', function() {

        it('should append new routeOptions input properties to the existing router input properties, and create ajv validators for each', function() {

            const router = new Router(baseUrl, requestHandler);
            router.group({
                inputProperties: {
                    headers: {
                        properties: {
                            foo: {
                                type: 'string'
                            },
                            bar: {
                                type: 'string',
                                required: false
                            }
                        }
                    }
                }
            }, (router) => {

                router.group({
                    inputProperties: {
                        headers: {
                            properties: {
                                baz: {
                                    type: 'string'
                                }
                            }
                        },
                        body: {
                            properties: {
                                qux: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }, (router) => {

                    const validators = Router.reduceInputProperties(router, Router.createRouteOptions({
                        inputProperties: {
                            headers:{
                                grault: {
                                    type: 'string'
                                }
                            },
                            query: {
                                properties: {
                                    quux: {
                                        type: 'number'
                                    },
                                    corge: {
                                        type: 'boolean',
                                        required: false
                                    },
                                    uier: {
                                        type: 'string'
                                    }
                                },
                                required: ['uier']
                            }
                        }
                    }));

                    expect(validators.length).to.equal(3);

                    const tests = [
                        {
                            input: {
                                headers: {
                                    foo: 'hello',
                                    bar: 'hi',
                                    baz: 'aloha',
                                    grault: 'hola'
                                },
                                body: {
                                    qux: 'sup'
                                },
                                query: {
                                    quux: 1,
                                    corge: true,
                                    uier: 'howdy'
                                }
                            },
                            result: true
                        },
                        {
                            input: {
                                headers: {
                                    foo: 'hello',
                                    baz: 'aloha',
                                    grault: 'hola'
                                },
                                body: {
                                    qux: 'sup'
                                },
                                query: {
                                    quux: 1,
                                    uier: 'howdy'
                                }
                            },
                            result: true
                        },
                        {
                            input: {
                                headers: {
                                    foo: 1,
                                    baz: 'aloha',
                                    grault: 'hola'
                                },
                                body: {
                                    qux: 'sup'
                                },
                                query: {
                                    quux: 1,
                                    uier: 'howdy'
                                }
                            },
                            result: false
                        },
                        {
                            input: {
                                headers: {
                                    foo: 1,
                                    baz: 'aloha',
                                    grault: 'hola'
                                },
                                body: {
                                    qux: 'sup'
                                }
                            },
                            result: false
                        },
                        {
                            input: {
                                headers: {
                                },
                                body: {
                                },
                                query: {
                                }
                            },
                            result: false
                        }
                    ];

                    tests.forEach((test, index) => {

                        const invalid = validators.find(validate => {

                            return !validate(test.input);
                        });

                        expect(!invalid).to.equal(test.result);
                    });
                });
            });
        });

        it('should automatically create schemas for url params', function() {


            const router = new Router(baseUrl, requestHandler);
            router.group('/{foo}/{bar}', (router) => {

                router.group('{baz}', (router) => {

                    const validators = Router.reduceInputProperties(router, Router.createRouteOptions({
                        uri: '/{qux}'
                    }));

                    expect(validators.length).to.equal(1);

                    const tests = [
                        {
                            input: {
                                params: {
                                    foo: 'hello',
                                    bar: 'hi',
                                    baz: 'aloha',
                                    qux: 'hola'
                                }
                            },
                            result: true
                        },
                        {
                            input: {
                                params: {
                                    bar: 'hi',
                                    baz: 'aloha',
                                    qux: 'hola'
                                }
                            },
                            result: false
                        },
                        {
                            input: {
                                params: {
                                    foo: 'hello',
                                    bar: 'hi',
                                    baz: 'aloha'
                                }
                            },
                            result: false
                        }
                    ];

                    tests.forEach((test, index) => {

                        const invalid = validators.find(validate => {

                            return !validate(test.input);
                        });

                        expect(!invalid).to.equal(test.result);
                    });

                    router.group({
                        prefix: '/{quux?}',
                        inputProperties: {
                            headers: {
                                corge: {
                                    type: 'string'
                                }
                            }
                        }
                    }, (router) => {

                        const validators = Router.reduceInputProperties(router, Router.createRouteOptions({
                            uri: '/{qux}'
                        }));
                        expect(validators.length).to.equal(2);

                        const tests = [
                            {
                                input: {
                                    params: {
                                        foo: 'hello',
                                        bar: 'hi',
                                        baz: 'aloha',
                                        qux: 'hola',
                                        quux: 'howdy'
                                    },
                                    headers: {
                                        corge: 'sup'
                                    }
                                },
                                result: true
                            },
                            {
                                input: {
                                    params: {
                                        foo: 'hello',
                                        bar: 'hi',
                                        baz: 'aloha',
                                        qux: 'hola'
                                    },
                                    headers: {
                                        corge: 'sup'
                                    }
                                },
                                result: true
                            },
                            {
                                input: {
                                    params: {
                                        bar: 'hi',
                                        baz: 'aloha',
                                        qux: 'hola'
                                    },
                                    headers: {
                                        corge: 'sup'
                                    }
                                },
                                result: false
                            },
                            {
                                input: {
                                    params: {
                                        foo: 'hello',
                                        bar: 'hi',
                                        baz: 'aloha'
                                    },
                                    headers: {
                                        corge: 'sup'
                                    }
                                },
                                result: false
                            }
                        ];

                        tests.forEach((test, index) => {

                            const invalid = validators.find(validate => {

                                return !validate(test.input);
                            });

                            expect(!invalid).to.equal(test.result);
                        });

                    });
                });
            });
        });
    });

    describe('Router.reduceInputs(router:Router, routeOptions:Object)', function() {

        it('should reduce all route group inputs + routeOptions inputs to a single object', function() {

            const router = new Router(baseUrl, requestHandler);

            router.group({
                input: {
                    headers: {
                        foo: 'hello'
                    }
                }
            }, (router) => {

                router.group({
                    input: {
                        headers: {
                            bar: 'hi'
                        },
                        body: {
                            baz: 'hola'
                        }
                    }
                }, (router) => {

                    const input = Router.reduceInputs(router, Router.createRouteOptions({
                        input: {
                            body: {
                                baz: 'howdy',
                                qux: 'aloha'
                            },
                            query: {
                                quux: 'sup'
                            }
                        }
                    }));

                    expect(input).to.nested.include({
                        'headers.foo': 'hello',
                        'headers.bar': 'hi',
                        'body.baz': 'howdy',
                        'body.qux': 'aloha',
                        'query.quux': 'sup'

                    });
                });
            });
        });
    });

    describe('Router.reduceResponses(router:Router, routeOptions:Object)', function() {

        it('should reduce all route group responses + routeOptions responses to a single object', function() {

            const router = new Router(baseUrl, requestHandler);

            router.group({
                success: {
                    '200': {
                        type: 'object'
                    }
                }
            }, (router) => {

                router.group({
                    error: {
                        '404': {
                            type: 'string'
                        },
                        '500': {
                            type: 'string'
                        }
                    }
                }, (router) => {

                    let responses = Router.reduceResponses(router, Router.createRouteOptions({
                        success: {
                            '302': {
                                type: 'string'
                            }
                        }
                    }));

                    expect(responses).to.nested.include({
                        '200.schema.type': 'object',
                        '200.isSuccessResponse': true,
                        '302.schema.type': 'string',
                        '302.isSuccessResponse': true,
                        '404.schema.type': 'string',
                        '404.isSuccessResponse': false,
                        '500.schema.type': 'string',
                        '500.isSuccessResponse': false
                    });


                    responses = Router.reduceResponses(router, Router.createRouteOptions({
                        success: {
                            '200': {
                                type: 'string'
                            }
                        }
                    }));

                    expect(responses).to.nested.include({
                        '200.schema.type': 'string',
                        '200.isSuccessResponse': true,
                        '302.schema.type': 'string',
                        '302.isSuccessResponse': true,
                        '404.schema.type': 'string',
                        '404.isSuccessResponse': false,
                        '500.schema.type': 'string',
                        '500.isSuccessResponse': false
                    });
                });
            });

        });
    });

    describe('Router.reduceNamespaces(router:Router, routeOptions:Object)', function() {

        it('should append the routeOptions name to the existing router namespaces', function() {

            const router = new Router(baseUrl, requestHandler);

            router.group({ namespace: 'foo.' }, (router) => {

                router.group({ namespace: 'bar.' }, (router) => {

                    const path = Router.reduceNamespaces(router, Router.createRouteOptions({}, 'baz'));
                    expect(path).to.equal('foo.bar.baz');
                });

            });

        });
    });

    describe('Router.reduceAjvOptions(router:Router, routeOptions:Object)', function() {

        it('should reduce all route group ajv options + routeOptions ajv options to a single object', function() {

            const router = new Router(baseUrl, requestHandler);

            router.group({
                ajvOptions: {
                    foo: 'hello'
                }
            }, (router) => {

                router.group({
                    ajvOptions: {
                        bar: 'hi'
                    }
                }, (router) => {

                    let ajvOptions = Router.reduceAjvOptions(router, Router.createRouteOptions({
                        ajvOptions: {
                            baz: 'hola'
                        }
                    }));

                    expect(ajvOptions).to.include({
                        foo: 'hello',
                        bar: 'hi',
                        baz: 'hola'
                    });

                    ajvOptions = Router.reduceAjvOptions(router, Router.createRouteOptions({
                        ajvOptions: {
                            foo: 'howdy'
                        }
                    }));

                    expect(ajvOptions).to.include({
                        foo: 'howdy',
                        bar: 'hi',
                        baz: 'hola'
                    });
                });
            });
        });
    });
});

