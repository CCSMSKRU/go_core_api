// const initQuery = require('@/index')
import initQuery from '@/index'

const params = {
    host: '192.168.1.45',
    port: 9001,
    path:'',
    https: false,
    autoAuth:false,
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

    query(o3, (r)=>{
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
