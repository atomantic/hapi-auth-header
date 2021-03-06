# \\[._.]/ - Hapi Authorization Header

[![](http://img.shields.io/gratipay/antic.svg?style=flat)](https://gratipay.com/antic)
[![](http://img.shields.io/npm/dm/hapi-auth-header.svg?style=flat)](https://www.npmjs.org/package/hapi-auth-header)
[![](http://img.shields.io/npm/v/hapi-auth-header.svg?style=flat)](https://www.npmjs.org/package/hapi-auth-header)
[![](http://img.shields.io/codeclimate/github/atomantic/hapi-auth-header.svg?style=flat)](https://codeclimate.com/github/atomantic/hapi-auth-header)
[![](http://img.shields.io/codeclimate/coverage/github/atomantic/hapi-auth-header.svg?style=flat)](https://codeclimate.com/github/atomantic/hapi-auth-header)
[![](http://img.shields.io/travis/atomantic/hapi-auth-header.svg?style=flat)](https://travis-ci.org/atomantic/hapi-auth-header)

[**hapi**](https://github.com/spumko/hapi) Authorization header authentication scheme

## Hapi compatibility

**Version 3.x of this plugin is compatible with Hapi 17 and higher only.**

For Hapi 16, please continue to use version 2.x of this plugin.

## Note

Special thanks to @johnbrett for [hapi-auth-bearer-token plugin](https://www.npmjs.org/package/hapi-auth-bearer-token), which this plugin used as scaffolding.

You might find that the [hapi-auth-bearer-token plugin](https://www.npmjs.org/package/hapi-auth-bearer-token) is all you need, which also allows for `Bearer` supplied as a query param (this module does not). This plugin exists to handle the whole Authorization header, which allows comma delimited Authorization sources. This is useful if you need to validate more than one Authorization header field. For example, the API that this plugin was originally built for was gated by an API management proxy, which forwards traffic along with an "FD" Authorization header, added along with the "Bearer" header like so: `Authorization: FD AF6C74D1-BBB2-4171-8EE3-7BE9356EB018, Bearer 12345678`

This plugin is identical to [hapi-auth-bearer-token plugin](https://www.npmjs.org/package/hapi-auth-bearer-token) except that it will return `tokens` as an object back to your callback rather than `token` as the `Bearer` field value (e.g. `Authorization: FD AF6C74D1-BBB2-4171-8EE3-7BE9356EB018, Bearer 12345678` would result in your validate function being called with tokens set to
```
{
   Bearer: 12345678,
   FD: AF6C74D1-BBB2-4171-8EE3-7BE9356EB018
}
```

## Use
Authentication requires validating tokens passed by Authentication header. You can customize any arbitrary number of names for the Authorization header fields that you want to validate.

Bearer authentication requires validating a token passed in by either the bearer authorization header, or by an access_token query parameter. The `'auth-header'` scheme takes the following options:

- `validateFunc` - (required) An async validation function with the signature `function(tokens)` where:
    - `tokens` - an object containing each of the Authorization header keys.
    - returns [isValid, credentials]
        - `isValid` - `true` if both the username was found and the password matched, otherwise `false`.
        - `credentials` - a credentials object passed back to the application in `request.auth.credentials`. Typically, `credentials` are only
          included when `isValid` is `true`, but there are cases when the application needs to know who tried to authenticate even when it fails
          (e.g. with authentication mode `'try'`).
- `options` - (optional) - there are currently no configuration options :)

```javascript
const Hapi = require('hapi');

const defaultHandler = (request, h) => {
    return h.response('success');
};

const server = new Hapi.Server({
    port: 3117,
    host: 'localhost'
});

server.register(require('hapi-auth-header'), async (err) => {

    server.auth.strategy('header', 'auth-header', {
        validate: function( tokens ) {
            // Use a real strategy here,
            // e.g. send the token to an oauth validation API
            if(tokens.Bearer === "1234" && tokens.oauth === "4321" ){
                return [true, { token: tokens.bearer }]
            } else {
                return [false, { token: tokens.bearer }]
            }
        }
    });

    server.route({ method: 'GET', path: '/', handler: defaultHandler, options: { auth: 'header' } });

    await server.start();

    console.log('Server started at: ' + server.info);
});
```
