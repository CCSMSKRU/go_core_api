// const initQuery = require('@/index')
import initGoCoreQuery from '@/index'
// import initGoCoreQuery from '../dist/index'

const params = {
    host: '192.168.1.127',
    port: 8084,
    path:'',
    https: false,
    autoAuth:true,
    // useUUID: false,
    // useUUIDAskAgreeFn:()=>{
    //     alert('Вы согласны!')
    //     return true
    // },
    // authFunction:()=>{
    //     alert('authFunction')
    // },
    login:'ivantgco@gmail.com',
    password:'123',
    debug:true,
    debugFull:true,
    afterInitConnect:(socket)=>{
        console.log('afterInitConnect==>', socket)
        // setTimeout(()=>{
        //     socket.disconnect()
        //     socket.connect()
        // }, 5000)

    }
}

const goCoreQueryObj = initGoCoreQuery(params)
const query = goCoreQueryObj.api
window.api = query

async function init() {

    // setTimeout(()=>{
    //     goCoreQueryObj.instance.reInit()
    // }, 3000)
    //
    // return

    const o2 = {
        command: 'get_me',
        object: 'User',
        params: {}
    }

    // const o3 = {
    //     command: 'getNextPreview',
    //     object: 'widget_user_session',
    //     params: { filename:null },
    // }

    // socketQuery(o, (res) => {
    //     // console.log('getNextPreview', res)
    //
    //     if (res.filename)
    //         this.onNewPreview(res.filename)
    // })

    // query(o2, (r)=>{
    //     console.log('r', r)
    //     // debugger;
    //     // throw 'dasd'
    // })

    const res = await query(o2)
    if (res.code) {
        console.log('res.code', res.code)
        return
    }
    console.log('res===', res)

    // const me = await query(o2)
    //
    // console.log('Me', me)
}

init()



// const query = new Query({host: '127.0.0.1', port: 8080, https: false})
