'use strict';

const Boom = require('boom');
const Hoek = require('hoek');

const plugin = (server, options) => {
    Hoek.assert(options, 'Missing auth-header strategy options');
    Hoek.assert(typeof options.validateFunc === 'function', 'options.validate must be an async validation function in the format (tokens)');

    const settings = Hoek.clone(options);

    const scheme = {
        authenticate: async (request, h) => {
            let req = request.raw.req;
            let authorization = req.headers.authorization;
            let tokens = {};
            // no authorization header at all!
            if(!authorization) {
                return h.unauthenticated(Boom.unauthorized('No Authorization Header', 'Bearer'));
            }

            // grab each Authorization header field
            let fields = authorization.split(/\s*,\s*/);
            let len = fields.length;
            let field;
            for(let i = 0; i < len; i++){
                field = fields[i].match(/([^\s]+)\s+(.*)$/);
                if(!field){
                    // invalid Authorization header partial format
                    // might be other valid parts though
                    // e.g. Authorization: b; Bearer foo
                    continue;
                }
                tokens[field[1]] = field[2];
            }

            let isValid = false;
            let credentials = undefined;
            try {
                let res = await settings.validateFunc(tokens);
                if(typeof res == 'object' && Array.isArray(res)) {
                    [isValid, credentials] = res;
                } else {
                    isValid = res;
                }
            } catch(err) {
                return h.unauthenticated(Boom.badImplementation('Internal error'), {artifacts: err});
            }

            if(!isValid) {
                if(credentials && typeof credentials == 'object') {
                    return h.unauthenticated(Boom.unauthorized('Bad token', 'Bearer'), {credentials: credentials});
                } else {
                    return h.unauthenticated(Boom.unauthorized('Bad token', 'Bearer'));
                }
            }

            if(!credentials || typeof credentials !== 'object') {
                return h.unauthenticated(Boom.badImplementation('Bad credentials received for Bearer auth validation'));
            }

            return h.authenticated({credentials: credentials});
        }
    };

    return scheme;
};

module.exports = {
    plugin: {
        register: (server, options) => {
            server.auth.scheme('auth-header', plugin);
        },
        name: 'hapi-auth-header',
        pkg: require('../package.json')
    }
};
