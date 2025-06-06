"use strict";
/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Ivan Goptarev,
 * With possible, negligent participation of  claude.ai  and/or ChatGPT
 * Copyright (c) 2024.
 * Powered by GoCore (go-core.com)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMsg = void 0;
var langData_1 = require("./langData");
var getMsg = function (msgAlias, lang) {
    var _a, _b;
    if (lang === void 0) { lang = "en"; }
    if (!langData_1.langObj[msgAlias])
        return msgAlias;
    return (_b = (_a = langData_1.langObj[msgAlias]["msg_".concat(lang)]) !== null && _a !== void 0 ? _a : langData_1.langObj[msgAlias].msg) !== null && _b !== void 0 ? _b : msgAlias;
};
exports.getMsg = getMsg;
