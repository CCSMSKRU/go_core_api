const initQuery = require('@/index')

const params = {
    host: '192.168.1.45',
    port: 9001,
    path:'',
    https: false,
    autoAuth:true,
    login:'ivantgco@gmail.com',
    password:'123',
    debug:true,
    afterInitConnect:(socket)=>{
        console.log('afterInitConnect==>', socket)
        // setTimeout(()=>{
        //     socket.disconnect()
        //     socket.connect()
        // }, 5000)

    }
}

const query = initQuery(params)

async function init() {

    const o2 = {
        command: 'get_me',
        object: 'User',
        params: {}
    }

    query(o2, (r)=>{
        console.log('r', r)
        // debugger;
        // throw 'dasd'
    })

    // const me = await query(o2)
    //
    // console.log('Me', me)
}

init()



// const query = new Query({host: '127.0.0.1', port: 8080, https: false})
