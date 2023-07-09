"use strict";
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
        while (_) try {
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
exports.__esModule = true;
var Query = /** @class */ (function () {
    function Query(params) {
        if (params === void 0) { params = {}; }
        var _this = this;
        this.https = typeof params.https !== 'undefined' ? params.https : true;
        this.host = (params.host || '').replace(/\/$/, '');
        var defaultPort = this.https ? 443 : 80;
        this.port = !isNaN(+params.port)
            ? (+params.port || defaultPort)
            : defaultPort;
        this.url = typeof params.url !== 'undefined'
            ? params.url
            : typeof params.path !== 'undefined'
                ? params.path
                // : '/api'
                : '';
        this.useAJAX = params.useAJAX;
        // this.connectHost = this.host
        //     ? this.useAJAX
        //         ? `${this.https ? 'https' : 'http'}://${this.host}:${this.port}`
        //         : `${this.https ? 'wss' : 'ws'}://${this.host}:${this.port}`
        //     : null
        this.connectHost = this.host
            ? "".concat(this.https ? 'https' : 'http', "://").concat(this.host, ":").concat(this.port)
            : null;
        this.extraHeaders = params.extraHeaders;
        this.transports = params.transports;
        this.withCredentials = params.withCredentials;
        this.device_type = params.device_type || 'BROWSER';
        this.device_info = params.device_info;
        this.socketQuery_stack = {
            items: {},
            getItem: function (id) {
                return this.items[id];
            },
            addItem: function (cb, obj) {
                var id = Date.now() + '_' + Math.random();
                this.items[id] = {
                    callback: cb,
                    request: obj,
                    time: Date.now()
                };
                return id;
            },
            removeItem: function (id) {
                delete this.items[id];
            }
        };
        this.env = params.env || 'browser';
        this.autoAuth = typeof params.autoAuth !== "undefined" ? params.autoAuth : false;
        // Можно передать и тогда она будет вызываться если надо авторизоваться, при условии что autoAuth = false
        this.authFunction = params.authFunction || params.authFn;
        this.toMainFunction = params.toMainFunction || params.toMainFn;
        this.afterInitConnect = params.afterInitConnect;
        this.login = params.login || 'api_test';
        this.password = params.password || 'api_test_password';
        this.storeGetFn = params.storeGetFn;
        this.storeSetFn = params.storeSetFn;
        var availableBrowserStorages = ['cookie', 'localStorage'];
        this.browserStorage = availableBrowserStorages.includes(params.browserStorage)
            ? params.browserStorage
            : 'cookie';
        this.tokenStorageKey = params.tokenStorageKey || 'CCSGoCoreToken';
        this.storage = {
            get: function (key) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(typeof this.storeGetFn === 'function')) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.storeGetFn(key)];
                        case 1: return [2 /*return*/, _a.sent()];
                        case 2:
                            if (this.env === 'browser') {
                                if (this.browserStorage === 'cookie') {
                                    // var re = new RegExp("(?:(?:^|.*;\s*)" + key + "\s*\=\s*([^;]*).*$)|^.*$")
                                    // return document.cookie.replace(re, "$1")
                                    return [2 /*return*/, getCookie(key)];
                                }
                                else if (this.browserStorage === 'localStorage') {
                                    console.warn('Functionality in development (storage - get - localStorage)');
                                }
                                else {
                                    console.warn('Unknown type of browserStorage. Available:', availableBrowserStorages.join(','));
                                }
                            }
                            return [2 /*return*/];
                    }
                });
            }); },
            set: function (key, val) { return __awaiter(_this, void 0, void 0, function () {
                var old;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.storage.get(key)];
                        case 1:
                            old = _a.sent();
                            if (old === val) {
                                if (this.debugFull)
                                    console.log('this.storage.set: new token equal old', key, val);
                                return [2 /*return*/];
                            }
                            if (this.debugFull)
                                console.log('this.storage.set: SET (key, old, new)', key, old, val);
                            if (!(typeof this.storeSetFn === 'function')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.storeSetFn(key, val)];
                        case 2: return [2 /*return*/, _a.sent()];
                        case 3:
                            if (this.env === 'browser') {
                                if (this.browserStorage === 'cookie') {
                                    document.cookie = "".concat(key, "=").concat(val);
                                }
                                else if (this.browserStorage === 'localStorage') {
                                    console.warn('Functionality in development (storage - set - localStorage)');
                                }
                                else {
                                    console.warn('Unknown type of browserStorage. Available:', availableBrowserStorages.join(','));
                                }
                            }
                            return [2 /*return*/];
                    }
                });
            }); }
        };
        this.ws_status = WS_NOT_CONNECTED;
        this.auth_response = null;
        this.tryAuthCount = params.tryAuthCount || 10;
        this.tryAuthPause = params.tryAuthPause || 500;
        this.tryCount = params.tryCount || 10;
        this.tryPause = params.tryPause || 500;
        this.debug = params.debug;
        this.debugFull = params.debugFull;
        this.doNotDeleteCollapseDataParam = params.doNotDeleteCollapseDataParam;
        this.status = this.token || !this.autoAuth ? READY : NO_AUTH;
        this.init().then()["catch"](function (e) {
            console.error('ERROR:GoCoreQuery:init:', e);
        });
    }
    return Query;
}());
