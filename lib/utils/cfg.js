import YAML from 'yaml'
import fs from 'fs'

export default function cfg() {
    if(typeof Bot.initCfg === 'undefined') {
        let cfgPath = './plugins/napcat-adapter/config'
        let defSet = YAML.parse(fs.readFileSync(`${cfgPath}/defSet/cfg.yaml`, 'utf-8'))
        if (fs.existsSync(`${cfgPath}/config/cfg.yaml`)) {
            let cfg = YAML.parse(fs.readFileSync(`${cfgPath}/config/cfg.yaml`, 'utf-8'))
            let write = false
            for (let i in defSet) {
                if (typeof cfg[i] === 'undefined') {
                    cfg[i] = defSet[i]
                    write = true
                }
            }
            if (write) fs.writeFileSync(`${cfgPath}/config/cfg.yaml`, YAML.stringify(cfg))
        }
        Bot.initCfg = true
    }
    let cfgPath = './plugins/napcat-adapter/config'
    if(!fs.existsSync(`${cfgPath}/config/cfg.yaml`)) {
        fs.copyFileSync(`${cfgPath}/defSet/cfg.yaml`, `${cfgPath}/config/cfg.yaml`)
    }
    let result = fs.readFileSync(`${cfgPath}/config/cfg.yaml`, 'utf-8')
    return YAML.parse(result)
}