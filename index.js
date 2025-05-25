import ncadapter from "./adapter/index.js";
import { cfg } from './lib/index.js'

const nc = new ncadapter(cfg());

nc.init()

let ncu = await import('./apps/u.js')

let apps = { 
    "u": ncu[Object.keys(ncu)[0]]
}
export { apps }