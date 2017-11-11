'use strict';

const Code = require('code');
const Lab = require('lab');
const Hapi = require('hapi');

const lab = exports.lab = Lab.script();
var expect = Code.expect;

lab.describe('Authorization', () => {

    const defaultHandler = (request, h) => {
        return h.response('success').code(200);
    };

    let server = new Hapi.Server({debug: false});
    lab.before(async () => {
        await server.register(require('../'));

        server.auth.strategy('default', 'auth-header', {
            validateFunc: function(tokens) {
                return [(tokens.Bearer === '12345678'), tokens];
            }
        });
        server.auth.default('default');

        server.auth.strategy('multi', 'auth-header', {
            validateFunc: function(tokens) {
                return [(tokens.Bearer === '12345678' && tokens.gateway === '87654321'), tokens];
            }
        });

        server.auth.strategy('always_reject', 'auth-header', {
            validateFunc: function(tokens) {
                return [false, tokens];
            }
        });

        server.auth.strategy('with_error_strategy', 'auth-header', {
            validateFunc: function(tokens, callback) {
                throw {'Error': 'Error'};
            }
        });

        server.auth.strategy('no_credentials', 'auth-header', {
            validateFunc: function(tokens, callback) {
                return true;  // Alias for [false]
            }
        });

        server.auth.strategy('bad_credentials', 'auth-header', {
            validateFunc: function(tokens, callback) {
                return [false, 'foo'];
            }
        });

        server.route([
            { method: 'POST', path: '/basic', handler: defaultHandler, options: { auth: 'default' } },
            { method: 'POST', path: '/basic_default_auth', handler: defaultHandler, options: { } },
            { method: 'GET', path: '/basic_validate_error', handler: defaultHandler, options: { auth: 'with_error_strategy' } },
            { method: 'GET', path: '/always_reject', handler: defaultHandler, options: { auth: 'always_reject' } },
            { method: 'GET', path: '/no_credentials', handler: defaultHandler, options: { auth: 'no_credentials' } },
            { method: 'GET', path: '/bad_credentials', handler: defaultHandler, options: { auth: 'bad_credentials' } },
            { method: 'GET', path: '/multi', handler: defaultHandler, options: { auth: 'multi' } }
        ]);
    });

    lab.after(() => {
        server = null;
    });

    lab.it('returns 200 and success with correct bearer token header set', async () => {
        let request = { method: 'POST', url: '/basic', headers: { authorization: 'Bearer 12345678' } };
        let res = await server.inject(request);

        expect(res.statusCode).to.equal(200);
        expect(res.payload).to.equal('success');
    });

    lab.it('returns 401 error when no bearer token is set when one is required by default', async () => {
        let request = { method: 'POST', url: '/basic_default_auth' };
        let res = await server.inject(request);
        
        expect(res.statusCode).to.equal(401);
    });

    lab.it('returns 401 when bearer authorization header is not set', async () => {
        let request = { method: 'POST', url: '/basic', headers: { authorization: 'definitelynotacorrecttoken' } };
        let res = await server.inject(request);

        expect(res.statusCode).to.equal(401);
    });

    lab.it('returns 401 error with object bearer token type (invalid token)', async () => {
        let request = { method: 'POST', url: '/basic', headers: { authorization: 'Bearer {test: 1}' } };
        let res = await server.inject(request);

        expect(res.statusCode).to.equal(401);
    });

    lab.it('returns 401 error with object bearer token type (invalid credentials object passed)', async () => {
        let request = { method: 'GET', url: '/bad_credentials', headers: { authorization: 'Bearer {test: 1' } };
        let res = await server.inject(request);
        
        expect(res.statusCode).to.equal(401);
    });

    lab.it('returns 200 when using multi and passing multiple good auth tokens', async () => {
        let request = { method: 'GET', url: '/multi', headers: { authorization: 'Bearer 12345678, gateway 87654321' } };
        let res = await server.inject(request);
        
        expect(res.statusCode).to.equal(200);
        expect(res.payload).to.equal('success');
    });

    lab.it('returns 401 when using multi and one of the tokens is missing', async () => {
        let request = { method: 'GET', url: '/multi', headers: { authorization: 'Bearer 12345678' } };
        let res = await server.inject(request);

        expect(res.statusCode).to.equal(401);
    });

    lab.it('returns 500 when strategy returns an error to validateFunc', async () => {
        let request = { method: 'GET', url: '/basic_validate_error', headers: { authorization: 'Bearer 12345678' } };
        let res = await server.inject(request);

        expect(res.statusCode).to.equal(500);
    });

    lab.it('returns 401 handles when isValid false passed to validateFunc', async () => {
        let request = { method: 'GET', url: '/always_reject', headers: { authorization: 'Bearer 12345678' } };
        let res = await server.inject(request);
        
        expect(res.statusCode).to.equal(401);
    });

    lab.it('returns 500 when no credentials passed to validateFunc', async () => {
        let request = { method: 'GET', url: '/no_credentials', headers: { authorization: 'Bearer 12345678' } };
        let res = await server.inject(request);
        
        expect(res.statusCode).to.equal(500);
    });

    lab.it('returns 401 when bad credentials passed to validateFunc', async () => {
        let request = { method: 'GET', url: '/bad_credentials', headers: { authorization: 'Bearer 12345678' } };
        let res = await server.inject(request);
        
        expect(res.statusCode).to.equal(401);
    });
});
