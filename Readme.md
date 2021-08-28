# ccs.go_core_query

The package allows you to connect to the GoCore core via socket or regular http (s) requests. 
Works in various environments where there is javascript.

## Installation

```sh
npm i ccs.go_core_query --save
```

## Usage

**Example**

```js
const initQuery = require('ccs.go_core_query')

const params = {
    host: '192.168.1.45',
    port: 9001,
    path:'',
    https: false,
    autoAuth:true,
    debug:true,
    afterInitConnect:(socket)=>{
        console.log('afterInitConnect==>', socket)
    }
}

const query = initQuery(params)
```


## Contributing

Complex Cloud Solutions LLC

## License

ISC
