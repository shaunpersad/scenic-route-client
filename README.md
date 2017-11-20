# scenic-route-client
Expressive routing for HTTP service calls

## Motivation
This is an abstraction layer on top of http service calls e.g. ajax calls from the browser, or server-to-server http calls in node.

It's purpose is to expressively describe, validate, and hook into the various API calls an application might make.

Features and use cases:
- Easily create new API service calls with less repeated code (like copy/pasting the same `request` module calls everywhere)
- Event hooks, which can be used for centralized logging for every service call made
- Automatic validation of input params as well as responses
- Easily swap out the underlying network library, e.g. swapping out `fetch` for `axios`
- Mocking APIs (see express.js mocking example)

## Installation
```bash
npm install scenic-route-client ajv qs --save
```

## Quickstart

#### Setting up the router
We will create a router to the Github API, using the `request` module to facilitate the HTTP calls.
```js
const request = require('request');
const { createRouter } = require('scenic-route-client');

const router = createRouter('https://api.github.com', (url, method, input, callback) => {
    
    request({ url, method,headers: input.headers, qs: input.query, body: input.body, json: true }, (err, res, payload) => {
        
        callback(err, payload, res.statusCode, res.headers);
    });
});
```
#### Defining routes
We will then define two service calls:
- `GET https://api.github.com/search/users?q={string}`
- `GET https://api.github.com/search/repositories?q={string}`
```js
router.group({ 
    prefix: '/search', 
    inputProperties: { 
        query: { 
            q: { 
                type: 'string' 
            } 
        } 
    }
}, (router) => {
   
    router.get('/users', 'searchUsers');
    router.get('/repositories', 'searchRepos');
});
```
#### Executing API calls
We then send the following requests:
- `GET https://api.github.com/search/users?q=shaunpersad`
- `GET https://api.github.com/search/repositories?q=scenic-route-client`
```js
const searchUsers = router.operation('searchUsers');
const searchRepos = router.operation('searchRepos');

searchUsers({ query: { q: 'shaunpersad' } }, (err, payload) => {
    // payload is the result of the API call
});

searchRepos({ query: { q: 'scenic-route-client' } }, (err, payload) => {
    // payload is the result of the API call
});
```