import ncadapter from "./adapter/index.js";
import { nccommon } from "./lib/index.js";

let { cfg } = await import('./lib/index.js')

let version = nccommon.getNaVersion()
logger.mark(`===============`)
logger.mark(`${logger.blue('[NapCat-Adapter]')} version ${version}`)
logger.mark(`${logger.blue(`[NapCat-Adapter]`)} repository https://github.com/qiannqq/napcat-adapter`)
logger.mark(`===============`)

let Botlist = []

if(cfg().multiple) {
    let fs = await import('fs/promises')
    try {
        Botlist = JSON.parse(await fs.readFile('./plugins/napcat-adapter/config/config/botlist.json', 'utf-8'))
    } catch (error) {
        throw new Error('[Napcat-Adapter] 配置文件读取失败', error)
    }
} else {
    Botlist = [cfg()]
}

if(!nccommon.isTRSS() && cfg().isBotuinArray) {
    await import('./lib/uin.js')
    if(!Bot?.isOnline()) Bot.nickname = 'Miao-Yunzai'
} else if(!nccommon.isTRSS()) {
    Bot.adapter = []
    if(Bot?.isOnline()) Bot.adapter.push(Bot.uin)
}

/** 创建nc实例并初始化 */
for (let i of Botlist) {
    const nc = new ncadapter(i);
    nc.init()
}

let ncu = await import('./other/u.js')

let apps = { 
    "u": ncu[Object.keys(ncu)[0]]
}
export { apps }