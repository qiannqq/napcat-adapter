# NapCat 适配器 NapCat-Adapter

<p align="center">
    <img src="./other/logo.png" width="30%" height="30%">
</p>

#### 简介:
兼容Miao-Yunzai的NapCat适配器，旨在最大程度的兼容所有插件<br>
[加入官方群聊](https://qm.qq.com/q/DP6Y6UxIqc) ~
#### 警告
  - **重要！** 请勿将`napcat-adapter（即本项目）`和`NapCat.OneBot`项目发布到“bilibili、抖音、快手”等媒体平台
  - 该适配器目前处于Beta开发阶段，依旧有许多未适配。

#### 反馈
  - 遇到任何“ICQQ”可用，但本适配器会报错的问题，请[创建issue](https://gitee.com/qiannqq/napcat-adapter/issues/new/choose)，提交**报错信息、报错插件、报错使用的指令**，等待开发者回复
  - 开发者非常需要这些反馈以尽最大努力完善适配器！拜托请提供正确的反馈信息！

#### 安装方式
国内推荐 Gitee源
```bash
git clone --depth=1 https://gitee.com/qiannqq/napcat-adapter.git ./plugins/napcat-adapter
```
Github源
```bash
git clone --depth=1 https://github.com/qiannqq/napcat-adapter.git ./plugins/napcat-adapter
```
安装依赖
```bash
pnpm install --filter=napcat-adapter
```

#### 连接方式

- ⚠️ 本适配器的工作模式为**正向WS连接**，请确保 `napcat-adapter` 可以正常访问 NapCat.OneBot 所提供的 IP 和端口。
- ⚠️ 如果 napcat-adapter 与 NapCat.OneBot 不在一个环境内（例如一方位于 Docker，WSL 系统），你可能需要进行额外的配置，或者查询 IP 地址并正确配置以确保连接正常。

关于 WSL 的帮助请参考：[WSL Networking Documentation](https://learn.microsoft.com/zh-cn/windows/wsl/networking#identify-ip-address)<br>
关于 Docker 配置端口映射请参考：[Docker镜像配置端口](https://www.doubao.com/thread/w76de7e1b8088ac44)

  1. 安装并打开NapCat.OneBot，登录"http://你的IP地址:6099/webui"，秘钥默认为`napcat`
  2. 配置完账号后，在网络配置里创建一个 **WebSocket服务器** ，并启用<br>
![cfg-napcat](./other/cfg-napcat.png)
  3. 打开Yunzai根目录下的`config/bot.yaml`文件，启用 “跳过登录icqq”，以解决多个适配器互相影响导致报错的问题。
  4. 安装本适配器后启动一次，打开插件根目录下的`config/config/cfg.yaml`，编辑baseUrl地址为napcat-ws-server地址，并正确配置端口。如果你在配置WebSocket服务器时输入了token，请**取消配置文件里token的注释，并编辑为你在WebSocket服务器配置的token**。
  5. 重启Yunzai后即可享用

#### 支持
| 功能 | 支持情况 |
|---|---|
| 收发消息 | ✅ |
| 戳一戳 | ✅ |
| 合并转发、嵌套转发 | ✅ |
| 图片、图文混排、语音、视频 | ✅ |
| 文件相关 | ✅(因Napcat原因，部分无法支持) |
| 椰奶发表说说、公告等api操作 | ✅ |
| 发音乐卡片、赞我等 | ✅ |
| 事件接受 | 部分支持，正在完善... |

#### 常见问题
   
Q：我的插件/Bot日志产生了如下报错，该怎么解决？
```
[MiaoYz][xx:xx:xx.xxx][ERRO] ApiRejection {
    code: XX,
    message: 'client not online'
}
```
A：报错信息里面的message若包含“ `client not online` ”信息，请更新适配器 `#nc更新`

#### 致谢
  - NapCat 魔法猫娘（？）
  - node-napcat-ts 本适配器的依赖
  - Lain-plugin 铃音插件，CV了部分消息处理源码（不然进度不会这么快）

#### 赞助
  - [爱发电](https://afdian.com/a/qiannqq)