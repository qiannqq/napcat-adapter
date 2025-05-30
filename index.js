import ncadapter from "./adapter/index.js";
import { cfg } from './lib/index.js'
import { nccommon } from "./lib/index.js";

let version = nccommon.getNaVersion()
logger.mark(`===============`)
logger.mark(`${logger.blue('[NapCat-Adapter]')} version ${version}`)
logger.mark(`${logger.blue(`[NapCat-Adapter]`)} repository https://github.com/qiannqq/napcat-adapter`)
logger.mark(`===============`)

const nc = new ncadapter(cfg());

nc.init()

let ncu = await import('./other/u.js')

let apps = { 
    "u": ncu[Object.keys(ncu)[0]]
}
export { apps }