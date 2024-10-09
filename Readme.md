# ccs.go_core_query

The package allows you to connect to the GoCore core via socket or regular http (s) requests. 
Works in various environments where there is javascript.

## Installation

```sh
npm i go_core_query --save
```

## Usage

**Example**

```js
const params = {
    host,
    port,
    path: '',
    https,
    useUUID: true,
    useUUIDAskAgreeFn: (cb) => {
        // Так как на данном этапе мы не можем сделать красивый рендеринг, то здесь запрещаем использование UUID
        // Позже (в Main.js) мы реализуем свою логику и обновим состояние
        // через goCoreAPIInstance?.setUUIDAgree(isAcccept) и другие методы (setUUIDIgnoreAgree)
        cb(false)
    },
    autoAuth: false,
    login:'',
    password:'',
    debug: true,
    debugFull: false,
    afterInitConnect: (socket_) => {
        socket = socket_

        deliverySocket = new Delivery(socket)
        if (!console.logServer && socket){
            console.logServer = (...data)=>{
                socket.emit('logFromClient', data)
            }

            window.onerror = function(message, url, line, col, error) {

                if (!url.includes(serverParams.url)) return

                if (typeof logD === 'function') logD('onerror', message, line, col, error)
                console.error(message, error)
                useLogError({
                    message, line, col, error
                })
            };
        }
    }
}


const goCoreQueryObj = initGoCoreQuery(params)
goCoreQuery = goCoreQueryObj.api
goCoreAPIInstance = goCoreQueryObj.instance

window.goCoreQueryObj = goCoreQueryObj
window.api = goCoreQuery
window.goCoreAPIInstance = goCoreQuery
```


## Contributing

Complex Cloud Solutions LLC

## License

ISC
