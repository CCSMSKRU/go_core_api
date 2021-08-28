const initQuery = require('index')

const params = {
    host: '192.168.1.45',
    port: 9001,
    path:'',
    https: false,
    autoAuth:true,
    login:'ivantgco@gmail.com',
    password:'123',
    debug:true,
    afterConnect:(socket)=>{
        console.log('afterConnect==>', socket)
    }
}

const query = initQuery(params)

async function init() {

    const o2 = {
        command: 'get_me',
        object: 'User',
        params: {}
    }

    const me = await query(o2)

    console.log('Me', me)
}

init()



// const query = new Query({host: '127.0.0.1', port: 8080, https: false})
