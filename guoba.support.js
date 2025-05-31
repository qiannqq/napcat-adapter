import fs from 'fs';
import yaml from 'yaml';
import lodash from 'lodash'
import { cfg, nccommon } from './lib/index.js';

let cfgPath = './plugins/napcat-adapter/config/config/cfg.yaml'

export function supportGuoba() {
  return {
    pluginInfo: {
      name: `Napcat-Adapter`,
      title: 'NapCat 适配器',
      author: '@千奈千祁',
      authorLink: 'https://gitee.com/QianNQQ',
      link: 'https://gitee.com/QianNQQ/Napcat-adapter',
      isV3: true,
      isV2: false,
      description: `兼容Miao-Yunzai的NapCat适配器`,
      icon: 'mdi:stove',
      iconColor: '#d19f56',
      iconPath: `${process.cwd().replace(/\\/g, '/')}/plugins/napcat-adapter/other/logo.png` // 这里需要自己扔图片到resources目录下，否则锅巴会报错
    },
    configInfo: {
      schemas: [
        {
          component: 'Divider',
          label: '连接设置'
        },
        {
          field: 'baseUrl',
          label: 'Napcat地址',
          helpMessage: '仅支持Websocket地址',
          bottomHelpMessage: '请填写在Napcat配置的Websocket地址，示例：ws://127.0.0.1:3000',
          required: true,
          component: 'Input',
          componentProps: {
            placeholder: '请输入Websocket地址',
          }
        },
        {
          field: 'accessToken',
          label: '连接Token',
          helpMessage: '非必填',
          bottomHelpMessage: '非必填。如果设置了连接token，则需要填写',
          component: 'Input',
        },
        {
          field: 'throwPromise',
          label: '错误抛出错误开关',
          bottomHelpMessage: '是否需要在触发 socket.error 时抛出错误, 默认关闭',
          component: 'Switch'
        },
        {
          component: 'Divider',
          label: '杂项'
        },
        {
          field: 'logbotinfo',
          label: '打印Bot信息',
          bottomHelpMessage: '输出日志时是否携带Bot信息',
          component: 'Switch'
        }
      ],
      async getConfigData() {
        return cfg();
      },
      async setConfigData(data, { Result }) {
        // 1.读取现有配置文件
        let config = {};
        if (fs.existsSync(cfgPath)) {
          const configContent = fs.readFileSync(cfgPath, 'utf8');
          config = yaml.parse(configContent) || {};
        }
        // 2. 更新配置对象
        for (const [keyPath, value] of Object.entries(data)) {
          lodash.set(config, keyPath, value);
        }
        // 3. 将更新后的配置对象写回文件
        const updatedConfigYAML = yaml.stringify(config);
        fs.writeFileSync(cfgPath, updatedConfigYAML, 'utf8');
        nccommon.mark({ nickname: '配置文件', uin: 'cfg.yaml' }, '配置文件更新，重启后生效')
        return Result.ok({}, '保存成功，重启后生效');
      }
    }
  }
}