import ncadapter from "./adapter/index.js";
import { cfg } from './lib/index.js'

const nc = new ncadapter(cfg());

nc.init()