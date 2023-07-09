import io from "socket.io-client"

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
            },
        }

        this.env = params.env || 'browser'

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

        this.init().then().catch(e=>{
            console.error('ERROR:GoCoreQuery:init:', e)
        })

    }


}
