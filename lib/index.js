var Boom = require('boom');
var Hoek = require('hoek');

exports.register = function (plugin, options, next) {

    plugin.auth.scheme('auth-header', function (server, config) {

        Hoek.assert(config, 'Missing auth-header strategy config');
        Hoek.assert(typeof config.validateFunc === 'function', 'config.validate must be a validation function in the format (tokens, callback)');

        // scheme
        return {
            authenticate: function (request, reply) {

                var req = request.raw.req;
                var authorization = req.headers.authorization;
                var tokens = {};
                // no authorization header at all!
                if (!authorization) {
                    return reply(Boom.unauthorized(null, 'No Authorization Header'));
                }

                // grab each Authorization header field
                var fields = authorization.split(/\s*;\s*/),
                    len = fields.length,
                    field;
                for(var i=0; i<len; i++){
                    field = fields[i].match(/([^\s]+)\s+(.*)$/);
                    if(!field){
                        // invalid Authorization header partial format
                        // might be other valid parts though
                        // e.g. Authorization: b; Bearer foo
                        continue;
                    }
                    tokens[field[1]] = field[2];
                }

                config.validateFunc.call(request, tokens, function (err, isValid, credentials) {

                    if (err) {
                        return reply(err, { credentials: credentials, log: { tags: ['auth', 'bearer'], data: err } }).code(500);
                    }

                    if (!isValid) {
                        return reply(Boom.unauthorized('Bad token', 'Bearer'), { credentials: credentials });
                    }

                    if (!credentials || typeof credentials !== 'object') {
                        return reply(Boom.badImplementation('Bad token string received for Bearer auth validation'), { log: { tags: 'token' } });
                    }

                    return reply(null, { credentials: credentials });
                });
            }
        };
    });

    next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};
