// const initQuery = require('@/index')
import initQuery from './index.js'

const params = {
    host: '127.0.0.1',
    port: 9006,
    path:'',
    https: false,
    autoAuth:false,
    authFunction:()=>{
        alert('Auth')
    },
    // login:'ivantgco@gmail.com',
    // password:'123',
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

    const o3 = {
        command: 'getNextPreview',
        object: 'widget_user_session',
        params: { filename:null },
    }

    // socketQuery(o, (res) => {
    //     // console.log('getNextPreview', res)
    //
    //     if (res.filename)
    //         this.onNewPreview(res.filename)
    // })

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
