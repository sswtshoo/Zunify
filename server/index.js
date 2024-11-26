"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var bun_1 = require("bun");
var dotenv_1 = require("dotenv");
var url_1 = require("url");
(0, dotenv_1.config)();
var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var redirect_uri = process.env.REDIRECT_URI;
var app_uri = process.env.APP_URI;
var refreshToken = null;
var accessToken = null;
var tokenExpiryTime = null;
function generateRandomString(length) {
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: length }, function () {
        return possible.charAt(Math.floor(Math.random() * possible.length));
    }).join('');
}
function refreshAccessToken() {
    return __awaiter(this, void 0, void 0, function () {
        var response, errorData, tokenData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, fetch('https://accounts.spotify.com/api/token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                Authorization: 'Basic ' + btoa("".concat(client_id, ":").concat(client_secret)),
                            },
                            body: new url_1.URLSearchParams({
                                grant_type: 'refresh_token',
                                refresh_token: refreshToken,
                            }),
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    errorData = _a.sent();
                    console.error("Failed to refresh token: ".concat(response.statusText), errorData);
                    throw new Error("Failed to refresh token: ".concat(response.statusText));
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    tokenData = _a.sent();
                    accessToken = tokenData.access_token;
                    tokenExpiryTime = Date.now() + tokenData.expires_in * 1000;
                    return [2 /*return*/, { accessToken: accessToken, expiresIn: tokenData.expires_in }];
                case 5:
                    error_1 = _a.sent();
                    console.error("Error refreshing token: ".concat(error_1));
                    return [2 /*return*/, null];
                case 6: return [2 /*return*/];
            }
        });
    });
}
(0, bun_1.serve)({
    port: 5174,
    fetch: function (req) {
        return __awaiter(this, void 0, void 0, function () {
            var url, headers, newAccessTokenData, code, returnTo, responseToken, errorData, tokenData, redirectUrl, error_2, scopes, scope, state, auth_query_parameters;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = new URL(req.url);
                        console.log('Incoming request to:', url.pathname);
                        headers = new Headers({
                            'Access-Control-Allow-Origin': 'http://localhost:3000',
                            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type',
                            'Access-Control-Allow-Credentials': 'true',
                        });
                        if (req.method === 'OPTIONS') {
                            return [2 /*return*/, new Response(null, { headers: headers })];
                        }
                        if (!(url.pathname === '/refresh-token')) return [3 /*break*/, 3];
                        if (!(req.method === 'POST')) return [3 /*break*/, 2];
                        if (!refreshToken) {
                            return [2 /*return*/, new Response('No refresh token available', {
                                    status: 401,
                                    headers: headers,
                                })];
                        }
                        return [4 /*yield*/, refreshAccessToken()];
                    case 1:
                        newAccessTokenData = _a.sent();
                        if (newAccessTokenData) {
                            return [2 /*return*/, new Response(JSON.stringify({
                                    access_token: newAccessTokenData.accessToken,
                                    expires_in: newAccessTokenData.expiresIn,
                                }), {
                                    headers: __assign(__assign({}, headers), { 'Content-Type': 'application/json' }),
                                })];
                        }
                        else {
                            return [2 /*return*/, new Response('Failed to refresh access token', {
                                    status: 401,
                                    headers: headers,
                                })];
                        }
                        return [3 /*break*/, 3];
                    case 2: return [2 /*return*/, new Response('Method not allowed', {
                            status: 405,
                            headers: headers,
                        })];
                    case 3:
                        if (!(url.pathname === '/')) return [3 /*break*/, 12];
                        code = url.searchParams.get('code');
                        returnTo = url.searchParams.get('returnTo') || '/';
                        if (!code) return [3 /*break*/, 11];
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 9, , 10]);
                        return [4 /*yield*/, fetch('https://accounts.spotify.com/api/token', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    Authorization: 'Basic ' + btoa("".concat(client_id, ":").concat(client_secret)),
                                },
                                body: new url_1.URLSearchParams({
                                    code: code,
                                    redirect_uri: redirect_uri,
                                    grant_type: 'authorization_code',
                                }),
                            })];
                    case 5:
                        responseToken = _a.sent();
                        if (!!responseToken.ok) return [3 /*break*/, 7];
                        return [4 /*yield*/, responseToken.text()];
                    case 6:
                        errorData = _a.sent();
                        return [2 /*return*/, new Response("Token request failed: ".concat(errorData), {
                                status: 400,
                                headers: headers,
                            })];
                    case 7: return [4 /*yield*/, responseToken.json()];
                    case 8:
                        tokenData = _a.sent();
                        accessToken = tokenData.access_token;
                        refreshToken = tokenData.refresh_token;
                        tokenExpiryTime = Date.now() + tokenData.expires_in * 1000;
                        redirectUrl = new URL(app_uri);
                        redirectUrl.searchParams.set('access_token', tokenData.access_token);
                        redirectUrl.searchParams.set('expires_in', tokenData.expires_in.toString());
                        if (returnTo && returnTo !== '/') {
                            redirectUrl.pathname = decodeURIComponent(returnTo);
                        }
                        return [2 /*return*/, Response.redirect(redirectUrl.toString(), 302)];
                    case 9:
                        error_2 = _a.sent();
                        console.error('Token exchange error:', error_2);
                        return [2 /*return*/, new Response("Error getting access token: ".concat(error_2.message), {
                                status: 500,
                                headers: headers,
                            })];
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        scopes = [
                            'user-read-playback-state',
                            'user-modify-playback-state',
                            'user-read-currently-playing',
                            'playlist-read-private',
                            'playlist-read-collaborative',
                            'playlist-modify-private',
                            'playlist-modify-public',
                            'user-library-read',
                            'user-library-modify',
                            'user-follow-read',
                            'user-follow-modify',
                            'streaming',
                            'user-read-recently-played',
                        ];
                        scope = scopes.join(' ');
                        state = generateRandomString(16);
                        auth_query_parameters = new url_1.URLSearchParams({
                            response_type: 'code',
                            client_id: client_id,
                            scope: scope,
                            redirect_uri: redirect_uri,
                            state: state,
                        });
                        if (returnTo) {
                            auth_query_parameters.set('returnTo', returnTo);
                        }
                        return [2 /*return*/, Response.redirect("https://accounts.spotify.com/authorize/?".concat(auth_query_parameters.toString()))];
                    case 12: return [2 /*return*/, new Response('Not found', { status: 404, headers: headers })];
                }
            });
        });
    },
});
console.log('Server running on host:5174');
