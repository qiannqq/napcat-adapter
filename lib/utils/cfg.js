import YAML from 'yaml'
import fs from 'fs'

export default function cfg() {
    let cfgPath = './plugins/napcat-adapter/config'
    if(!fs.existsSync(`${cfgPath}/config/cfg.yaml`)) {
        fs.copyFileSync(`${cfgPath}/defSet/cfg.yaml`, `${cfgPath}/config/cfg.yaml`)
    }
    let result = fs.readFileSync(`${cfgPath}/config/cfg.yaml`, 'utf-8')
    return YAML.parse(result)
}