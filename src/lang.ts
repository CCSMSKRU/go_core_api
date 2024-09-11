/*
 * Complex Cloud Solutions, LLC (ccs.msk.ru)
 * Ivan Goptarev,
 * With possible, negligent participation of  claude.ai  and/or ChatGPT
 * Copyright (c) 2024.
 * Powered by GoCore (go-core.com)
 */

import {langObj} from "./langData"

export interface ILangObj {
    [msgAlias: string]: {
        msg: string;
        msg_ru?: string
        [msg_lang: string]: string
    }
}

export const getMsg = (msgAlias: string, lang: string = 'en'): string => {
    if (!langObj[msgAlias]) return msgAlias
    return langObj[msgAlias][`msg_${lang}`] ?? langObj[msgAlias][`msg`] ?? msgAlias
}