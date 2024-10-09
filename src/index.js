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
var socket_io_client_1 = require("socket.io-client");
var lang_1 = require("./lang");
var uuid_1 = require("uuid");
function getMsg(msgAlias, lang) {
    return (0, lang_1.getMsg)(msgAlias, lang || (this === null || this === void 0 ? void 0 : this.lang));
}
var WS_NOT_CONNECTED = 'WS_NOT_CONNECTED';
var WS_CONNECTED = 'WS_CONNECTED';
var WS_CONNECTING = 'WS_CONNECTING';
var NO_AUTH = 'NO_AUTH';
var IN_AUTH = 'IN_AUTH';
var READY = 'READY';
var AUTH_ERROR = 'AUTH_ERROR';
var ERROR = 'ERROR';
var uncollapseData = function (obj) {
    var _a;
    if ((_a = obj === null || obj === void 0 ? void 0 : obj.data) === null || _a === void 0 ? void 0 : _a.rowsCollapsed) {
        obj.data.rows = obj.data.rowsCollapsed.rows.map(function (rowArr) {
            var rowObj = {};
            rowArr.forEach(function (val, i) {
                rowObj[obj.data.rowsCollapsed.columns[i]] = val;
            });
            return rowObj;
        });
        return obj;
    }
    if (!Array.isArray(obj.data) || !obj.data_columns)
        return obj;
    var data = obj.data;
    var res = obj;
    // for (var key in Object.keys(obj)) {
    //     if (key === 'data') continue
    //     res[key] = obj[key]
    // }
    if (!data.length)
        return res;
    if (Object.keys(data[0]).join('') === obj.data_columns.join(''))
        return res;
    var newData = [];
    for (var rowIndex in Object.keys(data)) {
        var row = {};
        for (var columnIndex in Object.keys(obj.data_columns)) {
            var columnName = obj.data_columns[columnIndex];
            row[columnName] = data[rowIndex][columnIndex];
        }
        newData.push(row);
    }
    res.data = newData;
    return res;
};
var getCookie = function (name) {
    return document.cookie.split('; ').reduce(function (r, v) {
        var parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
};
function tryDo(obj, cb) {
    var _this = this;
    // Если уже определена ошибка (либо во время авторизации либо во время выполнения запроса), то
    // Отклоняем все запросы. Позже эта ошибка будет сброшена
    if (this.status === ERROR) {
        if (this.debugFull)
            console.log('Server error. Finish', this.response);
        return cb(null, this.auth_response);
    }
    if (this.status === AUTH_ERROR) {
        if (this.debugFull)
            console.log('Error in auth process. Finish', this.auth_response);
        return cb(null, this.auth_response);
    }
    // Запускаем авторизацию и вызываем запрос заново (он попадет в цикл ожидание пока авторизация не пройдет)
    if (this.status === NO_AUTH) {
        if (this.debugFull)
            console.log('Not authorized yet. Start process and call request again', { obj: obj, res: this.response });
        this.auth();
        if (!this.autoAuth)
            return cb(null, this.response);
        return tryDo.call(this, obj, cb);
    }
    // Производится авторизация, немного ждем и вызываем заново. Таким образом рано или поздно статус изменется
    if (this.status === IN_AUTH) {
        if (this.debugFull)
            console.log('Still in auth process. Wait', { res: this.response });
        setTimeout(function () {
            if (!_this.autoAuth) {
                _this.status = NO_AUTH;
                return cb(null, _this.response);
            }
            tryDo.call(_this, obj, cb);
        }, 100);
        return;
    }
    if (this.status === READY) {
        if (this.debugFull)
            console.log('Status READY. Run query.', obj);
        var res_1;
        var counter_1 = 0;
        var q_1 = function () { return __awaiter(_this, void 0, void 0, function () {
            var tkn, e_1;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 6]);
                        return [4 /*yield*/, this.query(obj)];
                    case 1:
                        res_1 = _b.sent();
                        this.response = res_1;
                        if (res_1.code) {
                            // Сессия стухла
                            if (res_1.code === -4) {
                                // if (!this.autoAuth) return cb(null, res)
                                this.status = NO_AUTH;
                                return [2 /*return*/, tryDo.call(this, obj, cb)];
                            }
                            // Логическая ошибка
                            return [2 /*return*/, cb(null, res_1)];
                        }
                        // Установим токен если это был запрос авторизации
                        if (!this.skipSetTokenOnLogin
                            && obj.command === this.loginCommand
                            && ((_a = obj.object) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === this.loginObject) {
                            tkn = (res_1 === null || res_1 === void 0 ? void 0 : res_1.data)
                                ? res_1.data[this.loginTokenFieldName]
                                : res_1[this.loginTokenFieldName];
                            if (tkn) {
                                this.token = tkn;
                                this.socket.auth.token = this.token;
                                this.storage.set(this.tokenStorageKey, this.token);
                            }
                        }
                        return [2 /*return*/, cb(null, res_1)];
                    case 2:
                        e_1 = _b.sent();
                        // Произошла некая ошибка при запросе (например пропало соединение с сервером)
                        // Будем повторять несколько раз, прежде чем выдать ошибку
                        counter_1++;
                        if (!(counter_1 <= this.tryCount)) return [3 /*break*/, 4];
                        console.log("Error while do query. Try:".concat(counter_1, " of ").concat(this.tryCount, ". Wait ").concat(this.tryPause), e_1);
                        return [4 /*yield*/, new Promise(function (resolve) {
                                setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _a = resolve;
                                                return [4 /*yield*/, q_1()];
                                            case 1:
                                                _a.apply(void 0, [_b.sent()]);
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }, _this.tryPause);
                            })];
                    case 3:
                        res_1 = _b.sent();
                        return [2 /*return*/, res_1];
                    case 4:
                        console.log("Error while do query. Finish", e_1);
                        this.status = ERROR;
                        this.response = e_1;
                        setTimeout(function () {
                            // Вернем в состояние готового (подключение могло восстановиться)
                            _this.status = READY;
                            _this.response = null;
                        }, 3000);
                        return [2 /*return*/, cb(null, {
                                code: 500,
                                e: e_1,
                                message: 'Server is not available'
                            })];
                    case 5: return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        q_1();
    }
    else {
        return cb(new Error("Unknown status: ".concat(this.status)));
    }
}
var isWindow = (typeof window === 'object' && window);
var globalObj = isWindow ? window : {};
// @ts-ignore
var toastr = isWindow ? globalObj === null || globalObj === void 0 ? void 0 : globalObj.toastr : undefined;
// @ts-ignore
var bootbox = isWindow ? globalObj === null || globalObj === void 0 ? void 0 : globalObj.bootbox : undefined;
// // @ts-ignore
// let $ = window?.$
var Query = /** @class */ (function () {
    function Query(params) {
        var _this = this;
        if (!params)
            params = {};
        this.lang = params.lang || 'en';
        getMsg.bind(this);
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
        this.uuidStorageKey = params.uuidStorageKey || 'goCoreUUID';
        this.skipSetTokenOnLogin = params.skipSetTokenOnLogin;
        this.loginCommand = params.loginCommand || 'login';
        this.loginObject = params.loginObject ? String(params.loginObject).toLowerCase() : 'user';
        this.loginTokenFieldName = params.loginTokenFieldName || 'token';
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
        // Будем плавно увеличивать таймаут, если сразу не удается подключиться.
        // Сбросим после успешного подключения
        this.tryConnectCnt = 0;
        this.tryConnectTimeout = 50;
        this.init().then().catch(function (e) {
            console.error('ERROR:GoCoreQuery:init:', e);
        });
    }
    Query.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, uuid;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.storage.get(this.tokenStorageKey)
                            // Сохраним uuid если его еще нет
                        ];
                    case 1:
                        _a.token = _b.sent();
                        return [4 /*yield*/, this.storage.get(this.uuidStorageKey)];
                    case 2:
                        uuid = _b.sent();
                        if (!!uuid) return [3 /*break*/, 4];
                        uuid = (0, uuid_1.v4)();
                        return [4 /*yield*/, this.storage.set(this.uuidStorageKey, uuid)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        if (this.debugFull)
                            console.log('IN init(): TOKEN==>', this.token);
                        if (!this.useAJAX) {
                            this.connectSocket();
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Query.prototype.query = function () {
        return __awaiter(this, arguments, void 0, function (obj) {
            var _a;
            if (obj === void 0) { obj = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.useAJAX) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.queryAJAX(obj)];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.queryWS(obj)];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4: return [2 /*return*/, _a];
                }
            });
        });
    };
    Query.prototype.queryAJAX = function () {
        return __awaiter(this, arguments, void 0, function (obj) {
            var httpS, data, options;
            if (obj === void 0) { obj = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        httpS = this.https ? require('https') : require('http');
                        data = JSON.stringify(obj);
                        options = {
                            hostname: this.host,
                            port: this.port,
                            path: this.url,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': data.length,
                                'Authorization': "Bearer ".concat(this.token)
                            }
                        };
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var req = httpS.request(options, function (res) {
                                    res.setEncoding('utf8');
                                    var rawData = '';
                                    res.on('data', function (chunk) {
                                        rawData += chunk;
                                    });
                                    res.on('end', function () {
                                        try {
                                            var parsedData = JSON.parse(rawData);
                                            resolve(parsedData);
                                        }
                                        catch (e) {
                                            console.error(e.message);
                                            reject(e);
                                        }
                                    });
                                });
                                req.on('error', function (error) {
                                    console.error(error);
                                    reject(error);
                                });
                                req.write(data);
                                req.end();
                            })];
                    case 1: 
                    // if (this.cookie){
                    //     options.headers['Set-Cookie'] = this.cookie
                    // }
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Query.prototype.socketQuery = function (obj, cb) {
        if (this.debug) {
            var alias = ' ➢ ' + obj.object + ' ➢ ' + obj.command + '    ';
            console.groupCollapsed('%c ' + alias, 'background: #35ff4829; color: #000');
            console.log(obj);
            console.groupEnd();
            if (!this.doNotDeleteCollapseDataParam && obj.params && typeof obj.params.collapseData !== 'undefined') {
                console.warn('%c ' + alias + 'The client cannot pass the collapseData parameter. ' +
                    'You need to fix the method so that it does not use it. ' +
                    '\nThe collapseData parameter has been deleted and will not be passed!', 'background: #ffa482; color: #000');
                delete obj.params.collapseData;
            }
        }
        var id;
        if (typeof cb === "function") {
            id = this.socketQuery_stack.addItem(cb, obj);
        }
        this.socket.emit('socketQuery', obj, id);
    };
    Query.prototype.connectSocket = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, options;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.ws_status !== WS_NOT_CONNECTED) {
                            return [2 /*return*/];
                        }
                        this.ws_status = WS_CONNECTING;
                        if (!!this.token) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, this.storage.get(this.tokenStorageKey)];
                    case 1:
                        _a.token = _b.sent();
                        _b.label = 2;
                    case 2:
                        options = {
                            path: this.url.replace(/\/$/, ''),
                            query: {
                                type: 'WEB', // deprecated
                                device_type: this.device_type,
                                device_info: this.device_info
                            },
                            // withCredentials:true,
                            auth: {
                                token: this.token
                            }
                        };
                        if (typeof this.extraHeaders !== "undefined") {
                            options.extraHeaders = this.extraHeaders;
                        }
                        if (typeof this.transports !== "undefined") {
                            options.transports = this.transports;
                        }
                        if (typeof this.withCredentials !== "undefined") {
                            options.withCredentials = this.withCredentials;
                        }
                        if (this.debugFull)
                            console.log('connectSocket', this.connectHost, options);
                        this.socket = this.connectHost
                            ? (0, socket_io_client_1.io)(this.connectHost, options)
                            : (0, socket_io_client_1.io)(options);
                        // ========= SET WS Handlers =======================
                        this.socket.on("connect", function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _a = this;
                                        return [4 /*yield*/, this.storage.get(this.tokenStorageKey)];
                                    case 1:
                                        _a.token = _b.sent();
                                        this.socket.auth.token = this.token;
                                        if (this.debug)
                                            console.log('CONNECTED');
                                        this.ws_status = WS_CONNECTED;
                                        if (this.oldSocketId) {
                                            this.socket.emit('setOldSocketId', this.oldSocketId);
                                        }
                                        this.oldSocketId = this.socket.id;
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        this.socket.on("disconnect", function (reason) { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _a = this;
                                        return [4 /*yield*/, this.storage.get(this.tokenStorageKey)];
                                    case 1:
                                        _a.token = _b.sent();
                                        this.socket.auth.token = this.token;
                                        if (this.debug)
                                            console.log('SOCKET DISCONNECT', reason);
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        this.socket.on("connect_error", function (err) {
                            if (_this.debug)
                                console.log('CONNECT_ERROR', err);
                        });
                        // this.socket.on("disconnect", (reason) => {
                        //     if (this.debug) console.log('CONNECT_ERROR', reason)
                        //     this.ws_status = WS_NOT_CONNECTED
                        //     if (reason === 'io client disconnect'){
                        //         this.connectSocket()
                        //     }
                        // });
                        // store token
                        this.socket.on('token', function (token) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (this.debugFull)
                                            console.log('onToken', new Date(), token);
                                        // console.log('update TOKEN')
                                        this.token = token;
                                        this.socket.auth.token = this.token;
                                        return [4 /*yield*/, this.storage.set(this.tokenStorageKey, this.token)
                                            // this.socket.disconnect()
                                            // this.socket.connect()
                                            // if (!this.useAJAX){
                                            //     this.ws_status = WS_CONNECTING
                                            //     this.socket.disconnect()
                                            //     if (this.status === IN_AUTH) this.status = READY
                                            //     this.socket.connect()
                                            // }
                                        ];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                        // queryCallback
                        this.socket.on('socketQueryCallback', function (callback_id, result, request_time) {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                            var item = _this.socketQuery_stack.getItem(callback_id);
                            if (typeof item !== "object")
                                return;
                            var alias = '➢ ' + item.request.object + ' ➢ ' + item.request.command + '    ';
                            var dataIsObj;
                            if (item.request.params) {
                                dataIsObj = item.request.params.dataIsObj;
                            }
                            var resultData = (result === null || result === void 0 ? void 0 : result.data) || result;
                            if (typeof result === 'object' && result !== null) {
                                if (typeof result.code === 'undefined') {
                                    console.log("%c ".concat(alias, "The server function must return \"code\". \n                        Use the standard response, for example: \nreturn new UserOk('noToastr',{data})"), 'background: #ffd582; color: #000');
                                }
                                if (!result.toastr) {
                                    result.toastr = {
                                        message: 'noToastr',
                                        type: 'info'
                                    };
                                }
                                if (!result.toastr.type) {
                                    result.toastr.type = 'info';
                                }
                                if (result.code !== 10) {
                                    result.time = request_time;
                                    var t = result === null || result === void 0 ? void 0 : result.toastr;
                                    var firstUserErrMsg = (_a = result === null || result === void 0 ? void 0 : result.data) === null || _a === void 0 ? void 0 : _a.firstUserErrMsg;
                                    var r_params_1 = item.request.params || {};
                                    var show_toastr = (function () {
                                        if (r_params_1.noToastr)
                                            return false; // Если есть параметр noToastr, не показываем ни в каком случае
                                        // Если ответ с ошибкой, то не показываем если есть параметры noToastrError или noToastrErr
                                        if (result.code)
                                            return !(r_params_1.noToastrError || r_params_1.noToastrErr);
                                        return !r_params_1.noToastrSuccess;
                                    })();
                                    if (typeof toastr == "object" && t
                                        && t.message !== 'noToastr'
                                        && t.message !== 'noToastrErr'
                                        && show_toastr && !r_params_1.checkAccess
                                        && typeof toastr[t.type] === 'function') {
                                        toastr[t.type](firstUserErrMsg || t.message, t.title);
                                    }
                                    if (typeof toastr == "object" && t && t.additionalMessage && typeof toastr['error'] === 'function') {
                                        toastr['error'](t.additionalMessage, 'ATTENTION');
                                    }
                                    // if (result.code === -4) {
                                    //     console.log('НЕ АВТОРИЗОВАН')
                                    //     item.callback(result)
                                    //     this.socketQuery_stack.removeItem(callback_id)
                                    //     return false
                                    // }
                                }
                            }
                            else {
                                console.log("%c THE ANSWER MUST BE AN OBJECT AND NOT null.\n                Use the standard response, for example,      \n                return new UserOk('noToastr',{data});", 'background: #F00; color: #fff');
                                console.log('RESULT:', result);
                            }
                            if (typeof item.callback === "function") {
                                if (_this.debug) {
                                    var bg = result.code
                                        ? ((result.code === 10)
                                            ? '#c66fbb'
                                            : (result.code === 11)
                                                ? '#e08f9b'
                                                : '#c60000')
                                        : '#2a711a';
                                    console.groupCollapsed('%c ' + alias, 'background: ' + bg + '; color: #fff500');
                                    console.log(item.request);
                                    console.log(result);
                                    console.groupEnd();
                                }
                                if (result !== null && typeof result == 'object') {
                                    if (typeof result.data == 'object'
                                        && (typeof result.data_columns == 'object' || result.data.rowsCollapsed)) {
                                        result = uncollapseData(result);
                                        if (dataIsObj && result.data) {
                                            result.data = Object.entries(result.data);
                                        }
                                    }
                                    // Приведем к старому формату rows
                                    if (item.request.isNotApi202205 && Array.isArray((_b = result.data) === null || _b === void 0 ? void 0 : _b.rows) && ((_c = result === null || result === void 0 ? void 0 : result.data) === null || _c === void 0 ? void 0 : _c.additionalData)) {
                                        result.data_columns = result.data.additionalData.data_columns;
                                        result.extra_data = result.data.additionalData;
                                        result.data = result.data.rows;
                                    }
                                    // Приведем к старому формату данные возвращенные черег объект
                                    if (item.request.isNotApi202205
                                        && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
                                        var resData_1 = __assign({}, result.data);
                                        Object.keys(resData_1).forEach(function (key) {
                                            result[key] = resData_1[key];
                                        });
                                    }
                                }
                                else {
                                    var primal_res = result;
                                    result = {
                                        code: -888,
                                        toastr: {
                                            type: 'error',
                                            title: 'Error',
                                            message: 'The response is null or not an object'
                                        },
                                        results: [primal_res]
                                    };
                                }
                                resultData = (result === null || result === void 0 ? void 0 : result.data) || result;
                                if (result.code === 10) {
                                    // SERVER EXAMPLE
                                    //var confirm = obj.confirm;
                                    //if (!confirm){
                                    //    return new UserError('needConfirm', {message: 'Это тестовый confirm. Напишите "ВАСЯ"',title:'Подтвердите действие', confirmType:'dialog',responseType:'text'});
                                    //}else if (confirm!='ВАСЯ'){
                                    //    return new UserOk('Не верно вверено контрольное значение. Запрос отклонен.',{type:'info'})
                                    //}
                                    //return new UserOk('Все ок')
                                    // END SERVER EXAMPLE
                                    // Если не браузер, росто передадим дальше
                                    if (_this.env !== 'browser') {
                                        item.callback(result);
                                        _this.socketQuery_stack.removeItem(callback_id);
                                        return false;
                                    }
                                    item.request.params.confirmKey = resultData.confirmKey || resultData.key;
                                    var cancelMsg = (_d = resultData.cancelMsg) !== null && _d !== void 0 ? _d : getMsg('cancelMsg');
                                    var okBtnText = (_e = resultData.okBtnText) !== null && _e !== void 0 ? _e : getMsg('okBtnText');
                                    var cancelBtnText = (_f = resultData.cancelBtnText) !== null && _f !== void 0 ? _f : getMsg('cancelBtnText');
                                    switch (resultData.confirmType) {
                                        case 'dialog':
                                            if (!bootbox || typeof bootbox.dialog !== 'function') {
                                                console.warn('bootbox.dialog is not installed (is not a function)');
                                                break;
                                            }
                                            var html = '';
                                            if (resultData.responseType == 'text') {
                                                html = ((_g = resultData === null || resultData === void 0 ? void 0 : resultData.message) !== null && _g !== void 0 ? _g : result.toastr.message) +
                                                    '<input style="margin-top: 10px;" type="text" ' +
                                                    'class="form-control" id="server-confirm-input" />';
                                            }
                                            else {
                                                html = ((_h = resultData === null || resultData === void 0 ? void 0 : resultData.message) !== null && _h !== void 0 ? _h : result.toastr.message);
                                            }
                                            var bbd1_1 = bootbox.dialog({
                                                title: (_j = resultData === null || resultData === void 0 ? void 0 : resultData.title) !== null && _j !== void 0 ? _j : result.toastr.title,
                                                message: html,
                                                buttons: {
                                                    success: {
                                                        label: okBtnText,
                                                        callback: function () {
                                                            if (resultData.responseType === 'text') {
                                                                item.request.params.confirm = $('#server-confirm-input').val();
                                                            }
                                                            else if (resultData.responseType === 'custom') {
                                                                var resObj_1 = {};
                                                                bbd1_1
                                                                    .find(resultData.inputsClass ? '.' + resultData.inputsClass : '.server-confirm-input')
                                                                    .each(function (index) {
                                                                    switch ($(this).attr('type')) {
                                                                        case 'checkbox':
                                                                            resObj_1[$(this).attr('id')] = $(this).attr('checked') === 'checked';
                                                                            break;
                                                                        default:
                                                                            resObj_1[$(this).attr('id')] = $(this).val('checked');
                                                                            break;
                                                                    }
                                                                });
                                                                item.request.params.confirm = resObj_1;
                                                            }
                                                            else {
                                                                item.request.params.confirm = true;
                                                            }
                                                            _this.do(item.request, item.callback);
                                                        }
                                                    },
                                                    error: {
                                                        label: cancelBtnText,
                                                        callback: function () {
                                                            if (toastr && typeof toastr['info'] === 'function') {
                                                                toastr['info'](cancelMsg);
                                                            }
                                                            item.callback(result);
                                                        }
                                                    }
                                                }
                                            });
                                            break;
                                        case 'date':
                                            break;
                                        default:
                                            if (!toastr || typeof toastr[result.toastr.type] !== 'function') {
                                                console.warn("toastr is not available or unknown type of toastr: ".concat(result.toastr.type));
                                                break;
                                            }
                                            if (!document) {
                                                console.warn("document not available");
                                                break;
                                            }
                                            var btnGuid = Date.now() + '_' + Math.random();
                                            toastr[result.toastr.type](result.toastr.message +
                                                '<div style="width: 100%;"><button id="confirm_socket_query_' + btnGuid +
                                                '" type="button" class="btn clear">' +
                                                getMsg('okBtnTextDefault') +
                                                '</button> <button id="cancel_socket_query_' +
                                                btnGuid + '" type="button" class="btn clear">' +
                                                getMsg('cancelBtnText') +
                                                '</button></div>', '', {
                                                "closeButton": false,
                                                "debug": false,
                                                "newestOnTop": false,
                                                "progressBar": false,
                                                "positionClass": "toast-bottom-right",
                                                "preventDuplicates": false,
                                                "onclick": null,
                                                "showDuration": "300",
                                                "hideDuration": "1000",
                                                "timeOut": 0,
                                                "extendedTimeOut": 0,
                                                "showEasing": "swing",
                                                "hideEasing": "linear",
                                                "showMethod": "fadeIn",
                                                "hideMethod": "fadeOut",
                                                "tapToDismiss": false
                                            });
                                            var confirmBtn = document.getElementById('confirm_socket_query_' + btnGuid);
                                            confirmBtn.addEventListener('click', function (e) {
                                                item.request.params.confirm = true;
                                                setTimeout(function () {
                                                    toastr.clear();
                                                }, 1000);
                                                _this.do(item.request, item.callback);
                                            });
                                            var cancelBtn = document.getElementById('cancel_socket_query_' + btnGuid);
                                            cancelBtn.addEventListener('click', function (e) {
                                                toastr['info'](cancelMsg);
                                                setTimeout(function () {
                                                    toastr.clear();
                                                }, 1000);
                                                item.callback(result);
                                            });
                                            break;
                                    }
                                    _this.socketQuery_stack.removeItem(callback_id);
                                    return false;
                                }
                                if (resultData.system_download_now) {
                                    if (!document) {
                                        console.warn("document not available");
                                    }
                                    else {
                                        var linkName = 'my_download_link' + Date.now() + '_' + Math.random();
                                        var nameRu = resultData.name_ru || resultData.filename;
                                        var body_ = document.getElementsByTagName('body')[0];
                                        var a = document.createElement('a');
                                        a.setAttribute('id', linkName);
                                        a.setAttribute('href', resultData.path + resultData.filename);
                                        a.setAttribute('download', nameRu);
                                        a.setAttribute('style', "display:none;");
                                        body_.appendChild(a);
                                        a.click();
                                        a.remove();
                                    }
                                }
                                item.callback(result);
                            }
                            _this.socketQuery_stack.removeItem(callback_id);
                        });
                        this.socket.on('socketQueryCallbackError', function (err) {
                            console.log('socketQueryCallbackError==>', err);
                        });
                        this.socket.on('logout', function () {
                            _this.auth();
                        });
                        this.socket.on('toMain', function () {
                            var args = [];
                            for (var _i = 0; _i < arguments.length; _i++) {
                                args[_i] = arguments[_i];
                            }
                            if (typeof _this.toMainFunction === "function")
                                _this.toMainFunction.apply(_this, args);
                        });
                        this.socket.on('log', function (data) {
                            console.log('---SERVER--LOG--->', data);
                        });
                        // this.ws_status = WS_CONNECTED
                        if (typeof this.afterInitConnect === 'function') {
                            this.afterInitConnect(this.socket);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Query.prototype.queryWS = function () {
        return __awaiter(this, arguments, void 0, function (obj) {
            var _this = this;
            if (obj === void 0) { obj = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.debugFull)
                            console.log('queryWS== ws_status:', this.ws_status);
                        if (!(this.ws_status !== WS_CONNECTED)) return [3 /*break*/, 2];
                        if (this.ws_status !== WS_CONNECTING) {
                            // Надо заинитьить сокет
                            this.connectSocket();
                        }
                        if (this.debugFull)
                            console.log('Socket not ready now', this.ws_status);
                        return [4 /*yield*/, new Promise(function (resolve) {
                                _this.tryConnectCnt++;
                                if (_this.tryConnectCnt > 70) { // После 30с
                                    if (_this.tryConnectTimeout !== 5000) {
                                        _this.tryConnectTimeout = 5000;
                                        if (_this.debugFull)
                                            console.log('tryConnectTimeout changed to 5000');
                                    }
                                }
                                else if (_this.tryConnectCnt > 65) { // После 10с
                                    if (_this.tryConnectTimeout !== 1000) {
                                        _this.tryConnectTimeout = 1000;
                                        if (_this.debugFull)
                                            console.log('tryConnectTimeout changed to 1000');
                                    }
                                }
                                else if (_this.tryConnectCnt > 55) { // После 5с
                                    if (_this.tryConnectTimeout !== 500) {
                                        _this.tryConnectTimeout = 500;
                                        if (_this.debugFull)
                                            console.log('tryConnectTimeout changed to 500');
                                    }
                                }
                                else if (_this.tryConnectCnt > 40) { // После 2с
                                    if (_this.tryConnectTimeout !== 200) {
                                        _this.tryConnectTimeout = 200;
                                        if (_this.debugFull)
                                            console.log('tryConnectTimeout changed to 200');
                                    }
                                }
                                setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                    var _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _a = resolve;
                                                return [4 /*yield*/, this.queryWS(obj)];
                                            case 1:
                                                _a.apply(void 0, [_b.sent()]);
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }, _this.tryConnectTimeout || 50);
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        // Сбросим значения
                        if (this.tryConnectCnt) {
                            this.tryConnectCnt = 0;
                            this.tryConnectTimeout = 50;
                        }
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                _this.socketQuery(obj, function (res) {
                                    if (_this.debugFull)
                                        console.log('GO_CORE_QUERY:this.socketQuery:res==>', res);
                                    resolve(res);
                                });
                            })];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Query.prototype.auth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var o, counter, tryQ;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.status = IN_AUTH;
                        if (!this.autoAuth) {
                            if (typeof this.authFunction === 'function') {
                                this.authFunction({}, function (err) {
                                    if (err) {
                                        if (_this.debug)
                                            console.log('authFunction return error:', err);
                                        _this.status = NO_AUTH;
                                        return;
                                    }
                                    _this.status = READY;
                                });
                            }
                            return [2 /*return*/];
                        }
                        o = {
                            command: 'login',
                            object: 'User',
                            params: {
                                login: this.login,
                                password: this.password
                            }
                        };
                        counter = 0;
                        tryQ = function () { return __awaiter(_this, void 0, void 0, function () {
                            var authRes, e_2;
                            var _this = this;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 6]);
                                        return [4 /*yield*/, this.query(o)];
                                    case 1:
                                        authRes = _b.sent();
                                        if (this.debugFull)
                                            console.log('GO_CORE_QUERY:auth:res==>', authRes);
                                        if (authRes.code) {
                                            this.status = AUTH_ERROR;
                                            this.auth_response = authRes;
                                            setTimeout(function () {
                                                _this.status = NO_AUTH;
                                                _this.auth_response = null;
                                            }, 30000);
                                            return [2 /*return*/];
                                        }
                                        this.token = ((_a = authRes === null || authRes === void 0 ? void 0 : authRes.data) === null || _a === void 0 ? void 0 : _a.token) || (authRes === null || authRes === void 0 ? void 0 : authRes.token);
                                        this.status = READY;
                                        return [2 /*return*/, authRes];
                                    case 2:
                                        e_2 = _b.sent();
                                        counter++;
                                        if (!(counter <= this.tryAuthCount)) return [3 /*break*/, 4];
                                        console.log("Error while do auth query. Try:".concat(counter, " of ").concat(this.tryAuthCount, ". Wait ").concat(this.tryAuthPause));
                                        return [4 /*yield*/, new Promise(function (resolve) {
                                                setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                                    var _a;
                                                    return __generator(this, function (_b) {
                                                        switch (_b.label) {
                                                            case 0:
                                                                _a = resolve;
                                                                return [4 /*yield*/, tryQ()];
                                                            case 1:
                                                                _a.apply(void 0, [_b.sent()]);
                                                                return [2 /*return*/];
                                                        }
                                                    });
                                                }); }, _this.tryAuthPause);
                                            })];
                                    case 3:
                                        authRes = _b.sent();
                                        return [2 /*return*/, authRes];
                                    case 4:
                                        console.log("Error while do auth query. Finish", e_2);
                                        this.status = ERROR;
                                        this.auth_response = e_2;
                                        setTimeout(function () {
                                            _this.status = NO_AUTH;
                                            _this.auth_response = null;
                                        }, 3000);
                                        return [2 /*return*/, e_2];
                                    case 5: return [3 /*break*/, 6];
                                    case 6: return [2 /*return*/];
                                }
                            });
                        }); };
                        return [4 /*yield*/, tryQ()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Query.prototype.toMain = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (typeof this.toMainFunction === 'function') {
                    this.toMainFunction.apply(this, args);
                }
                return [2 /*return*/];
            });
        });
    };
    Query.prototype.do = function (obj, cb) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (typeof cb === 'function') {
                            return [2 /*return*/, tryDo.call(this, obj, function (err, res) {
                                    try {
                                        cb(err || res);
                                    }
                                    catch (e) {
                                        console.error('Error in callback function after execution go_core_query', obj);
                                        console.error(e);
                                    }
                                })];
                        }
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                // Здесь используем коллбек функцию, так как с помощью async/await делать рекурсивную асинхронную функцию
                                // менее удобно. Соответственно await перед tryDo оускаем
                                tryDo.call(_this, obj, function (err, res) {
                                    if (err)
                                        return reject(err);
                                    resolve(res);
                                });
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return Query;
}());
function init(params) {
    if (params === void 0) { params = {}; }
    var query_ = new Query(__assign({}, params));
    // const o2 = {
    //     command: 'get_me',
    //     object: 'User',
    //     params: {}
    // }
    // query_.do(o2, (r)=>{
    //     console.log('r', r)
    //     debugger;
    //     throw 'dasd'
    // })
    // const me = await query_.do(o2)
    //
    // console.log('Me', me)
    // console.log('query_.do==>', typeof query_.do)
    return { api: query_.do.bind(query_), instance: query_ };
}
exports.default = init;
// @ts-ignore
globalObj === null || globalObj === void 0 ? void 0 : globalObj.initGoCoreQuery = init;
