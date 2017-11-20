"use strict";
const expect = require('chai').expect;
const Router = require('../lib/Router');
const RequestError = require('../lib/RequestError');
const ResponseError = require('../lib/ResponseError');
const createRouter = require('../lib/createRouter');
const baseUrl = 'http://localhost/';
const requestHandler = () => {};


describe('createRouter(baseUrl:String, requestHandler:Function(url:String, method:String, input:Object))', function() {

    it('should create a createRouter instance', function() {

        const router = createRouter(baseUrl, requestHandler);
        expect(router).to.be.an.instanceOf(Router);
        expect(router.baseUrl).to.equal('http://localhost');
    });

    describe('router', function() {

        describe('router.group(options:Object, closure:Function)', function() {

            it('should create a new instance of Router with the same baseUrl, requestHandler, and operations object, and return it in the closure', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group({}, (newRouter) => {

                    expect(newRouter).to.not.equal(router);
                    expect(newRouter).to.include({
                        baseUrl: router.baseUrl,
                        requestHandler: router.requestHandler,
                        operations: router.operations
                    })
                });
            });

            it('should concat inputProperties', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group({
                    inputProperties: {
                        headers: {
                            foo: {
                                type: 'string'
                            }
                        }
                    }
                }, (router) => {

                    router.group({
                        inputProperties: {
                            headers: {
                                bar: {
                                    type: 'string'
                                }
                            }
                        }
                    }, (router) => {

                        expect(router.inputProperties.length).to.equal(2);
                        expect(router.inputProperties[0]).to.nested.include({
                            'headers.foo.type': 'string',
                        });
                        expect(router.inputProperties[1]).to.nested.include({
                            'headers.bar.type': 'string',
                        });
                    });
                });

            });

            it('should concat inputs', function() {

                const router = createRouter(baseUrl, requestHandler);
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
                            }
                        }
                    }, (router) => {

                        expect(router.inputs.length).to.equal(2);
                        expect(router.inputs[0]).to.nested.include({
                            'headers.foo': 'hello',
                        });
                        expect(router.inputs[1]).to.nested.include({
                            'headers.bar': 'hi',
                        });
                    });
                });

            });

            it('should concat responses', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group({
                    success: {
                        '200': {
                            type: 'object'
                        }
                    }
                }, (router) => {

                    router.group({
                        success: {
                            '200': {
                                type: 'string'
                            }
                        },
                        error: {
                            '404': {
                                type: 'object'
                            }
                        }
                    }, (router) => {

                        expect(router.responses.length).to.equal(2);
                        expect(router.responses[0]).to.nested.include({
                            '200.schema.type': 'object',
                        });
                        expect(router.responses[1]).to.nested.include({
                            '200.schema.type': 'string',
                            '404.schema.type': 'object',
                        });
                    });
                });
            });

            it('should concat events', function() {

                const router = createRouter(baseUrl, requestHandler);
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

                        const events = router.events;

                        expect(router.events.length).to.equal(2);
                        router.events.forEach(events => {

                            events.onRequestStart();
                        });
                        expect(count).to.equal(2);
                    });
                });
            });

            it('should concat namespaces', function() {

                const router = createRouter(baseUrl, requestHandler);

                router.group({ namespace: 'foo.' }, (router) => {

                    router.group({ namespace: 'bar' }, (router) => {

                        const path = router.namespaces.join('');
                        expect(path).to.equal('foo.bar');
                    });
                });
                
            });

            it('should concat prefixes', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group('/', (router) => {

                    router.group('/one', (router) => {

                        router.group('/two/', (router) => {

                            router.group('three', (router) => {

                                router.group('four/', (router) => {

                                    router.group('/', (router) => {

                                        router.group('/', (router) => {

                                            router.group('/five', (router) => {

                                                const url = router.prefixes.join('');
                                                expect(url).to.equal('//one/two/threefour////five');
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
                
            });

            it('should concat ajvOptions', function() {

                const router = createRouter(baseUrl, requestHandler);

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

                        expect(router.ajvOptions.length).to.equal(2);
                        expect(router.ajvOptions[0]).to.include({
                            foo: 'hello'
                        });
                        expect(router.ajvOptions[1]).to.include({
                            bar: 'hi'
                        });
                    });
                });
                
            });
        });

        describe('router.group(options:String, closure:Function)', function() {

            it('should act as a shortcut for providing {prefix: String} as the options object', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group('/foo', (router) => {

                    expect(router.prefixes.length).to.equal(1);
                    expect(router.prefixes[0]).to.equal('/foo');

                });
            });
        });

        describe('router.route(options:Object, name:String)', function() {

            it('should assign an operation to the shared operations object', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group('/foo', (router) => {

                    router.route('/bar', 'fooBar');
                    expect(router.operations['fooBar']).to.exist;
                });
                expect(router.operations['fooBar']).to.exist;
            });
        });

        describe('router.get(options:Object, name:String)', function() {

            it('should assign a GET operation to the shared operations object', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group('/foo', (router) => {

                    router.get('/bar', 'fooBar');
                    expect(router.operations['fooBar']).to.exist;
                });
                expect(router.operations['fooBar'].routeDefinition.routeOptions.method).to.equal('get');
            });
        });

        describe('router.post(options:Object, name:String)', function() {

            it('should assign a POST operation to the shared operations object', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group('/foo', (router) => {

                    router.post('/bar', 'fooBar');
                    expect(router.operations['fooBar']).to.exist;
                });
                expect(router.operations['fooBar'].routeDefinition.routeOptions.method).to.equal('post');
            });
        });

        describe('router.put(options:Object, name:String)', function() {

            it('should assign a PUT operation to the shared operations object', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group('/foo', (router) => {

                    router.put('/bar', 'fooBar');
                    expect(router.operations['fooBar']).to.exist;
                });
                expect(router.operations['fooBar'].routeDefinition.routeOptions.method).to.equal('put');
            });
        });

        describe('router.delete(options:Object, name:String)', function() {

            it('should assign a DELETE operation to the shared operations object', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.group('/foo', (router) => {

                    router.delete('/bar', 'fooBar');
                    expect(router.operations['fooBar']).to.exist;
                });
                expect(router.operations['fooBar'].routeDefinition.routeOptions.method).to.equal('delete');
            });
        });

        describe('router.route(options:String, name:String)', function() {

            it('should act as a shortcut for providing {uri: String} as the options object', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.route('/foo', 'foo');
                expect(router.operations['foo'].routeDefinition.url).to.equal('http://localhost/foo');
            });
        });

        describe('operation = router.operation(name:String)', function() {

            it('should retrieve an operation that was previously defined by router.route', function() {

                const router = createRouter(baseUrl, requestHandler);
                router.route('/foo', 'foo');
                const operation = router.operation('foo');
                expect(operation).to.exist;
            });

            describe('operation(input:Object, callback)', function() {

                it('should execute the operation by passing the proper url, method, and input to the requestHandler', function() {

                    const callbacks = {
                        onRequestStart: (context) => {

                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                        },
                        onRequestEnd: (err, context) => {

                            expect(context.url).to.equal('http://localhost/foo/1/boop');
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'params.baz': 'boop',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(err).to.be.null;
                            expect(context.payload).to.include({
                                message: 'successful'
                            });
                            expect(context.status).to.equal(200);
                            expect(Object.keys(context.headers).length).to.equal(0);
                        },
                        onRouteDefinition: (routeDefinition) => {

                            expect(routeDefinition).to.nested.include({
                                path: 'foo/{bar}/{baz?}',
                                namespace: 'foo.bar.',
                                url: 'http://localhost/foo/{bar}/{baz?}',
                                'input.headers.foo': 'hello',
                                'input.query.baz': 'hi',
                                'input.body.qux': 'howdy',
                                'routeOptions.method': 'post',
                                name: 'foo.bar.baz'
                            });
                        }
                    };

                    let count = 0;
                    const router = createRouter(baseUrl, (url, method, input, callback) => {

                        count++;
                        expect(url).to.equal('http://localhost/foo/1/boop');
                        expect(method).to.equal('post');
                        expect(input).to.nested.include({
                            'headers.foo': 'hello',
                            'headers.auth': 'bearer',
                            'query.baz': 'hi',
                            'query.mos': 'def',
                            'params.bar': 1,
                            'params.baz': 'boop',
                            'body.qux': 'howdy',
                            'body.quux': 'hola'
                        });

                        callback(null, {
                            message: 'successful'
                        }, 200, {});
                    });

                    router.group({
                        prefix: '/foo',
                        input: {
                            headers: {
                                foo: 'hello'
                            }
                        },
                        inputProperties: {
                            headers: {
                                properties: {
                                    foo: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        success: {
                            '200': {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        error: {
                            '404': {
                                type: 'string'
                            }
                        },
                        events: {
                            onRequestStart: (context) => {
                                callbacks.onRequestStart(context);
                                count++;

                            },
                            onRequestEnd: (err, context) => {
                                callbacks.onRequestEnd(err, context);
                                count++;
                            },
                            onRouteDefinition: (routeDefinition) => {
                                callbacks.onRouteDefinition(routeDefinition);
                                count++;
                            }
                        },
                        namespace: 'foo.',
                        ajvOptions: {
                            useDefaults: true
                        }
                    }, (router) => {

                        router.group({
                            prefix: '{bar}',
                            input: {
                                query: {
                                    baz: 'hi'
                                }
                            },
                            inputProperties: {
                                query: {
                                    properties: {
                                        baz: {
                                            type: 'string'
                                        }
                                    }
                                },
                                params: {
                                    properties: {
                                        bar: {
                                            type: 'number'
                                        }
                                    }
                                },
                            },
                            events: {
                                onRequestStart: (context) => {
                                    count++;

                                },
                                onRequestEnd: (err, context) => {
                                    count++;
                                },
                                onRouteDefinition: (routeDefinition) => {
                                    count++;
                                }
                            },
                            namespace: 'bar.'
                        }, (router) => {

                            router.route({
                                uri: '{baz?}',
                                method: 'POST',
                                input: {
                                    body: {
                                        qux: 'howdy'
                                    }
                                },
                                inputProperties: {
                                    body: {
                                        properties: {
                                            qux: {
                                                type: 'string'
                                            }
                                        }
                                    },
                                    params: {
                                        properties: {
                                            baz: {
                                                type: 'string',
                                                required: false,
                                                default: 'boop'
                                            }
                                        }
                                    },
                                },
                                events: {
                                    onRequestStart: (context) => {
                                        count++;

                                    },
                                    onRequestEnd: (err, context) => {
                                        count++;
                                    },
                                    onRouteDefinition: (routeDefinition) => {
                                        count++;
                                    }
                                },
                            }, 'baz');
                        });
                    });

                    const operation = router.operation('foo.bar.baz');

                    operation({
                        headers: {
                            auth: 'bearer'
                        },
                        query: {
                            mos: 'def'
                        },
                        params: {
                            bar: 1
                        },
                        body: {
                            quux: 'hola'
                        }
                    }, (err, payload, status, headers) => {

                        count++;
                        expect(err).to.be.null;
                        expect(payload).to.include({
                            message: 'successful'
                        });
                        expect(status).to.equal(200);
                        expect(Object.keys(headers).length).to.equal(0);
                    });
                    expect(count).to.equal(11);
                });

                it('should call the relevant events for a successful call', function() {

                    const callbacks = {
                        onRequestStart: (context) => {

                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                        },
                        onRequestEnd: (err, context) => {

                            expect(context.url).to.equal('http://localhost/foo/1');
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(err).to.be.null;
                            expect(context.payload).to.include({
                                message: 'successful'
                            });
                            expect(context.status).to.equal(200);
                            expect(Object.keys(context.headers).length).to.equal(0);
                        },
                        onRouteDefinition: (routeDefinition) => {

                            expect(routeDefinition).to.nested.include({
                                path: 'foo/{bar}/{baz?}',
                                namespace: 'foo.bar.',
                                url: 'http://localhost/foo/{bar}/{baz?}',
                                'input.headers.foo': 'hello',
                                'input.query.baz': 'hi',
                                'input.body.qux': 'howdy',
                                'routeOptions.method': 'post',
                                name: 'foo.bar.baz'
                            });
                        }
                    };

                    let count = 0;
                    const router = createRouter(baseUrl, (url, method, input, callback) => {

                        count++;
                        expect(url).to.equal('http://localhost/foo/1');
                        expect(method).to.equal('post');
                        expect(input).to.nested.include({
                            'headers.foo': 'hello',
                            'headers.auth': 'bearer',
                            'query.baz': 'hi',
                            'query.mos': 'def',
                            'params.bar': 1,
                            'body.qux': 'howdy',
                            'body.quux': 'hola'
                        });

                        callback(null, {
                            message: 'successful'
                        }, 200, {});
                    });

                    router.group({
                        prefix: '/foo',
                        input: {
                            headers: {
                                foo: 'hello'
                            }
                        },
                        events: {
                            onRequestStart: (context) => {
                                callbacks.onRequestStart(context);
                                count++;

                            },
                            onRequestEnd: (err, context) => {
                                callbacks.onRequestEnd(err, context);
                                count++;
                            },
                            onRouteDefinition: (routeDefinition) => {
                                callbacks.onRouteDefinition(routeDefinition);
                                count++;
                            }
                        },
                        namespace: 'foo.',
                        ajvOptions: {
                            useDefaults: true
                        }
                    }, (router) => {

                        router.group({
                            prefix: '{bar}',
                            input: {
                                query: {
                                    baz: 'hi'
                                }
                            },
                            events: {
                                onRequestStart: (context) => {
                                    count++;

                                },
                                onRequestEnd: (err, context) => {
                                    count++;
                                },
                                onRouteDefinition: (routeDefinition) => {
                                    count++;
                                }
                            },
                            namespace: 'bar.'
                        }, (router) => {

                            router.route({
                                uri: '{baz?}',
                                method: 'POST',
                                input: {
                                    body: {
                                        qux: 'howdy'
                                    }
                                },
                                events: {
                                    onRequestStart: (context) => {
                                        count++;

                                    },
                                    onRequestEnd: (err, context) => {
                                        count++;
                                    },
                                    onRouteDefinition: (routeDefinition) => {
                                        count++;
                                    }
                                },
                            }, 'baz');
                        });
                    });

                    const operation = router.operation('foo.bar.baz');

                    operation({
                        headers: {
                            auth: 'bearer'
                        },
                        query: {
                            mos: 'def'
                        },
                        params: {
                            bar: 1
                        },
                        body: {
                            quux: 'hola'
                        }
                    }, (err, payload, status, headers) => {

                        count++;
                        expect(err).to.be.null;
                        expect(payload).to.include({
                            message: 'successful'
                        });
                        expect(status).to.equal(200);
                        expect(Object.keys(headers).length).to.equal(0);
                    });
                    expect(count).to.equal(11);

                });

                it('should call the relevant events for a successful call with defined success schemas that pass', function() {

                    const callbacks = {
                        onRequestStart: (context) => {

                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                        },
                        onRequestEnd: (err, context) => {

                            expect(context.url).to.equal('http://localhost/foo/1/boop');
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'params.baz': 'boop',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(err).to.be.null;
                            expect(context.payload).to.include({
                                message: 'successful'
                            });
                            expect(context.status).to.equal(200);
                            expect(Object.keys(context.headers).length).to.equal(0);
                        },
                        onRouteDefinition: (routeDefinition) => {

                            expect(routeDefinition).to.nested.include({
                                path: 'foo/{bar}/{baz?}',
                                namespace: 'foo.bar.',
                                url: 'http://localhost/foo/{bar}/{baz?}',
                                'input.headers.foo': 'hello',
                                'input.query.baz': 'hi',
                                'input.body.qux': 'howdy',
                                'routeOptions.method': 'post',
                                name: 'foo.bar.baz'
                            });
                        }
                    };

                    let count = 0;
                    const router = createRouter(baseUrl, (url, method, input, callback) => {

                        count++;
                        expect(url).to.equal('http://localhost/foo/1/boop');
                        expect(method).to.equal('post');
                        expect(input).to.nested.include({
                            'headers.foo': 'hello',
                            'headers.auth': 'bearer',
                            'query.baz': 'hi',
                            'query.mos': 'def',
                            'params.bar': 1,
                            'params.baz': 'boop',
                            'body.qux': 'howdy',
                            'body.quux': 'hola'
                        });

                        callback(null, {
                            message: 'successful'
                        }, 200, {});
                    });

                    router.group({
                        prefix: '/foo',
                        input: {
                            headers: {
                                foo: 'hello'
                            }
                        },
                        inputProperties: {
                            headers: {
                                properties: {
                                    foo: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        success: {
                            '200': {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        error: {
                            '404': {
                                type: 'string'
                            }
                        },
                        events: {
                            onRequestStart: (context) => {
                                callbacks.onRequestStart(context);
                                count++;

                            },
                            onRequestEnd: (err, context) => {
                                callbacks.onRequestEnd(err, context);
                                count++;
                            },
                            onRouteDefinition: (routeDefinition) => {
                                callbacks.onRouteDefinition(routeDefinition);
                                count++;
                            }
                        },
                        namespace: 'foo.',
                        ajvOptions: {
                            useDefaults: true
                        }
                    }, (router) => {

                        router.group({
                            prefix: '{bar}',
                            input: {
                                query: {
                                    baz: 'hi'
                                }
                            },
                            inputProperties: {
                                query: {
                                    properties: {
                                        baz: {
                                            type: 'string'
                                        }
                                    }
                                },
                                params: {
                                    properties: {
                                        bar: {
                                            type: 'number'
                                        }
                                    }
                                },
                            },
                            events: {
                                onRequestStart: (context) => {
                                    count++;

                                },
                                onRequestEnd: (err, context) => {
                                    count++;
                                },
                                onRouteDefinition: (routeDefinition) => {
                                    count++;
                                }
                            },
                            namespace: 'bar.'
                        }, (router) => {

                            router.route({
                                uri: '{baz?}',
                                method: 'POST',
                                input: {
                                    body: {
                                        qux: 'howdy'
                                    }
                                },
                                inputProperties: {
                                    body: {
                                        properties: {
                                            qux: {
                                                type: 'string'
                                            }
                                        }
                                    },
                                    params: {
                                        properties: {
                                            baz: {
                                                type: 'string',
                                                required: false,
                                                default: 'boop'
                                            }
                                        }
                                    },
                                },
                                events: {
                                    onRequestStart: (context) => {
                                        count++;

                                    },
                                    onRequestEnd: (err, context) => {
                                        count++;
                                    },
                                    onRouteDefinition: (routeDefinition) => {
                                        count++;
                                    }
                                },
                            }, 'baz');
                        });
                    });

                    const operation = router.operation('foo.bar.baz');

                    operation({
                        headers: {
                            auth: 'bearer'
                        },
                        query: {
                            mos: 'def'
                        },
                        params: {
                            bar: 1
                        },
                        body: {
                            quux: 'hola'
                        }
                    }, (err, payload, status, headers) => {

                        count++;
                        expect(err).to.be.null;
                        expect(payload).to.include({
                            message: 'successful'
                        });
                        expect(status).to.equal(200);
                        expect(Object.keys(headers).length).to.equal(0);
                    });
                    expect(count).to.equal(11);
                });

                it('should call the relevant events for a successful call with defined success schemas that do not pass', function() {

                    const callbacks = {
                        onRequestStart: (context) => {

                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                        },
                        onRequestEnd: (err, context) => {

                            expect(context.url).to.equal('http://localhost/foo/1/boop');
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'params.baz': 'boop',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(err).to.be.instanceOf(ResponseError);
                            expect(context.payload).to.equal('successful');
                            expect(context.status).to.equal(200);
                            expect(Object.keys(context.headers).length).to.equal(0);
                        },
                        onRouteDefinition: (routeDefinition) => {

                            expect(routeDefinition).to.nested.include({
                                path: 'foo/{bar}/{baz?}',
                                namespace: 'foo.bar.',
                                url: 'http://localhost/foo/{bar}/{baz?}',
                                'input.headers.foo': 'hello',
                                'input.query.baz': 'hi',
                                'input.body.qux': 'howdy',
                                'routeOptions.method': 'post',
                                name: 'foo.bar.baz'
                            });
                        },
                        onError: (err) => {
                            expect(err).to.be.instanceOf(ResponseError);
                        },
                        onResponseError: (err, context) => {
                            expect(err).to.be.instanceOf(ResponseError);
                            expect(context.url).to.equal('http://localhost/foo/1/boop');
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'params.baz': 'boop',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(err).to.be.instanceOf(ResponseError);
                            expect(context.payload).to.equal('successful');
                            expect(context.status).to.equal(200);
                            expect(Object.keys(context.headers).length).to.equal(0);
                        }
                    };

                    let count = 0;
                    const router = createRouter(baseUrl, (url, method, input, callback) => {

                        count++;
                        expect(url).to.equal('http://localhost/foo/1/boop');
                        expect(method).to.equal('post');
                        expect(input).to.nested.include({
                            'headers.foo': 'hello',
                            'headers.auth': 'bearer',
                            'query.baz': 'hi',
                            'query.mos': 'def',
                            'params.bar': 1,
                            'params.baz': 'boop',
                            'body.qux': 'howdy',
                            'body.quux': 'hola'
                        });

                        callback(null, 'successful', 200, {});
                    });

                    router.group({
                        prefix: '/foo',
                        input: {
                            headers: {
                                foo: 'hello'
                            }
                        },
                        inputProperties: {
                            headers: {
                                properties: {
                                    foo: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        success: {
                            '200': {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        error: {
                            '404': {
                                type: 'string'
                            }
                        },
                        events: {
                            onRequestStart: (context) => {
                                callbacks.onRequestStart(context);
                                count++;

                            },
                            onRequestEnd: (err, context) => {
                                callbacks.onRequestEnd(err, context);
                                count++;
                            },
                            onRouteDefinition: (routeDefinition) => {
                                callbacks.onRouteDefinition(routeDefinition);
                                count++;
                            },
                            onError: (err) => {
                                callbacks.onError(err);
                                count++;
                            },
                            onResponseError: (err, context) => {
                                callbacks.onResponseError(err, context);
                                count++;
                            }
                        },
                        namespace: 'foo.',
                        ajvOptions: {
                            useDefaults: true
                        }
                    }, (router) => {

                        router.group({
                            prefix: '{bar}',
                            input: {
                                query: {
                                    baz: 'hi'
                                }
                            },
                            inputProperties: {
                                query: {
                                    properties: {
                                        baz: {
                                            type: 'string'
                                        }
                                    }
                                },
                                params: {
                                    properties: {
                                        bar: {
                                            type: 'number'
                                        }
                                    }
                                },
                            },
                            events: {
                                onRequestStart: (context) => {
                                    count++;

                                },
                                onRequestEnd: (err, context) => {
                                    count++;
                                },
                                onRouteDefinition: (routeDefinition) => {
                                    count++;
                                },
                                onError: (err) => {
                                    count++;
                                },
                                onResponseError: (err, context) => {
                                    count++;
                                }
                            },
                            namespace: 'bar.'
                        }, (router) => {

                            router.route({
                                uri: '{baz?}',
                                method: 'POST',
                                input: {
                                    body: {
                                        qux: 'howdy'
                                    }
                                },
                                inputProperties: {
                                    body: {
                                        properties: {
                                            qux: {
                                                type: 'string'
                                            }
                                        }
                                    },
                                    params: {
                                        properties: {
                                            baz: {
                                                type: 'string',
                                                required: false,
                                                default: 'boop'
                                            }
                                        }
                                    },
                                },
                                events: {
                                    onRequestStart: (context) => {
                                        count++;

                                    },
                                    onRequestEnd: (err, context) => {
                                        count++;
                                    },
                                    onRouteDefinition: (routeDefinition) => {
                                        count++;
                                    },
                                    onError: (err) => {
                                        count++;
                                    },
                                    onResponseError: (err, context) => {
                                        count++;
                                    }
                                },
                            }, 'baz');
                        });
                    });

                    const operation = router.operation('foo.bar.baz');

                    operation({
                        headers: {
                            auth: 'bearer'
                        },
                        query: {
                            mos: 'def'
                        },
                        params: {
                            bar: 1
                        },
                        body: {
                            quux: 'hola'
                        }
                    }, (err, payload, status, headers) => {

                        count++;
                        expect(err).to.be.instanceOf(ResponseError);
                        expect(payload).to.equal('successful');
                        expect(status).to.equal(200);
                        expect(Object.keys(headers).length).to.equal(0);
                    });
                    expect(count).to.equal(17);

                });

                it('should call the relevant events for an error call', function() {


                    const callbacks = {
                        onRequestStart: (context) => {

                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                        },
                        onRequestEnd: (err, context) => {

                            expect(context.url).to.equal('http://localhost/foo/1');
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(err).to.be.instanceOf(Error);
                            expect(context.payload).to.equal('unsuccessful');
                            expect(context.status).to.equal(500);
                            expect(Object.keys(context.headers).length).to.equal(0);
                        },
                        onRouteDefinition: (routeDefinition) => {

                            expect(routeDefinition).to.nested.include({
                                path: 'foo/{bar}/{baz?}',
                                namespace: 'foo.bar.',
                                url: 'http://localhost/foo/{bar}/{baz?}',
                                'input.headers.foo': 'hello',
                                'input.query.baz': 'hi',
                                'input.body.qux': 'howdy',
                                'routeOptions.method': 'post',
                                name: 'foo.bar.baz'
                            });
                        },
                        onError: (err) => {
                            expect(err).to.be.instanceOf(Error);
                        }
                    };

                    let count = 0;
                    const router = createRouter(baseUrl, (url, method, input, callback) => {

                        count++;
                        expect(url).to.equal('http://localhost/foo/1');
                        expect(method).to.equal('post');
                        expect(input).to.nested.include({
                            'headers.foo': 'hello',
                            'headers.auth': 'bearer',
                            'query.baz': 'hi',
                            'query.mos': 'def',
                            'params.bar': 1,
                            'body.qux': 'howdy',
                            'body.quux': 'hola'
                        });

                        callback(new Error('unsuccessful'), 'unsuccessful', 500, {});
                    });

                    router.group({
                        prefix: '/foo',
                        input: {
                            headers: {
                                foo: 'hello'
                            }
                        },
                        events: {
                            onRequestStart: (context) => {
                                callbacks.onRequestStart(context);
                                count++;

                            },
                            onRequestEnd: (err, context) => {
                                callbacks.onRequestEnd(err, context);
                                count++;
                            },
                            onRouteDefinition: (routeDefinition) => {
                                callbacks.onRouteDefinition(routeDefinition);
                                count++;
                            },
                            onError: (err) => {
                                callbacks.onError(err);
                                count++;
                            },
                            onResponseError: (err) => {
                                count++;
                            }
                        },
                        namespace: 'foo.',
                        ajvOptions: {
                            useDefaults: true
                        }
                    }, (router) => {

                        router.group({
                            prefix: '{bar}',
                            input: {
                                query: {
                                    baz: 'hi'
                                }
                            },
                            events: {
                                onRequestStart: (context) => {
                                    count++;

                                },
                                onRequestEnd: (err, context) => {
                                    count++;
                                },
                                onRouteDefinition: (routeDefinition) => {
                                    count++;
                                },
                                onError: (err) => {
                                    count++;
                                },
                                onResponseError: (err) => {
                                    count++;
                                }
                            },
                            namespace: 'bar.'
                        }, (router) => {

                            router.route({
                                uri: '{baz?}',
                                method: 'POST',
                                input: {
                                    body: {
                                        qux: 'howdy'
                                    }
                                },
                                events: {
                                    onRequestStart: (context) => {
                                        count++;

                                    },
                                    onRequestEnd: (err, context) => {
                                        count++;
                                    },
                                    onRouteDefinition: (routeDefinition) => {
                                        count++;
                                    },
                                    onError: (err) => {
                                        count++;
                                    },
                                    onResponseError: (err) => {
                                        count++;
                                    }
                                },
                            }, 'baz');
                        });
                    });

                    const operation = router.operation('foo.bar.baz');

                    operation({
                        headers: {
                            auth: 'bearer'
                        },
                        query: {
                            mos: 'def'
                        },
                        params: {
                            bar: 1
                        },
                        body: {
                            quux: 'hola'
                        }
                    }, (err, payload, status, headers) => {

                        count++;
                        expect(err).to.be.instanceOf(Error);
                        expect(payload).to.equal('unsuccessful');
                        expect(status).to.equal(500);
                        expect(Object.keys(headers).length).to.equal(0);
                    });
                    expect(count).to.equal(14);
                });

                it('should call the relevant events for an error call with defined error schemas that pass', function() {

                    const callbacks = {
                        onRequestStart: (context) => {

                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                        },
                        onRequestEnd: (err, context) => {

                            expect(context.url).to.equal('http://localhost/foo/1/boop');
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'params.baz': 'boop',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(err).to.be.instanceOf(Error);
                            expect(context.payload).to.include({
                                message: 'unsuccessful'
                            });
                            expect(context.status).to.equal(500);
                            expect(Object.keys(context.headers).length).to.equal(0);
                        },
                        onRouteDefinition: (routeDefinition) => {

                            expect(routeDefinition).to.nested.include({
                                path: 'foo/{bar}/{baz?}',
                                namespace: 'foo.bar.',
                                url: 'http://localhost/foo/{bar}/{baz?}',
                                'input.headers.foo': 'hello',
                                'input.query.baz': 'hi',
                                'input.body.qux': 'howdy',
                                'routeOptions.method': 'post',
                                name: 'foo.bar.baz'
                            });
                        },
                        onError: (err) => {
                            expect(err).to.be.instanceOf(Error);
                        }
                    };

                    let count = 0;
                    const router = createRouter(baseUrl, (url, method, input, callback) => {

                        count++;
                        expect(url).to.equal('http://localhost/foo/1/boop');
                        expect(method).to.equal('post');
                        expect(input).to.nested.include({
                            'headers.foo': 'hello',
                            'headers.auth': 'bearer',
                            'query.baz': 'hi',
                            'query.mos': 'def',
                            'params.bar': 1,
                            'params.baz': 'boop',
                            'body.qux': 'howdy',
                            'body.quux': 'hola'
                        });

                        callback(new Error('unsuccessful'), {
                            message: 'unsuccessful'
                        }, 500, {});
                    });

                    router.group({
                        prefix: '/foo',
                        input: {
                            headers: {
                                foo: 'hello'
                            }
                        },
                        inputProperties: {
                            headers: {
                                properties: {
                                    foo: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        success: {
                            '200': {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        error: {
                            '500': {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        events: {
                            onRequestStart: (context) => {
                                callbacks.onRequestStart(context);
                                count++;

                            },
                            onRequestEnd: (err, context) => {
                                callbacks.onRequestEnd(err, context);
                                count++;
                            },
                            onRouteDefinition: (routeDefinition) => {
                                callbacks.onRouteDefinition(routeDefinition);
                                count++;
                            },
                            onError: (err) => {
                                callbacks.onError(err);
                                count++;
                            },
                            onResponseError: (err) => {
                                count++;
                            }
                        },
                        namespace: 'foo.',
                        ajvOptions: {
                            useDefaults: true
                        }
                    }, (router) => {

                        router.group({
                            prefix: '{bar}',
                            input: {
                                query: {
                                    baz: 'hi'
                                }
                            },
                            inputProperties: {
                                query: {
                                    properties: {
                                        baz: {
                                            type: 'string'
                                        }
                                    }
                                },
                                params: {
                                    properties: {
                                        bar: {
                                            type: 'number'
                                        }
                                    }
                                },
                            },
                            events: {
                                onRequestStart: (context) => {
                                    count++;

                                },
                                onRequestEnd: (err, context) => {
                                    count++;
                                },
                                onRouteDefinition: (routeDefinition) => {
                                    count++;
                                },
                                onError: (err) => {
                                    count++;
                                },
                                onResponseError: (err) => {
                                    count++;
                                }
                            },
                            namespace: 'bar.'
                        }, (router) => {

                            router.route({
                                uri: '{baz?}',
                                method: 'POST',
                                input: {
                                    body: {
                                        qux: 'howdy'
                                    }
                                },
                                inputProperties: {
                                    body: {
                                        properties: {
                                            qux: {
                                                type: 'string'
                                            }
                                        }
                                    },
                                    params: {
                                        properties: {
                                            baz: {
                                                type: 'string',
                                                required: false,
                                                default: 'boop'
                                            }
                                        }
                                    },
                                },
                                events: {
                                    onRequestStart: (context) => {
                                        count++;

                                    },
                                    onRequestEnd: (err, context) => {
                                        count++;
                                    },
                                    onRouteDefinition: (routeDefinition) => {
                                        count++;
                                    },
                                    onError: (err) => {
                                        count++;
                                    },
                                    onResponseError: (err) => {
                                        count++;
                                    }
                                },
                            }, 'baz');
                        });
                    });

                    const operation = router.operation('foo.bar.baz');

                    operation({
                        headers: {
                            auth: 'bearer'
                        },
                        query: {
                            mos: 'def'
                        },
                        params: {
                            bar: 1
                        },
                        body: {
                            quux: 'hola'
                        }
                    }, (err, payload, status, headers) => {

                        count++;
                        expect(err).to.be.instanceOf(Error);
                        expect(payload).to.include({
                            message: 'unsuccessful'
                        });
                        expect(status).to.equal(500);
                        expect(Object.keys(headers).length).to.equal(0);
                    });
                    expect(count).to.equal(14);

                });

                it('should call the relevant events for an error call with defined error schemas that do not pass', function() {

                    const callbacks = {
                        onRequestStart: (context) => {

                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                        },
                        onRequestEnd: (err, context) => {

                            expect(context.url).to.equal('http://localhost/foo/1/boop');
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 1,
                                'params.baz': 'boop',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(err).to.be.instanceOf(Error);
                            expect(context.payload).to.include({
                                message: 'unsuccessful'
                            });
                            expect(context.status).to.equal(500);
                            expect(Object.keys(context.headers).length).to.equal(0);
                        },
                        onRouteDefinition: (routeDefinition) => {

                            expect(routeDefinition).to.nested.include({
                                path: 'foo/{bar}/{baz?}',
                                namespace: 'foo.bar.',
                                url: 'http://localhost/foo/{bar}/{baz?}',
                                'input.headers.foo': 'hello',
                                'input.query.baz': 'hi',
                                'input.body.qux': 'howdy',
                                'routeOptions.method': 'post',
                                name: 'foo.bar.baz'
                            });
                        },
                        onError: (err) => {
                            expect(err).to.be.instanceOf(Error);
                        },
                        onResponseError: (err) => {
                            expect(err).to.be.instanceOf(ResponseError);
                        }
                    };

                    let count = 0;
                    const router = createRouter(baseUrl, (url, method, input, callback) => {

                        count++;
                        expect(url).to.equal('http://localhost/foo/1/boop');
                        expect(method).to.equal('post');
                        expect(input).to.nested.include({
                            'headers.foo': 'hello',
                            'headers.auth': 'bearer',
                            'query.baz': 'hi',
                            'query.mos': 'def',
                            'params.bar': 1,
                            'params.baz': 'boop',
                            'body.qux': 'howdy',
                            'body.quux': 'hola'
                        });

                        callback(new Error('unsuccessful'), {
                            message: 'unsuccessful'
                        }, 500, {});
                    });

                    router.group({
                        prefix: '/foo',
                        input: {
                            headers: {
                                foo: 'hello'
                            }
                        },
                        inputProperties: {
                            headers: {
                                properties: {
                                    foo: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        success: {
                            '200': {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        error: {
                            '500': {
                                type: 'string'
                            }
                        },
                        events: {
                            onRequestStart: (context) => {
                                callbacks.onRequestStart(context);
                                count++;

                            },
                            onRequestEnd: (err, context) => {
                                callbacks.onRequestEnd(err, context);
                                count++;
                            },
                            onRouteDefinition: (routeDefinition) => {
                                callbacks.onRouteDefinition(routeDefinition);
                                count++;
                            },
                            onError: (err) => {
                                callbacks.onError(err);
                                count++;
                            },
                            onResponseError: (err) => {
                                callbacks.onResponseError(err);
                                count++;
                            }
                        },
                        namespace: 'foo.',
                        ajvOptions: {
                            useDefaults: true
                        }
                    }, (router) => {

                        router.group({
                            prefix: '{bar}',
                            input: {
                                query: {
                                    baz: 'hi'
                                }
                            },
                            inputProperties: {
                                query: {
                                    properties: {
                                        baz: {
                                            type: 'string'
                                        }
                                    }
                                },
                                params: {
                                    properties: {
                                        bar: {
                                            type: 'number'
                                        }
                                    }
                                },
                            },
                            events: {
                                onRequestStart: (context) => {
                                    count++;

                                },
                                onRequestEnd: (err, context) => {
                                    count++;
                                },
                                onRouteDefinition: (routeDefinition) => {
                                    count++;
                                },
                                onError: (err) => {
                                    count++;
                                },
                                onResponseError: (err) => {
                                    count++;
                                }
                            },
                            namespace: 'bar.'
                        }, (router) => {

                            router.route({
                                uri: '{baz?}',
                                method: 'POST',
                                input: {
                                    body: {
                                        qux: 'howdy'
                                    }
                                },
                                inputProperties: {
                                    body: {
                                        properties: {
                                            qux: {
                                                type: 'string'
                                            }
                                        }
                                    },
                                    params: {
                                        properties: {
                                            baz: {
                                                type: 'string',
                                                required: false,
                                                default: 'boop'
                                            }
                                        }
                                    },
                                },
                                events: {
                                    onRequestStart: (context) => {
                                        count++;

                                    },
                                    onRequestEnd: (err, context) => {
                                        count++;
                                    },
                                    onRouteDefinition: (routeDefinition) => {
                                        count++;
                                    },
                                    onError: (err) => {
                                        count++;
                                    },
                                    onResponseError: (err) => {
                                        count++;
                                    }
                                },
                            }, 'baz');
                        });
                    });

                    const operation = router.operation('foo.bar.baz');

                    operation({
                        headers: {
                            auth: 'bearer'
                        },
                        query: {
                            mos: 'def'
                        },
                        params: {
                            bar: 1
                        },
                        body: {
                            quux: 'hola'
                        }
                    }, (err, payload, status, headers) => {

                        count++;
                        expect(err).to.be.instanceOf(Error);
                        expect(payload).to.include({
                            message: 'unsuccessful'
                        });
                        expect(status).to.equal(500);
                        expect(Object.keys(headers).length).to.equal(0);
                    });
                    expect(count).to.equal(14);

                });

                it('should call the relevant events for a call that does not supply the proper inputs', function() {

                    const callbacks = {
                        onRequestStart: (context) => {

                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 'one',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                        },
                        onRequestEnd: (err, context) => {

                            expect(err).to.be.instanceOf(RequestError);
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 'one',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(context.url).to.not.exist;
                            expect(context.payload).to.not.exist;
                            expect(context.status).to.not.exist;
                            expect(context.headers).to.not.exist;
                        },
                        onRouteDefinition: (routeDefinition) => {

                            expect(routeDefinition).to.nested.include({
                                path: 'foo/{bar}/{baz?}',
                                namespace: 'foo.bar.',
                                url: 'http://localhost/foo/{bar}/{baz?}',
                                'input.headers.foo': 'hello',
                                'input.query.baz': 'hi',
                                'input.body.qux': 'howdy',
                                'routeOptions.method': 'post',
                                name: 'foo.bar.baz'
                            });
                        },
                        onRequestError: (requestError, context) => {

                            expect(requestError).to.be.instanceOf(RequestError);

                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 'one',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(context.url).to.not.exist;
                            expect(context.payload).to.not.exist;
                            expect(context.status).to.not.exist;
                            expect(context.headers).to.not.exist;
                        },
                        onError: (err, context) => {
                            expect(err).to.be.instanceOf(RequestError);
                            expect(context.method).to.equal('post');
                            expect(context.input).to.nested.include({
                                'headers.foo': 'hello',
                                'headers.auth': 'bearer',
                                'query.baz': 'hi',
                                'query.mos': 'def',
                                'params.bar': 'one',
                                'body.qux': 'howdy',
                                'body.quux': 'hola'
                            });
                            expect(context.url).to.not.exist;
                            expect(context.payload).to.not.exist;
                            expect(context.status).to.not.exist;
                            expect(context.headers).to.not.exist;
                        }
                    };

                    let count = 0;
                    const router = createRouter(baseUrl, (url, method, input, callback) => {

                        count++;
                        expect(url).to.equal('http://localhost/foo/1/boop');
                        expect(method).to.equal('post');
                        expect(input).to.nested.include({
                            'headers.foo': 'hello',
                            'headers.auth': 'bearer',
                            'query.baz': 'hi',
                            'query.mos': 'def',
                            'params.bar': 'one',
                            'body.qux': 'howdy',
                            'body.quux': 'hola'
                        });

                        callback(null, {
                            message: 'successful'
                        }, 200, {});
                    });

                    router.group({
                        prefix: '/foo',
                        input: {
                            headers: {
                                foo: 'hello'
                            }
                        },
                        inputProperties: {
                            headers: {
                                properties: {
                                    foo: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        success: {
                            '200': {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        error: {
                            '404': {
                                type: 'string'
                            }
                        },
                        events: {
                            onRequestStart: (context) => {
                                callbacks.onRequestStart(context);
                                count++;
                            },
                            onRequestEnd: (err, context) => {
                                callbacks.onRequestEnd(err, context);
                                count++;
                            },
                            onRouteDefinition: (routeDefinition) => {
                                callbacks.onRouteDefinition(routeDefinition);
                                count++;
                            },
                            onRequestError: (requestError, context) => {
                                callbacks.onRequestError(requestError, context);
                                count++;
                            },
                            onError: (err, context) => {
                                callbacks.onError(err, context);
                                count++;
                            }
                        },
                        namespace: 'foo.',
                        ajvOptions: {
                            useDefaults: true
                        }
                    }, (router) => {

                        router.group({
                            prefix: '{bar}',
                            input: {
                                query: {
                                    baz: 'hi'
                                }
                            },
                            inputProperties: {
                                query: {
                                    properties: {
                                        baz: {
                                            type: 'string'
                                        }
                                    }
                                },
                                params: {
                                    properties: {
                                        bar: {
                                            type: 'number'
                                        }
                                    }
                                },
                            },
                            events: {
                                onRequestStart: (context) => {
                                    count++;

                                },
                                onRequestEnd: (err, context) => {
                                    count++;
                                },
                                onRouteDefinition: (routeDefinition) => {
                                    count++;
                                },
                                onRequestError: (requestError, context) => {
                                    count++;
                                },
                                onError: (err, context) => {
                                    count++;
                                }
                            },
                            namespace: 'bar.'
                        }, (router) => {

                            router.route({
                                uri: '{baz?}',
                                method: 'POST',
                                input: {
                                    body: {
                                        qux: 'howdy'
                                    }
                                },
                                inputProperties: {
                                    body: {
                                        properties: {
                                            qux: {
                                                type: 'string'
                                            }
                                        }
                                    },
                                    params: {
                                        properties: {
                                            baz: {
                                                type: 'string',
                                                required: false,
                                                default: 'boop'
                                            }
                                        }
                                    },
                                },
                                events: {
                                    onRequestStart: (context) => {
                                        count++;

                                    },
                                    onRequestEnd: (err, context) => {
                                        count++;
                                    },
                                    onRouteDefinition: (routeDefinition) => {
                                        count++;
                                    },
                                    onRequestError: (requestError, context) => {
                                        count++;
                                    },
                                    onError: (err, context) => {
                                        count++;
                                    }
                                },
                            }, 'baz');
                        });
                    });

                    const operation = router.operation('foo.bar.baz');

                    operation({
                        headers: {
                            auth: 'bearer'
                        },
                        query: {
                            mos: 'def'
                        },
                        params: {
                            bar: 'one'
                        },
                        body: {
                            quux: 'hola'
                        }
                    }, (err, payload, status, headers) => {

                        count++;
                        expect(err).to.be.instanceOf(RequestError);
                        expect(payload).to.not.exist;
                        expect(status).to.not.exist;
                        expect(headers).to.not.exist;
                    });
                    expect(count).to.equal(16);

                });

            });

            describe('operation(callback)', function() {

                it('should execute the operation by passing the proper url, method, and empty input to the requestHandler', function() {

                    let count = 0;
                    const payload = 'successful';
                    const status = 200;
                    const headers = {};
                    const router = createRouter(baseUrl, (url, method, input, callback) => {

                        count++;
                        expect(url).to.equal('http://localhost');
                        expect(method).to.equal('get');
                        expect(Object.keys(input.headers).length).to.equal(0);
                        expect(Object.keys(input.body).length).to.equal(0);
                        expect(Object.keys(input.params).length).to.equal(0);
                        expect(Object.keys(input.query).length).to.equal(0);

                        callback(null, payload, status, headers);
                    });

                    router.route('/', 'index');
                    const operation = router.operation('index');
                    operation((err, _payload, _status, _headers) => {

                        count++;
                        expect(err).to.be.null;
                        expect(payload).to.equal(_payload);
                        expect(status).to.equal(_status);
                        expect(headers).to.equal(_headers);
                    });
                    expect(count).to.equal(2);
                });
            });

        });

        describe('operation = router.operation(name:String, contextHandler:Function', function() {

            it('should allow modification of the context object via the contextHandler function', function() {

                let count = 0;
                const payload = 'successful';
                const status = 200;
                const headers = {};
                const router = createRouter(baseUrl, (url, method, input, callback) => {

                    count++;
                    expect(url).to.equal('http://localhost');
                    expect(method).to.equal('get');
                    expect(Object.keys(input.headers).length).to.equal(0);
                    expect(Object.keys(input.body).length).to.equal(0);
                    expect(Object.keys(input.params).length).to.equal(0);
                    expect(Object.keys(input.query).length).to.equal(0);
                    expect(input.meta).to.include({
                        foo: 'bar'
                    });

                    callback(null, payload, status, headers);
                });

                router.route('/', 'index');
                const operation = router.operation('index', (context) => {

                    count++;
                    context.input.meta = {
                        foo: 'bar'
                    };
                    return context;
                });

                operation((err, _payload, _status, _headers) => {

                    count++;
                    expect(err).to.be.null;
                    expect(payload).to.equal(_payload);
                    expect(status).to.equal(_status);
                    expect(headers).to.equal(_headers);
                });
                expect(count).to.equal(3);

            });
        });

        describe('operation = router.operation(name:String, contextHandlerArray:[Function]', function() {

            it('should allow modification of the context object via multiple contextHandler functions', function() {

                let count = 0;
                const payload = 'successful';
                const status = 200;
                const headers = {};
                const router = createRouter(baseUrl, (url, method, input, callback) => {

                    count++;
                    expect(url).to.equal('http://localhost');
                    expect(method).to.equal('get');
                    expect(Object.keys(input.headers).length).to.equal(0);
                    expect(Object.keys(input.body).length).to.equal(0);
                    expect(Object.keys(input.params).length).to.equal(0);
                    expect(Object.keys(input.query).length).to.equal(0);
                    expect(input.meta).to.include({
                        foo: 'bar'
                    });

                    callback(null, payload, status, headers);
                });

                router.route('/', 'index');
                const operation = router.operation('index', [
                    (context) => {

                        count++;
                        context.input.meta = {
                            foo: 'bar'
                        };
                        return context;
                    },
                    (context) => {
                        count++;
                        return context;
                    }
                ]);

                operation((err, _payload, _status, _headers) => {

                    count++;
                    expect(err).to.be.null;
                    expect(payload).to.equal(_payload);
                    expect(status).to.equal(_status);
                    expect(headers).to.equal(_headers);
                });
                expect(count).to.equal(4);

            });
        });
    });
});
