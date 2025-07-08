import fs from 'fs';  
import path from 'path';  
import yaml from 'yaml';  
import lodash from 'lodash'  
import { cfg, nccommon } from './lib/index.js';  
  
let cfgPath = './plugins/napcat-adapter/config/config/cfg.yaml'  
let botlistPath = './plugins/napcat-adapter/config/config/botlist.json'  
  
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
      iconPath: `${process.cwd().replace(/\\/g, '/')}/plugins/napcat-adapter/other/logo.png`  
    },  
    configInfo: {  
      schemas: [  
        {  
          component: 'Divider',  
          label: '连接设置'  
        },  
        {  
          field: 'multiple',  
          label: '多Bot',  
          bottomHelpMessage: "是否开启连接多个Napcat.OneBot，开启后需在\"./plugins/napcat-adapter/config/botlist.json\"配置多个连接",  
          required: true,  
          component: 'Switch'  
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
        },  
        {  
          field: 'bigFileSize',  
          label: '大文件阈值',  
          bottomHelpMessage: '超过设置的阈值则按大文件处理，单位：字节。默认10MB',  
          helpMessage: '注意，ws单帧限制16MB，超过16MB的文件传输可能会导致WS连接异常',  
          component: 'InputNumber',  
          componentProps: {  
            min: 0,  
            max: 16777216,  
            placeholder: '请输入阈值',  
          }  
        },        
        {  
          component: 'Divider',  
          label: '多Bot配置',  
        },  
        {  
          field: 'botlist',  
          label: 'Bot连接列表',  
          component: 'GSubForm',  
          bottomHelpMessage: '请先将多Bot开关打开，否则此处多Bot配置不生效',  
          componentProps: {  
            multiple: true,  
            modalProps: {  
              title: 'Bot连接配置',  
              width: 600  
            },  
            schemas: [  
              {  
                field: 'baseUrl',  
                label: 'WebSocket地址',  
                component: 'Input',  
                required: true,  
                componentProps: {  
                  placeholder: '请输入WebSocket地址，如: ws://localhost:3001'  
                }  
              },  
              {  
                field: 'accessToken',  
                label: '连接Token',  
                component: 'Input',  
                componentProps: {  
                  placeholder: '非必填，如果设置了连接token则需要填写'  
                }  
              },  
              {  
                field: 'throwPromise',  
                label: '抛出Promise异常',  
                component: 'Switch',  
                componentProps: {  
                  checkedValue: true,  
                  unCheckedValue: false  
                }  
              },  
              {  
                field: 'reconnection.enable',  
                label: '启用重连',  
                component: 'Switch',  
                componentProps: {  
                  checkedValue: true,  
                  unCheckedValue: false  
                }  
              },  
              {  
                field: 'reconnection.attempts',  
                label: '重连次数',  
                component: 'InputNumber',  
                componentProps: {  
                  min: 1,  
                  max: 100,  
                  placeholder: '请输入重连次数'  
                }  
              },  
              {  
                field: 'reconnection.delay',  
                label: '重连延迟(ms)',  
                component: 'InputNumber',  
                componentProps: {  
                  min: 1000,  
                  max: 60000,  
                  placeholder: '请输入重连延迟时间'  
                }  
              }  
            ]  
          }  
        },   
      ],  
        
      async getConfigData() {  
        const config = cfg();  
          
        // 如果开启了多Bot模式，读取botlist.json  
        if (config.multiple && fs.existsSync(botlistPath)) {  
          try {  
            const botlistData = fs.readFileSync(botlistPath, 'utf8');  
            const botlist = JSON.parse(botlistData);  
            config.botlist = botlist;  
          } catch (error) {  
            logger.error('读取 botlist.json 失败:', error);  
            config.botlist = [];  
          }  
        }  
          
        return config;  
      },  
        
      async setConfigData(data, { Result }) {  
        try {  
          // 1. 处理主配置文件 (cfg.yaml)  
          let config = {};  
          if (fs.existsSync(cfgPath)) {  
            const configContent = fs.readFileSync(cfgPath, 'utf8');  
            config = yaml.parse(configContent) || {};  
          }  
            
          // 2. 更新主配置对象（排除botlist字段）  
          const { botlist, ...mainConfig } = data;  
          for (const [keyPath, value] of Object.entries(mainConfig)) {  
            lodash.set(config, keyPath, value);  
          }  
            
          // 3. 保存主配置文件  
          const updatedConfigYAML = yaml.stringify(config);  
          fs.writeFileSync(cfgPath, updatedConfigYAML, 'utf8');  
            
          // 4. 如果开启了多Bot模式且有botlist数据，保存botlist.json  
          if (data.multiple && botlist) {  
            const botlistDir = path.dirname(botlistPath);  
            if (!fs.existsSync(botlistDir)) {  
              fs.mkdirSync(botlistDir, { recursive: true });  
            }  
              
            // 处理嵌套的reconnection对象  
            const processedBotlist = botlist.map(bot => ({  
              baseUrl: bot.baseUrl || 'ws://localhost:3001',  
              accessToken: bot.accessToken || '',  
              throwPromise: bot.throwPromise || false,  
              reconnection: {  
                enable: bot['reconnection.enable'] !== undefined ? bot['reconnection.enable'] : true,  
                attempts: bot['reconnection.attempts'] || 10,  
                delay: bot['reconnection.delay'] || 5000  
              }  
            }));  
              
            fs.writeFileSync(botlistPath, JSON.stringify(processedBotlist, null, 2), 'utf8');  
          }  
            
          nccommon.mark({ nickname: '配置文件', uin: 'cfg.yaml' }, '配置文件更新，重启后生效');  
          return Result.ok({}, '保存成功，重启后生效');  
            
        } catch (error) {  
          logger.error('保存配置失败:', error);  
          return Result.error('配置保存失败: ' + error.message);  
        }  
      }  
    }  
  }  
}