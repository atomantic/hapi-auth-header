var Code = require('code');
var Lab = require('lab');
var Hapi = require('hapi');

var lab = exports.lab = Lab.script();
var before = lab.before;
var after = lab.after;
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

describe('Authorization', function () {

    var defaultHandler = function (request, reply) {
        reply('success');
    };

    var server = new Hapi.Server({debug: false});
    server.connection();
    before(function(done){
        server.register(require('../'), function (err) {
            expect(err).to.not.exist();

            server.auth.strategy('default', 'auth-header', true, {
                validateFunc: function(tokens, callback) {
                   return callback(null, tokens.Bearer === '12345678', tokens);
                }
            });

            server.auth.strategy('multi', 'auth-header', {
                validateFunc: function(tokens, callback) {
                   return callback(
                       null,
                       tokens.Bearer === '12345678' && tokens.gateway === '87654321',
                       tokens
                   );
                }
            });

            server.auth.strategy('always_reject', 'auth-header', {
                validateFunc: function(tokens, callback) {
                   return callback(null, false, tokens);
                }
            });

            server.auth.strategy('with_error_strategy', 'auth-header', {
                validateFunc: function(tokens, callback) {
                    return callback({'Error': 'Error'}, false, null);
                }
            });

            server.auth.strategy('no_credentials', 'auth-header', {
                validateFunc: function(tokens, callback) {
                    return callback(null, true, null);
                }
            });

            server.route([
                { method: 'POST', path: '/basic', handler: defaultHandler, config: { auth: 'default' } },
                { method: 'POST', path: '/basic_default_auth', handler: defaultHandler, config: { } },
                { method: 'GET', path: '/basic_validate_error', handler: defaultHandler, config: { auth: 'with_error_strategy' } },
                { method: 'GET', path: '/always_reject', handler: defaultHandler, config: { auth: 'always_reject' } },
                { method: 'GET', path: '/no_credentials', handler: defaultHandler, config: { auth: 'no_credentials' } },
                { method: 'GET', path: '/multi', handler: defaultHandler, config: { auth: 'multi' } }
            ]);

            done();
        });
    });

    after(function(done) {
        server = null;
        done();
    });

    it('returns 200 and success with correct bearer token header set', function (done) {
        var request = { method: 'POST', url: '/basic', headers: { authorization: 'Bearer 12345678' } };
        server.inject(request, function (res) {
            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('success');
            done();
        });
    });

    it('returns 401 error when no bearer token is set when one is required by default', function (done) {
        var request = { method: 'POST', url: '/basic_default_auth' };
        server.inject(request, function (res) {
            expect(res.statusCode).to.equal(401);
            done();
        });
    });

    it('returns 401 when bearer authorization header is not set', function (done) {
        var request = { method: 'POST', url: '/basic', headers: { authorization: 'definitelynotacorrecttoken' } };
        server.inject(request, function (res) {
            expect(res.statusCode).to.equal(401);
            done();
        });
    });

    it('returns 401 error with object bearer token type (invalid token)', function (done) {
        var request = { method: 'POST', url: '/basic', headers: { authorization: 'Bearer {test: 1}' } };
        server.inject(request, function (res) {
            expect(res.statusCode).to.equal(401);
            done();
        });
    });

    it('returns 200 when using multi and passing multiple good auth tokens', function (done) {
        var request = { method: 'GET', url: '/multi', headers: { authorization: 'Bearer 12345678, gateway 87654321' } };
        server.inject(request, function (res) {
            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal('success');
            done();
        });
    });

    it('returns 401 when using multi and one of the tokens is missing', function (done) {
        var request = { method: 'GET', url: '/multi', headers: { authorization: 'Bearer 12345678' } };
        server.inject(request, function (res) {
            expect(res.statusCode).to.equal(401);
            done();
        });
    });

    it('returns 500 when strategy returns an error to validateFunc', function (done) {
        var request = { method: 'GET', url: '/basic_validate_error', headers: { authorization: 'Bearer 12345678' } };
        server.inject(request, function (res) {
            expect(res.statusCode).to.equal(500);
            expect(JSON.stringify(res.result)).to.equal('{"Error":"Error"}');
            done();
        });
    });

    it('returns 401 handles when isValid false passed to validateFunc', function (done) {
        var request = { method: 'GET', url: '/always_reject', headers: { authorization: 'Bearer 12345678' } };
        server.inject(request, function (res) {
            expect(res.statusCode).to.equal(401);
            done();
        });
    });

    it('returns 500 when no credentials passed to validateFunc', function (done) {
        var request = { method: 'GET', url: '/no_credentials', headers: { authorization: 'Bearer 12345678' } };
        server.inject(request, function (res) {
            expect(res.statusCode).to.equal(500);
            done();
        });
    });
});
