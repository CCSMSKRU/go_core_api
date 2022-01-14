// const moment = require('moment')
// const io = require('socket.io-client')
// const {v4} = require("uuid")

import moment from 'moment'
import io from 'socket.io-client'
import {v4} from 'uuid'


const WS_NOT_CONNECTED = 'WS_NOT_CONNECTED'
const WS_CONNECTED = 'WS_CONNECTED'
const WS_CONNECTING = 'WS_CONNECTING'

const NO_AUTH = 'NO_AUTH'
const IN_AUTH = 'IN_AUTH'
const READY = 'READY'
const AUTH_ERROR = 'AUTH_ERROR'
const ERROR = 'ERROR'

const uncollapseData = function (obj) {
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
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=')
        return parts[0] === name ? decodeURIComponent(parts[1]) : r
    }, '')
}

function tryDo(obj, cb) {

    // Если уже определена ошибка (либо во время авторизации либо во время выполнения запроса), то
    // Отклоняем все запросы. Позже эта ошибка будет сброшена
    if (this.status === ERROR) {
        if (this.debugFull) console.log('Ошибка сервера. Завершим', this.response)
        return cb(null, this.auth_response)
    }

    if (this.status === AUTH_ERROR) {
        if (this.debugFull) console.log('Ошибка авторизации. Завершим', this.auth_response)
        return cb(null, this.auth_response)
    }

    // Запускаем авторизацию и вызываем запрос заново (он попадет в цикл ожидание пока авторизация не пройдет)
    if (this.status === NO_AUTH) {
        if (this.debugFull) console.log('Еще не авторизироавны. Запустим процесс и вызовем запрос снова', obj)
        this.auth()
        if (!this.autoAuth) return
        return tryDo.call(this, obj, cb)
    }

    // Производится авторизация, немного ждем и вызываем заново. Таким образом рано или поздно статус изменется
    if (this.status === IN_AUTH) {
        if (this.debugFull) console.log('Еще производится авторизация, ждем')
        setTimeout(() => {
            if (!this.autoAuth) return
            tryDo.call(this, obj, cb)
        }, 100)
        return
    }


    if (this.status === READY) {
        if (this.debugFull) console.log('Выполним запрос')
        let res
        let counter = 0

        const q = async () => {
            try {
                res = await this.query(obj)
                if (res.code) {
                    // Сессия стухла
                    if (res.code === -4) {
                        if (!this.autoAuth) return cb(res)
                        this.status = NO_AUTH
                        return tryDo.call(this, obj, cb)
                    }
                    // Логическая ошибка
                    return cb(null, res)
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
                        message: 'Сервер не доступен'
                    })

                }
            }
        }

        q()
    } else {
        return cb(new Error(`Неизвестный статус: ${this.status}`))
    }

}

class Query {
    constructor(params = {}) {
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
                : '/api'

        this.connectHost = this.host
            ? `${this.https ? 'https' : 'http'}://${this.host}:${this.port}`
            : null
        this.useAJAX = params.useAJAX

        this.socketQuery_stack = {
            items: {},
            getItem: function (id) {
                return this.items[id]
            },
            addItem: function (cb, obj) {
                var id = v4()
                this.items[id] = {
                    callback: cb,
                    request: obj,
                    time: moment().valueOf()
                }

                return id
            },
            removeItem: function (id) {
                delete this.items[id]
            },
        }

        this.env = params.env || 'browser'

        this.autoAuth = typeof params.autoAuth !== "undefined" ? params.autoAuth : false
        // Можно передать и тогда она будет вызываться если надо авторизоваться, при условии что autoAuth = false
        this.authFunction = params.authFunction || params.authFn
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

        this.storage = {
            get: (key) => {
                if (typeof this.storeGetFn === 'function') return this.storeGetFn(key)
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
            },
            set: (key, val) => {
                if (typeof this.storeSetFn === 'function') return this.storeSetFn(key, val)
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

        this.token = this.storage.get(this.tokenStorageKey)

        this.status = this.token || !this.autoAuth ? READY : NO_AUTH
        this.ws_status = WS_NOT_CONNECTED
        this.auth_response = null
        this.tryAuthCount = params.tryAuthCount || 10
        this.tryAuthPause = params.tryAuthPause || 500

        this.tryCount = params.tryCount || 10
        this.tryPause = params.tryPause || 500

        this.debug = params.debug
        this.debugFull = params.debugFull
        this.doNotDeleteCollapseDataParam = params.doNotDeleteCollapseDataParam

        this.init()

    }

    init(){
        if (!this.useAJAX){
            this.connectSocket()
        }
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

        if (window) {

            let jesJSON, res

            try {
                res = await fetch(this.url, options)
                jesJSON = await res.json()
            } catch (e) {
                jesJSON = {code:-5000, message: e.message, data:{e, text:res ? await res.text() : undefined}}
            }
            return jesJSON
        } else {
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

    }

    socketQuery(obj, cb) {

        if (this.debug) {
            var alias = ' ➢ ' + obj.object + ' ➢ ' + obj.command + '    '
            console.groupCollapsed('%c ' + alias, 'background: #35ff4829; color: #000')
            console.log(obj)
            console.groupEnd()
            if (!this.doNotDeleteCollapseDataParam && obj.params && typeof obj.params.collapseData !== 'undefined') {
                console.warn('%c ' + alias + 'С клиента нельзя передовать параметр collapseData. Необходимо исправить метод так, чтобы он не использовал его. ' +
                    '\nПараметр collapseData удален и передан не будет!', 'background: #ffa482; color: #000')
                delete obj.params.collapseData
            }
        }
        let id
        if (typeof cb === "function") {
            id = this.socketQuery_stack.addItem(cb, obj)
        }
        this.socket.emit('socketQuery', obj, id)
    }

    connectSocket() {
        if (this.ws_status !== WS_NOT_CONNECTED){
            return
        }
        this.ws_status = WS_CONNECTING

        const options = {
            path: this.url.replace(/\/$/, ''),
            query: {
                type: 'WEB',
            },
            auth: {
                token: this.token
            },
        }
        
        if (this.debugFull) console.log('connectSocket', options)
        this.socket = this.connectHost
            ? io(this.connectHost, options)
            : io(options)

        // ========= SET WS Handlers =======================

        this.socket.on("connect", () => {
            if (this.debug) console.log('CONNECTED')
            this.ws_status = WS_CONNECTED
            if (this.oldSocketId){
                this.socket.emit('setOldSocketId', this.oldSocketId)
            }
            this.oldSocketId = this.socket.id
        })

        this.socket.on("disconnect", (reason) => {
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


        });

        // this.socket.on("disconnect", (reason) => {
        //     if (this.debug) console.log('CONNECT_ERROR', reason)
        //     this.ws_status = WS_NOT_CONNECTED
        //     if (reason === 'io client disconnect'){
        //         this.connectSocket()
        //     }
        // });

        // store token
        this.socket.on('token', (token)=> {
            // if (this.debug) console.log('onToken', token)
            this.token = token
            this.socket.auth.token = this.token
            this.storage.set(this.tokenStorageKey, this.token)
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

        this.socket.on('socketQueryCallback', (callback_id, result, request_time)=> {
            const item = this.socketQuery_stack.getItem(callback_id)
            if (typeof item !== "object") return
            var alias = '➢ ' + item.request.object + ' ➢ ' + item.request.command + '    '
            let dataIsObj
            if (item.request.params) {
                dataIsObj = item.request.params.dataIsObj
            }

            if (typeof result === 'object' && result !== null) {
                if (typeof result.code === 'undefined') {
                    console.log(
                        `%c ${alias}Серверная функция должна возвращать "code". 
                        Используйте стандартный ответ, например, cb(null, new UserOk('noToastr',{data});`
                        , 'background: #ffd582; color: #000'
                    )
                }

                if (result.code !== 10) {
                    result.time = request_time
                    var t = result.toastr
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
                        toastr[t.type](t.message, t.title)
                    }
                    if (typeof toastr == "object" && t && t.additionalMessage && typeof toastr['error'] === 'function') {
                        toastr['error'](t.additionalMessage, 'ВНИМАНИЕ!')
                    }

                    // if (result.code === -4) {
                    //     console.log('НЕ АВТОРИЗОВАН')
                    //     item.callback(result)
                    //     this.socketQuery_stack.removeItem(callback_id)
                    //     return false
                    // }
                }
            } else {
                console.log(`%c ОТВЕТ ДОЛЖЕН БЫТЬ ОБЪЕКТОМ И НЕ null. 
                Используйте стандартный ответ, например, 
                cb(null, new UserOk('noToastr',{data:data});`, 'background: #F00; color: #fff')
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

                    if (typeof result.data == 'object' && typeof result.data_columns == 'object') {

                        result = uncollapseData(result)
                        if (dataIsObj && result.data) {
                            result.data = Object.entries(result.data)
                        }
                    }

                } else {
                    var primal_res = result
                    result = {
                        code: -888,
                        toastr: {
                            type: 'error',
                            title: 'Ошибка',
                            message: 'В ответ пришел null или ответ не является объектом'
                        },
                        results: [primal_res]
                    }
                }


                if (result.code === 10) {
                    // SERVER EXAMPLE
                    //var confirm = obj.confirm;
                    //if (!confirm){
                    //    return cb(new UserError('needConfirm', {message: 'Это тестовый confirm. Напишите "ВАСЯ"',title:'Подтвердите действие', confirmType:'dialog',responseType:'text'}));
                    //}else if (confirm!='ВАСЯ'){
                    //    return cb(null, new UserOk('Не верно вверено контрольное значение. Запрос отклонен.',{type:'info'}));
                    //}
                    //return cb(null, new UserOk('Все ок'));
                    // END SERVER EXAMPLE

                    // Если не браузер, росто передадим дальше
                    if (this.env !== 'browser') {
                        item.callback(result)
                        this.socketQuery_stack.removeItem(callback_id)
                        return false
                    }

                    item.request.params.confirmKey = result.confirmKey || result.key
                    var cancelMsg = result.cancelMsg || 'Операция отменена'
                    var okBtnText = result.okBtnText || 'Подтвердить'
                    var cancelBtnText = result.cancelBtnText || 'Отменить'
                    switch (result.confirmType) {

                        case 'dialog' :
                            if (!bootbox || typeof bootbox.dialog !== 'function'){
                                console.warn('bootbox.dialog is not installed (is not a function)')
                                break
                            }

                            var html = ''

                            if (result.responseType == 'text') {
                                html = result.toastr.message + '<input style="margin-top: 10px;" type="text" class="form-control" id="server-confirm-input" />'
                            } else {
                                html = result.toastr.message
                            }


                            const bbd1 = bootbox.dialog({
                                title: result.toastr.title,
                                message: html,
                                buttons: {
                                    success: {
                                        label: okBtnText,
                                        callback: ()=> {

                                            if (result.responseType === 'text') {

                                                item.request.params.confirm = $('#server-confirm-input').val()

                                            } else if (result.responseType === 'custom') {

                                                const resObj = {}
                                                bbd1
                                                    .find(result.inputsClass ? '.' + result.inputsClass : '.server-confirm-input')
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


                                            if (toastr && typeof toastr['info'] === 'function'){
                                                toastr['info'](cancelMsg)
                                            }
                                            item.callback(result)
                                        }
                                    }
                                }
                            })


                            break

                        case 'date':

                            break

                        default :
                            if (!toastr || typeof toastr[result.toastr.type] !== 'function'){
                                console.warn(`toastr not available or unknown type of toastr: ${result.toastr.type}`)
                                break
                            }

                            var btnGuid = v4()

                            toastr[result.toastr.type](result.toastr.message +
                                '<div style="width: 100%;"><button id="confirm_socket_query_' + btnGuid +
                                '" type="button" class="btn clear">Подтвердить</button> <button id="cancel_socket_query_' +
                                btnGuid + '" type="button" class="btn clear">Отмена</button></div>', '', {
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
                            confirmBtn.addEventListener('click', e=>{
                                item.request.params.confirm = true
                                window.setTimeout(function () {
                                    toastr.clear()
                                }, 1000)
                                this.do(item.request, item.callback)
                            })

                            const cancelBtn = document.getElementById('cancel_socket_query_' + btnGuid)
                            cancelBtn.addEventListener('click', e=>{
                                toastr['info'](cancelMsg)
                                window.setTimeout(function () {
                                    toastr.clear()
                                }, 1000)
                                item.callback(result)
                            })
                            break

                    }

                    this.socketQuery_stack.removeItem(callback_id)
                    return false

                }

                if (result.system_download_now) {
                    const linkName = 'my_download_link' + v4()

                    const nameRu = result.name_ru || result.filename

                    const body_ = document.getElementsByTagName('body')[0]

                    const a = document.createElement('a')
                    a.setAttribute('id', linkName)
                    a.setAttribute('href', result.path + result.filename)
                    a.setAttribute('download', nameRu)
                    a.setAttribute('style', "display:none;")
                    body_.appendChild(a)
                    a.click()
                    a.remove()
                }

                item.callback(result)
            }
            this.socketQuery_stack.removeItem(callback_id)
        })

        this.socket.on('socketQueryCallbackError', function (err) {
            console.log('socketQueryCallbackError==>',err);
        });

        this.socket.on('logout', ()=> {
            this.auth()
        });

        this.socket.on('log', function (data) {
            console.log('---SERVER--LOG--->', data)
        })
        this.ws_status = WS_CONNECTED

        if (typeof this.afterInitConnect === 'function'){
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
                setTimeout(async () => {
                    resolve(await this.queryWS(obj))
                }, 50)
            })
        }

        return await new Promise((resolve, reject) => {
            this.socketQuery(obj, res=>{
                resolve(res)
            })
        })


    }

    async auth() {

        this.status = IN_AUTH

        if (!this.autoAuth){
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
            command: 'login',
            object: 'User',
            params: {
                login: this.login,
                password: this.password,
            }
        }


        let counter = 0

        const tryQ = async () => {
            let authRes
            try {
                authRes = await this.query(o)
                if (authRes.code) {
                    this.status = AUTH_ERROR
                    this.auth_response = authRes
                    setTimeout(() => {
                        this.status = NO_AUTH
                        this.auth_response = null
                    }, 30000)
                    return
                }
                this.token = authRes.token

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

export default function init(params = {}){
    const query_ = new Query({...params})

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
    return query_.do.bind(query_)
}

if (window){
    window.initGoCoreQuery = init
}
// module.exports = init
