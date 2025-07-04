import {io, Socket} from "socket.io-client"
import {QueryOptions, QueryParams, QueryStack, QueryStorage} from "./models"
import {getMsg as getMsg_} from "./lang"
import {v4 as uuidv4} from 'uuid'

function getMsg(msgAlias: string, lang?: string): string {
    return getMsg_(msgAlias, lang || this?.lang)
}


const WS_NOT_CONNECTED = 'WS_NOT_CONNECTED'
const WS_CONNECTED = 'WS_CONNECTED'
const WS_CONNECTING = 'WS_CONNECTING'

const NO_AUTH = 'NO_AUTH'
const IN_AUTH = 'IN_AUTH'
const READY = 'READY'
const AUTH_ERROR = 'AUTH_ERROR'
const ERROR = 'ERROR'

const uncollapseData = function (obj) {
    if (obj?.data?.rowsCollapsed) {
        obj.data.rows = obj.data.rowsCollapsed.rows.map(rowArr => {
            const rowObj = {}
            rowArr.forEach((val, i) => {
                rowObj[obj.data.rowsCollapsed.columns[i]] = val
            })
            return rowObj
        })
        return obj
    }
    if (!Array.isArray(obj.data) || !obj.data_columns) return obj
    var data = obj.data
    var res = obj
    // for (var key in Object.keys(obj)) {
    //     if (key === 'data') continue
    //     res[key] = obj[key]
    // }
    if (!data.length) return res

    if (Object.keys(data[0]).join('') === obj.data_columns.join('')) return res

    var newData = []
    for (var rowIndex in Object.keys(data)) {
        var row = {}
        for (var columnIndex in Object.keys(obj.data_columns)) {
            var columnName = obj.data_columns[columnIndex]
            row[columnName] = data[rowIndex][columnIndex]
        }
        newData.push(row)
    }
    res.data = newData
    return res

}

const getCookie = (name) => {
    const val = document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=')
        return parts[0] === name ? decodeURIComponent(parts[1]) : r
    }, '')
    if (val === 'undefined' || val === 'null') return null
    return val
}

function tryDo(obj, cb) {

    // Если уже определена ошибка (либо во время авторизации либо во время выполнения запроса), то
    // Отклоняем все запросы. Позже эта ошибка будет сброшена
    if (this.status === ERROR) {
        if (this.debugFull) console.log('Server error. Finish', this.response)
        return cb(null, this.auth_response)
    }

    if (this.status === AUTH_ERROR) {
        if (this.debugFull) console.log('Error in auth process. Finish', this.auth_response)
        return cb(null, this.auth_response)
    }

    // Запускаем авторизацию и вызываем запрос заново (он попадет в цикл ожидание пока авторизация не пройдет)
    if (this.status === NO_AUTH) {
        if (this.debugFull) console.log('Not authorized yet. Start process and call request again',
            {obj, res: this.response})
        this.auth()
        if (!this.autoAuth) return cb(null, this.response)
        return tryDo.call(this, obj, cb)
    }

    // Производится авторизация, немного ждем и вызываем заново. Таким образом рано или поздно статус изменется
    if (this.status === IN_AUTH) {
        if (this.debugFull) console.log('Still in auth process. Wait', {res: this.response})
        setTimeout(() => {
            if (!this.autoAuth) {
                this.status = NO_AUTH
                return cb(null, this.response)
            }
            tryDo.call(this, obj, cb)
        }, 100)
        return
    }


    if (this.status === READY) {
        if (this.debugFull) console.log('Status READY. Run query.', obj)
        let res
        let counter = 0

        const q = async () => {
            try {
                res = await this.query(obj)
                this.response = res
                if (res.code) {
                    // Сессия стухла
                    if (res.code === -4) {
                        // if (!this.autoAuth) return cb(null, res)
                        this.status = NO_AUTH
                        return tryDo.call(this, obj, cb)
                    }
                    // Логическая ошибка
                    return cb(null, res)
                }

                // Установим токен если это был запрос авторизации
                if (!this.skipSetTokenOnLogin
                    && obj.command === this.loginCommand
                    && obj.object?.toLowerCase() === this.loginObject) {

                    const tkn = res?.data
                        ? res.data[this.loginTokenFieldName]
                        : res[this.loginTokenFieldName]
                    if (tkn) {
                        this.token = tkn

                        if (this.socket) this.socket.auth.token = this.token
                        this.storage.set(this.tokenStorageKey, this.token)
                    }
                }

                return cb(null, res)
            } catch (e) {
                // Произошла некая ошибка при запросе (например пропало соединение с сервером)
                // Будем повторять несколько раз, прежде чем выдать ошибку
                counter++
                if (counter <= this.tryCount) {
                    console.log(`Error while do query. Try:${counter} of ${this.tryCount}. Wait ${this.tryPause}`, e)
                    res = await new Promise((resolve) => {
                        setTimeout(async () => {
                            resolve(await q())
                        }, this.tryPause)
                    })
                    return res
                } else {
                    console.log(`Error while do query. Finish`, e)
                    this.status = ERROR
                    this.response = e
                    setTimeout(() => {
                        // Вернем в состояние готового (подключение могло восстановиться)
                        this.status = READY
                        this.response = null
                    }, 3000)

                    return cb(null, {
                        code: 500,
                        e,
                        message: 'Server is not available'
                    })

                }
            }
        }

        q()
    } else {
        return cb(new Error(`Unknown status: ${this.status}`))
    }

}

const isWindow = (typeof window === 'object' && window)
const globalObj = isWindow ? window : {}

// @ts-ignore
let toastr = isWindow ? globalObj?.toastr : undefined
// @ts-ignore
let bootbox = isWindow ? globalObj?.bootbox : undefined

// // @ts-ignore
// let $ = window?.$

class Query {
    lang: string
    https: boolean
    host: string
    port: number
    url: string
    useAJAX: unknown
    connectHost: string | null
    extraHeaders: unknown
    transports: unknown
    withCredentials: boolean
    device_type: string
    device_info: unknown
    socketQuery_stack: QueryStack
    env: string
    autoAuth: boolean
    authFunction: unknown
    toMainFunction: unknown
    afterInitConnect: unknown
    token: string
    login: string
    password: string
    storeGetFn: (key: string) => Promise<string|null>
    storeSetFn: unknown
    browserStorage: string
    tokenStorageKey: string
    uuidStorageKey: string
    uuidAgreeStorageKey: string
    storage: QueryStorage
    ws_status: string
    auth_response: unknown | null
    tryAuthCount: number
    tryAuthPause: number
    tryCount: number
    tryPause: number
    debug: unknown
    debugFull: unknown
    doNotDeleteCollapseDataParam: unknown
    status: string

    socket: Socket

    tryConnectCnt: number
    tryConnectTimeout: number

    oldSocketId?: string
    loginCommand: string
    loginObject: string
    loginTokenFieldName: string
    skipSetTokenOnLogin: boolean
    /** При использовании uuid и передаче его на сервер, может потребоваться согласие пользователя
     * на использование такого рода куков. Это зависит от сценариев использования.
     * Например, для аналитики требуется такое согласие.
     * */
    useUUID?: boolean
    uuid?: string
    private params: QueryParams
    private useUUIDIgnoreAgree: boolean
    private useUUIDAskAgreeFn: (cb: (result: boolean) => void) => void
    private useUUIDIgnoreAgreeStorageKey?: string
    private useUUIDIsAgree: string | boolean
    private inAuthStarted: number

    constructor(params?: QueryParams) {
        if (!params) params = {} as QueryParams

        // Save params (for reInit)
        this.params = params

        this.lang = params.lang || 'en'
        getMsg.bind(this)

        this.https = typeof params.https !== 'undefined' ? params.https : true
        this.host = (params.host || '').replace(/\/$/, '')

        const defaultPort = this.https ? 443 : 80
        this.port = !isNaN(+params.port)
            ? (+params.port || defaultPort)
            : defaultPort
        this.url = typeof params.url !== 'undefined'
            ? params.url
            : typeof params.path !== 'undefined'
                ? params.path
                // : '/api'
                : ''

        this.useAJAX = params.useAJAX

        // this.connectHost = this.host
        //     ? this.useAJAX
        //         ? `${this.https ? 'https' : 'http'}://${this.host}:${this.port}`
        //         : `${this.https ? 'wss' : 'ws'}://${this.host}:${this.port}`
        //     : null

        this.connectHost = this.host
            ? `${this.https ? 'https' : 'http'}://${this.host}:${this.port}`
            : null

        this.extraHeaders = params.extraHeaders
        this.transports = params.transports
        this.withCredentials = params.withCredentials


        this.device_type = params.device_type || 'BROWSER'
        this.device_info = params.device_info

        this.socketQuery_stack = {
            items: {},
            getItem: function (id) {
                return this.items[id]
            },
            addItem: function (cb, obj) {
                var id = Date.now() + '_' + Math.random()
                this.items[id] = {
                    callback: cb,
                    request: obj,
                    time: Date.now()
                }

                return id
            },
            removeItem: function (id) {
                delete this.items[id]
            }
        }

        this.env = params.env || 'browser'

        this.token = params.token
        this.autoAuth = typeof params.autoAuth !== "undefined" ? params.autoAuth : false
        // Можно передать и тогда она будет вызываться если надо авторизоваться, при условии что autoAuth = false
        this.authFunction = params.authFunction || params.authFn
        this.toMainFunction = params.toMainFunction || params.toMainFn
        this.afterInitConnect = params.afterInitConnect

        this.login = params.login || 'api_test'
        this.password = params.password || 'api_test_password'

        this.storeGetFn = params.storeGetFn
        this.storeSetFn = params.storeSetFn
        const availableBrowserStorages = ['cookie', 'localStorage']
        this.browserStorage = availableBrowserStorages.includes(params.browserStorage)
            ? params.browserStorage
            : 'cookie'

        this.tokenStorageKey = params.tokenStorageKey || 'CCSGoCoreToken'

        /** При использовании uuid и передаче его на сервер, может потребоваться согласие пользователя
         * на использование такого рода куков. Это зависит от сценариев использования.
         * Например, для аналитики требуется такое согласие.
         * */
        this.uuidStorageKey = params.uuidStorageKey || 'goCoreUUID'
        this.uuidAgreeStorageKey = params.uuidAgreeStorageKey || 'goCoreUUIDAgree'
        this.useUUIDIgnoreAgreeStorageKey = params.useUUIDIgnoreAgreeStorageKey || 'goCoreUUIDIgnoreAgree'
        this.useUUID = params.useUUID
        this.useUUIDIgnoreAgree = params.useUUIDIgnoreAgree
        this.uuid = null

        this.useUUIDAskAgreeFn = params.useUUIDAskAgreeFn || ((cb) => {
            console.error('useUUIDAskAgreeFn is not defined. ' +
                '\nSignature: (cb: () => boolean) => void.' +
                '\n\nIf you want to use UUID, you need to define this function or set "useUUIDIgnoreAgree" param to true.' +
                '\n\nYou can also make an empty function:' +
                '\n(cb)=>{cb(false)} ' +
                '\nand request consent later ' +
                'and call setUUIDAgree function.' +
                '\nProcess will be continued without UUID')
            cb(false)
        })

        this.skipSetTokenOnLogin = params.skipSetTokenOnLogin
        this.loginCommand = params.loginCommand || 'login'
        this.loginObject = params.loginObject ? String(params.loginObject).toLowerCase() : 'user'
        this.loginTokenFieldName = params.loginTokenFieldName || 'token'

        this.storage = {
            get: async (key) => {
                if (typeof this.storeGetFn === 'function') return await this.storeGetFn(key)
                if (this.env === 'browser') {
                    if (this.browserStorage === 'cookie') {
                        // var re = new RegExp("(?:(?:^|.*;\s*)" + key + "\s*\=\s*([^;]*).*$)|^.*$")
                        // return document.cookie.replace(re, "$1")
                        return getCookie(key)
                    } else if (this.browserStorage === 'localStorage') {
                        console.warn('Functionality in development (storage - get - localStorage)')
                    } else {
                        console.warn('Unknown type of browserStorage. Available:', availableBrowserStorages.join(','))
                    }
                }
                return null
            },
            set: async (key, val) => {
                const old = await this.storage.get(key)
                if (old === val) {
                    if (this.debugFull) console.log('this.storage.set: new token equal old', key, val)
                    return
                }

                if (this.debugFull) console.log('this.storage.set: SET (key, old, new)', key, old, val)

                if (typeof this.storeSetFn === 'function') return await this.storeSetFn(key, val)
                if (this.env === 'browser') {
                    if (this.browserStorage === 'cookie') {
                        document.cookie = `${key}=${val}`
                    } else if (this.browserStorage === 'localStorage') {
                        console.warn('Functionality in development (storage - set - localStorage)')
                    } else {
                        console.warn('Unknown type of browserStorage. Available:', availableBrowserStorages.join(','))
                    }
                }
            }
        }


        this.ws_status = WS_NOT_CONNECTED
        this.auth_response = null
        this.tryAuthCount = params.tryAuthCount || 10
        this.tryAuthPause = params.tryAuthPause || 500

        this.tryCount = params.tryCount || 10
        this.tryPause = params.tryPause || 500

        this.debug = params.debug
        this.debugFull = params.debugFull
        this.doNotDeleteCollapseDataParam = params.doNotDeleteCollapseDataParam

        this.status = this.token || !this.autoAuth ? READY : NO_AUTH

        // Будем плавно увеличивать таймаут, если сразу не удается подключиться.
        // Сбросим после успешного подключения
        this.tryConnectCnt = 0
        this.tryConnectTimeout = 50

        this.init().then().catch(e => {
            console.error('ERROR:GoCoreQuery:init:', e)
        })


    }

    private async setUUID(): Promise<string | null> {
        let uuid

        this.useUUIDIsAgree = await this.storage.get(this.uuidAgreeStorageKey)

        if (this.useUUID) {

            // загрузим useUUIDIgnoreAgree
            const useUUIDIgnoreAgree = await this.storage.get(this.useUUIDIgnoreAgreeStorageKey)
            if (useUUIDIgnoreAgree !== null) {
                this.useUUIDIgnoreAgree = useUUIDIgnoreAgree
            }


            // Сохраним uuid если его еще нет. Но сперва проверим согласие пользователя
            const set = async () => {
                uuid = await this.storage.get(this.uuidStorageKey)
                if (!uuid) {
                    uuid = uuidv4()
                    await this.storage.set(this.uuidStorageKey, uuid)
                }
                this.uuid = uuid

                // save useUUIDIgnoreAgree
                const ignore = await this.storage.get(this.useUUIDIgnoreAgreeStorageKey)
                if (ignore !== this.useUUIDIgnoreAgree) {
                    await this.storage.set(this.useUUIDIgnoreAgreeStorageKey, this.useUUIDIgnoreAgree)
                }

            }

            if (this.useUUIDIgnoreAgree) {
                await set()
            } else {
                const agree = this.useUUIDIsAgree
                if (agree === false || agree === 'false') {
                    return null
                }

                if (agree) {
                    await set()
                } else {
                    if (typeof this.useUUIDAskAgreeFn !== 'function') {
                        console.error('useUUIDAskAgreeFn is not defined. Signature: (cb: () => boolean) => void.' +
                            '\nIf you want to use UUID, you need to define this function or set "useUUIDIgnoreAgree" param to true.')
                        console.log('Process will be continued without UUID')
                    } else {
                        // Вызов с обработкой результата
                        const agree = await new Promise<boolean>((resolve) => {
                            this.useUUIDAskAgreeFn((isAgree) => {
                                resolve(isAgree)  // Передаем результат в промис
                            })
                        })

                        if (agree) {
                            await this.storage.set(this.uuidAgreeStorageKey, true)
                            await set()
                        } else {
                            uuid = null
                        }
                    }

                }
            }
        } else {
            await this.storage.set(this.uuidStorageKey, null)
        }
        return uuid
    }

    async setUUIDAgree(agree: boolean, reInit: boolean = true) {
        if (this.debug) console.log('setUUIDAgree:', {agree, reInit})
        await this.storage.set(this.uuidAgreeStorageKey, agree)
        if (reInit) {
            await this.reInit()
        }
    }

    async setUUIDIgnoreAgree(ignoreAgree: boolean | null, reInit: boolean = true) {
        if (this.debug) console.log('setUUIDIgnoreAgree:', {agree: ignoreAgree, reInit})
        await this.storage.set(this.useUUIDIgnoreAgreeStorageKey, ignoreAgree)
        if (reInit) {
            await this.reInit()
        }
    }


    async reDefineParams(params: QueryParams, reInit: boolean = true) {
        if (this.debug) console.log('reDefineParams: to change:', params)
        this.params = {...this.params, ...params}
        if (this.debug) console.log('reDefineParams: complete params:', this.params)
        if (reInit) {
            if (this.debug) console.log('reDefineParams => REINIT')
            await this.reInit()
        }
    }

    async init() {
        this.token = this.token || await this.storage.get(this.tokenStorageKey)

        if (this.debugFull) console.log('IN init(): INFO==>', {token: this.token})

        if (!this.useAJAX) {
            this.connectSocket()
        }
    }

    async destroy() {
        if (this.socket) {
            this.socket?.removeAllListeners()
            this.socket?.disconnect()
            this.socket?.close()
        }
        this.socket = null
        // await new Promise(cb=>setTimeout(cb, 5000))
    }

    async reInit() {
        if (this.debug) console.log('REINIT')
        await this.destroy()
        this.constructor(this.params)
        // await this.init()
        if (this.debug) console.log('REINITED!')
    }

    async query(obj = {}) {
        return this.useAJAX
            ? await this.queryAJAX(obj)
            : await this.queryWS(obj)
    }

    async queryAJAX(obj = {}) {
        const httpS = this.https ? require('https') : require('http')
        const data = JSON.stringify(obj)

        const options = {
            hostname: this.host,
            port: this.port,
            path: this.url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'Authorization': `Bearer ${this.token}`
            }
        }
        // if (this.cookie){
        //     options.headers['Set-Cookie'] = this.cookie
        // }

        return await new Promise((resolve, reject) => {

            const req = httpS.request(options, res => {

                res.setEncoding('utf8')
                let rawData = ''
                res.on('data', (chunk) => {
                    rawData += chunk
                })
                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(rawData)
                        resolve(parsedData)
                    } catch (e) {
                        console.error(e.message)
                        reject(e)
                    }
                })
            })

            req.on('error', error => {
                console.error(error)
                reject(error)
            })

            req.write(data)
            req.end()
        })

    }

    socketQuery(obj, cb) {

        if (this.debug) {
            var alias = ' ➢ ' + obj.object + ' ➢ ' + obj.command + '    '
            console.groupCollapsed('%c ' + alias, 'background: #35ff4829; color: #000')
            console.log(obj)
            console.groupEnd()
            if (!this.doNotDeleteCollapseDataParam && obj.params && typeof obj.params.collapseData !== 'undefined') {
                console.warn('%c ' + alias + 'The client cannot pass the collapseData parameter. ' +
                    'You need to fix the method so that it does not use it. ' +
                    '\nThe collapseData parameter has been deleted and will not be passed!',
                    'background: #ffa482; color: #000')
                delete obj.params.collapseData
            }
        }
        let id
        if (typeof cb === "function") {
            id = this.socketQuery_stack.addItem(cb, obj)
        }
        this.socket?.emit('socketQuery', obj, id)
    }

    async connectSocket() {
        if (this.ws_status !== WS_NOT_CONNECTED) {
            return
        }
        this.ws_status = WS_CONNECTING

        if (!this.token) this.token = await this.storage.get(this.tokenStorageKey)

        const timeZoneOffset = new Date().getTimezoneOffset()

        const options: QueryOptions = {
            path: this.url.replace(/\/$/, ''),
            query: {
                type: 'WEB', // deprecated
                device_type: this.device_type,
                device_info: this.device_info,
                timeZoneOffset
            },
            // withCredentials:true,
            auth: {
                token: this.token
            }
        }
        if (this.useUUID) {
            await this.setUUID()
            if (this.uuid) options.query.uuid = this.uuid
        }

        if (typeof this.extraHeaders !== "undefined") {
            options.extraHeaders = this.extraHeaders
        }

        if (typeof this.transports !== "undefined") {
            options.transports = this.transports
        }

        if (typeof this.withCredentials !== "undefined") {
            options.withCredentials = this.withCredentials
        }

        if (this.debugFull) console.log('connectSocket', this.connectHost, options)
        this.socket = this.connectHost
            ? io(this.connectHost, options)
            : io(options)

        // ========= SET WS Handlers =======================

        this.socket.on("connect", async () => {
            this.token = await this.storage.get(this.tokenStorageKey)
            if (this.socket) (this.socket.auth as { token?: string }).token = this.token

            if (this.debug) console.log('CONNECTED')
            this.ws_status = WS_CONNECTED

            if (this.oldSocketId) {
                this.socket?.emit('setOldSocketId', this.oldSocketId)
            }
            this.oldSocketId = this.socket?.id

            // let oldSockets = await this.storage.get('oldSockets') || []
            // if (!oldSockets.includes(this.socket.id)) oldSockets.push(this.socket.id)
            // // Сократим число хранимых старых сокетов до 20
            // if (oldSockets.length > 20) oldSockets = oldSockets.splice(-20)
            // await this.storage.set('oldSockets', oldSockets)

        })

        this.socket.on("disconnect", async (reason) => {
            this.token = await this.storage.get(this.tokenStorageKey)
            if (this.socket) (this.socket.auth as { token?: string }).token = this.token

            if (this.debug) console.log('SOCKET DISCONNECT', reason)
            // this.ws_status = WS_NOT_CONNECTED
            // if (reason === 'io client disconnect'){
            //     // this.connectSocket()
            //     this.ws_status = WS_CONNECTING
            //     this.socket.connect()
            // }
        })

        this.socket.on("connect_error", (err) => {
            if (this.debug) console.log('CONNECT_ERROR', err)
        })

        // this.socket.on("disconnect", (reason) => {
        //     if (this.debug) console.log('CONNECT_ERROR', reason)
        //     this.ws_status = WS_NOT_CONNECTED
        //     if (reason === 'io client disconnect'){
        //         this.connectSocket()
        //     }
        // });

        // store token
        this.socket.on('token', async (token) => {
            if (this.debugFull) console.log('onToken', new Date(), token)
            // console.log('update TOKEN')
            this.token = token
            if (this.socket) (this.socket.auth as { token?: string }).token = this.token
            await this.storage.set(this.tokenStorageKey, this.token)
            // this.socket.disconnect()
            // this.socket.connect()

            // if (!this.useAJAX){
            //     this.ws_status = WS_CONNECTING
            //     this.socket.disconnect()
            //     if (this.status === IN_AUTH) this.status = READY
            //     this.socket.connect()
            // }
        })

        // queryCallback

        this.socket.on('socketQueryCallback', (callback_id, result, request_time) => {
            const item = this.socketQuery_stack.getItem(callback_id)
            if (typeof item !== "object") return
            var alias = '➢ ' + item.request.object + ' ➢ ' + item.request.command + '    '
            let dataIsObj
            if (item.request.params) {
                dataIsObj = item.request.params.dataIsObj
            }

            let resultData = result?.data || result

            if (typeof result === 'object' && result !== null) {
                if (typeof result.code === 'undefined') {
                    console.log(
                        `%c ${alias}The server function must return "code". 
                        Use the standard response, for example: \nreturn new UserOk('noToastr',{data})`
                        , 'background: #ffd582; color: #000'
                    )
                }

                if (!result.toastr) {
                    result.toastr = {
                        message: 'noToastr',
                        type: 'info'
                    }
                }
                if (!result.toastr.type) {
                    result.toastr.type = 'info'
                }

                if (result.code !== 10) {
                    result.time = request_time
                    var t = result?.toastr
                    const firstUserErrMsg = result?.data?.firstUserErrMsg

                    let r_params = item.request.params || {}

                    let show_toastr = (() => {
                        if (r_params.noToastr) return false // Если есть параметр noToastr, не показываем ни в каком случае
                        // Если ответ с ошибкой, то не показываем если есть параметры noToastrError или noToastrErr
                        if (result.code) return !(r_params.noToastrError || r_params.noToastrErr)
                        return !r_params.noToastrSuccess
                    })()

                    if (typeof toastr == "object" && t
                        && t.message !== 'noToastr'
                        && t.message !== 'noToastrErr'
                        && show_toastr && !r_params.checkAccess
                        && typeof toastr[t.type] === 'function'
                    ) {
                        toastr[t.type](firstUserErrMsg || t.message, t.title)
                    }
                    if (typeof toastr == "object" && t && t.additionalMessage && typeof toastr['error'] === 'function') {
                        toastr['error'](t.additionalMessage, 'ATTENTION')
                    }

                    // if (result.code === -4) {
                    //     console.log('НЕ АВТОРИЗОВАН')
                    //     item.callback(result)
                    //     this.socketQuery_stack.removeItem(callback_id)
                    //     return false
                    // }
                }
            } else {
                console.log(`%c THE ANSWER MUST BE AN OBJECT AND NOT null.
                Use the standard response, for example,      
                return new UserOk('noToastr',{data});`, 'background: #F00; color: #fff')
                console.log('RESULT:', result)
            }

            if (typeof item.callback === "function") {

                if (this.debug) {
                    var bg = result.code
                        ? ((result.code === 10)
                            ? '#c66fbb'
                            : (result.code === 11)
                                ? '#e08f9b'
                                : '#c60000')
                        : '#2a711a'
                    console.groupCollapsed('%c ' + alias, 'background: ' + bg + '; color: #fff500')
                    console.log(item.request)
                    console.log(result)
                    console.groupEnd()
                }


                if (result !== null && typeof result == 'object') {

                    if (typeof result.data == 'object'
                        && (typeof result.data_columns == 'object' || result.data.rowsCollapsed)
                    ) {

                        result = uncollapseData(result)
                        if (dataIsObj && result.data) {
                            result.data = Object.entries(result.data)
                        }


                    }
                    // Приведем к старому формату rows
                    if (item.request.isNotApi202205 && Array.isArray(result.data?.rows) && result?.data?.additionalData) {

                        result.data_columns = result.data.additionalData.data_columns
                        result.extra_data = result.data.additionalData
                        result.data = result.data.rows

                    }

                    // Приведем к старому формату данные возвращенные черег объект
                    if (item.request.isNotApi202205
                        && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
                        const resData = {...result.data}
                        Object.keys(resData).forEach(key => {
                            result[key] = resData[key]
                        })
                    }

                } else {
                    var primal_res = result
                    result = {
                        code: -888,
                        toastr: {
                            type: 'error',
                            title: 'Error',
                            message: 'The response is null or not an object'
                        },
                        results: [primal_res]
                    }
                }

                resultData = result?.data || result


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
                    if (this.env !== 'browser') {
                        item.callback(result)
                        this.socketQuery_stack.removeItem(callback_id)
                        return false
                    }

                    item.request.params.confirmKey = resultData.confirmKey || resultData.key
                    var cancelMsg = resultData.cancelMsg ?? getMsg('cancelMsg')
                    var okBtnText = resultData.okBtnText ?? getMsg('okBtnText')
                    var cancelBtnText = resultData.cancelBtnText ?? getMsg('cancelBtnText')

                    switch (resultData.confirmType) {

                        case 'dialog':
                            if (!bootbox || typeof bootbox.dialog !== 'function') {
                                console.warn('bootbox.dialog is not installed (is not a function)')
                                break
                            }

                            var html = ''

                            if (resultData.responseType == 'text') {
                                html = (resultData?.message ?? result.toastr.message) +
                                    '<input style="margin-top: 10px;" type="text" ' +
                                    'class="form-control" id="server-confirm-input" />'
                            } else {
                                html = (resultData?.message ?? result.toastr.message)
                            }


                            const bbd1 = bootbox.dialog({
                                title: resultData?.title ?? result.toastr.title,
                                message: html,
                                buttons: {
                                    success: {
                                        label: okBtnText,
                                        callback: () => {

                                            if (resultData.responseType === 'text') {

                                                item.request.params.confirm = $('#server-confirm-input').val()

                                            } else if (resultData.responseType === 'custom') {

                                                const resObj = {}
                                                bbd1
                                                    .find(resultData.inputsClass ? '.' + resultData.inputsClass : '.server-confirm-input')
                                                    .each(function (index) {
                                                        switch ($(this).attr('type')) {
                                                            case 'checkbox':
                                                                resObj[$(this).attr('id')] = $(this).attr('checked') === 'checked'
                                                                break
                                                            default:
                                                                resObj[$(this).attr('id')] = $(this).val('checked')
                                                                break
                                                        }
                                                    })
                                                item.request.params.confirm = resObj
                                            } else {
                                                item.request.params.confirm = true
                                            }

                                            this.do(item.request, item.callback)
                                        }
                                    },
                                    error: {
                                        label: cancelBtnText,
                                        callback: function () {


                                            if (toastr && typeof toastr['info'] === 'function') {
                                                toastr['info'](cancelMsg)
                                            }
                                            item.callback(result)
                                        }
                                    }
                                }
                            })

                            bbd1.find('modal-dialog')?.addClass('server-confirm-dialog')


                            break

                        case 'date':

                            break

                        default :
                            if (!toastr || typeof toastr[result.toastr.type] !== 'function') {
                                console.warn(`toastr is not available or unknown type of toastr: ${result.toastr.type}`)
                                break
                            }

                            if (!document) {
                                console.warn(`document not available`)
                                break
                            }

                            var btnGuid = Date.now() + '_' + Math.random()

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
                            })

                            const confirmBtn = document.getElementById('confirm_socket_query_' + btnGuid)
                            confirmBtn.addEventListener('click', e => {
                                item.request.params.confirm = true
                                setTimeout(function () {
                                    toastr.clear()
                                }, 1000)
                                this.do(item.request, item.callback)
                            })

                            const cancelBtn = document.getElementById('cancel_socket_query_' + btnGuid)
                            cancelBtn.addEventListener('click', e => {
                                toastr['info'](cancelMsg)
                                setTimeout(function () {
                                    toastr.clear()
                                }, 1000)
                                item.callback(result)
                            })
                            break

                    }

                    this.socketQuery_stack.removeItem(callback_id)
                    return false

                }

                if (resultData.system_download_now) {
                    if (!document) {
                        console.warn(`document not available`)
                    } else {
                        const linkName = 'my_download_link' + Date.now() + '_' + Math.random()

                        const nameRu = resultData.name_ru || resultData.filename

                        const body_ = document.getElementsByTagName('body')[0]

                        const a = document.createElement('a')
                        a.setAttribute('id', linkName)
                        a.setAttribute('href', resultData.path + resultData.filename)
                        a.setAttribute('download', nameRu)
                        a.setAttribute('style', "display:none;")
                        body_.appendChild(a)
                        a.click()
                        a.remove()
                    }

                }

                item.callback(result)
            }
            this.socketQuery_stack.removeItem(callback_id)
        })

        this.socket.on('socketQueryCallbackError', function (err) {
            console.log('socketQueryCallbackError==>', err)
        })

        this.socket.on('logout', () => {
            this.auth()
        })

        this.socket.on('toMain', (...args) => {
            if (typeof this.toMainFunction === "function") this.toMainFunction(...args)
        })

        this.socket.on('log', function (data) {
            console.log('---SERVER--LOG--->', data)
        })
        // this.ws_status = WS_CONNECTED

        if (typeof this.afterInitConnect === 'function') {
            this.afterInitConnect(this.socket)
        }
    }

    async queryWS(obj = {}) {
        if (this.debugFull) console.log('queryWS== ws_status:', this.ws_status)
        if (this.ws_status !== WS_CONNECTED) {
            if (this.ws_status !== WS_CONNECTING) {
                // Надо заинитьить сокет
                this.connectSocket()
            }

            if (this.debugFull) console.log('Socket not ready now', this.ws_status)

            return await new Promise((resolve) => {
                this.tryConnectCnt++

                if (this.tryConnectCnt > 70) { // После 30с
                    if (this.tryConnectTimeout !== 5000) {
                        this.tryConnectTimeout = 5000
                        if (this.debugFull) console.log('tryConnectTimeout changed to 5000')
                    }
                } else if (this.tryConnectCnt > 65) { // После 10с
                    if (this.tryConnectTimeout !== 1000) {
                        this.tryConnectTimeout = 1000
                        if (this.debugFull) console.log('tryConnectTimeout changed to 1000')
                    }
                } else if (this.tryConnectCnt > 55) { // После 5с
                    if (this.tryConnectTimeout !== 500) {
                        this.tryConnectTimeout = 500
                        if (this.debugFull) console.log('tryConnectTimeout changed to 500')
                    }
                } else if (this.tryConnectCnt > 40) { // После 2с
                    if (this.tryConnectTimeout !== 200) {
                        this.tryConnectTimeout = 200
                        if (this.debugFull) console.log('tryConnectTimeout changed to 200')
                    }
                }

                setTimeout(async () => {
                    resolve(await this.queryWS(obj))
                }, this.tryConnectTimeout || 50)
            })
        }

        // Сбросим значения
        if (this.tryConnectCnt) {
            this.tryConnectCnt = 0
            this.tryConnectTimeout = 50
        }


        return await new Promise((resolve, reject) => {
            this.socketQuery(obj, res => {
                if (this.debugFull) console.log('GO_CORE_QUERY:this.socketQuery:res==>', res)
                resolve(res)
            })
        })


    }

    async auth() {

        const now = Date.now()
        if (this.status === IN_AUTH && now - this.inAuthStarted < 10000) {
            if (this.debugFull) console.log('Already in progress',
                {diff: now - this.inAuthStarted, inAuthStarted: this.inAuthStarted})
        }

        this.status = IN_AUTH
        this.inAuthStarted = now

        if (!this.autoAuth) {
            if (typeof this.authFunction === 'function') {
                this.authFunction({}, err => {
                    if (err) {
                        if (this.debug) console.log('authFunction return error:', err)
                        this.status = NO_AUTH
                        return
                    }
                    this.status = READY
                })
            }
            return
        }

        const o = {
            command: this.loginCommand,
            object: this.loginObject,
            params: {
                login: this.login,
                password: this.password
            }
        }


        let counter = 0

        const tryQ = async () => {
            let authRes
            try {
                authRes = await this.query(o)
                if (this.debugFull) console.log('GO_CORE_QUERY:auth:res==>', authRes)
                if (authRes.code) {
                    this.status = AUTH_ERROR
                    this.auth_response = authRes
                    setTimeout(() => {
                        this.status = NO_AUTH
                        this.auth_response = null
                    }, 30000)
                    return
                }
                this.token = authRes?.data?.token || authRes?.token

                this.status = READY
                return authRes
            } catch (e) {
                counter++
                if (counter <= this.tryAuthCount) {
                    console.log(`Error while do auth query. Try:${counter} of ${this.tryAuthCount}. Wait ${this.tryAuthPause}`)
                    authRes = await new Promise((resolve) => {
                        setTimeout(async () => {
                            resolve(await tryQ())
                        }, this.tryAuthPause)
                    })
                    return authRes
                } else {
                    console.log(`Error while do auth query. Finish`, e)
                    this.status = ERROR
                    this.auth_response = e
                    setTimeout(() => {
                        this.status = NO_AUTH
                        this.auth_response = null
                    }, 3000)
                    return e
                }
            }
        }

        await tryQ()

    }

    async toMain(...args) {

        if (typeof this.toMainFunction === 'function') {
            this.toMainFunction(...args)
        }

    }

    async do(obj, cb) {
        if (typeof cb === 'function') {
            return tryDo.call(this, obj, (err, res) => {
                try {
                    cb(err || res)
                } catch (e) {
                    console.error('Error in callback function after execution go_core_query', obj)
                    console.error(e)
                }
            })
        }
        return await new Promise((resolve, reject) => {
            // Здесь используем коллбек функцию, так как с помощью async/await делать рекурсивную асинхронную функцию
            // менее удобно. Соответственно await перед tryDo оускаем
            tryDo.call(this, obj, (err, res) => {
                if (err) return reject(err)
                resolve(res)
            })
        })
    }
}

export default function init(params: QueryParams = {} as QueryParams): { api: unknown, instance: unknown } {
    const query_ = new Query({...params})
    return {api: query_.do.bind(query_), instance: query_}
}

export const initGoCoreQuery = init

// @ts-ignore
globalObj?.initGoCoreQuery = init
