# NapCat 适配器 NapCat-Adapter

<p align="center">
    <img src="./other/logo.png" width="30%" height="30%">
</p>

#### 简介:
兼容Miao-Yunzai的NapCat适配器，旨在最大程度的兼容所有插件<br>
[加入官方群聊](https://qm.qq.com/q/DP6Y6UxIqc) ~
#### 警告
  - **重要！** 请勿将`napcat-adapter（即本项目）`和`NapCat.OneBot`项目发布到“bilibili、抖音、快手”等国内平台（评论留言也不行！）
  - 该适配器目前处于Beta开发阶段，依旧有许多未适配。

#### 反馈
  - 遇到任何“ICQQ”可用，但本适配器会报错的问题，请[创建issue](https://gitee.com/qiannqq/napcat-adapter/issues/new/choose)，选择`Bug报告`，然后提交即可，开发者有空就会回复
  - 开发者非常需要这些反馈以尽最大努力完善适配器！拜托请提供正确的反馈信息！

#### 安装方式
Gitee源 （国内网络环境推荐）
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

- ⚠️ 本适配器的工作模式为**正向WS连接**，请确保 `napcat-adapter`可以正常访问 NapCat.OneBot 所提供的 IP 和端口。
- ⚠️ 如果 Miao-Yunzai 与 NapCat.OneBot 不在一个环境内（例如一方位于 Docker，WSL 系统），你可能需要进行额外的配置，或者查询 IP 地址并正确配置以确保连接正常。

关于 WSL 的帮助请参考：[WSL Networking Documentation](https://learn.microsoft.com/zh-cn/windows/wsl/networking#identify-ip-address)<br>
关于 Docker 配置端口映射请参考：[Docker镜像配置端口](https://www.doubao.com/thread/w76de7e1b8088ac44)

  1. 安装并打开NapCat.OneBot，登录"http://你的IP地址:6099/webui"，默认登录密码为 `napcat`
  2. 扫码登录完账号后，在网络配置里创建一个 **WebSocket服务器** ，并启用<br>
![cfg-napcat](./other/cfg-napcat.png)
  3. 打开Miao-Yunzai根目录下的`config/config/bot.yaml`文件， 将`skip_login: false`改为`skip_login: true`（大概在32行），以解决多个适配器互相影响导致报错的问题。
  4. 安装本适配器后启动一次，打开插件根目录下的`config/config/cfg.yaml`，编辑baseUrl地址为刚刚你在Napcat WebUI中配置的地址（例如：ws://0.0.0.0:3000）。如果你在配置WebSocket服务器时输入了token，请**取消配置文件里token的注释，并编辑为你在WebSocket服务器配置的token**。
  5. 重启Yunzai后即可享用

#### 关于文件
  - Websocket支持小文件 **（图片、视频、音频、文件等任何形式的数据）** 传输，但单帧最大为16MB，因此文件传输大小被限制为10MB。超过10MB的文件将直接让Napcat读取本地文件
  - 如果你有大文件传输的需求，请确保Napcat.OneBot可以访问Miao-Yunzai的目录，因使用的是绝对路径，所以你需要让Napcat.OneBot访问的Miao-Yunzai路径与真实路径完全一致
  1. Docker
    <br>
    - 如果你使用的是Docker版Napcat.OneBot，需要在启动镜像时配置目录映射，映射方法请自行询问AI模型或百度搜索
  2. Windows
    <br>
    - 一般来说，Windows下的Miao-Yunzai和Napcat.OneBot的目录是完全一致的，所以不需要做任何配置。
  3. WSL
    <br>
    - 暂无解决方案
  4. 跨设备（完全不在同一设备的情况）
    <br>
    - 暂无解决方案

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
A：报错信息里面的message若包含“ `client not online` ”信息，请更新适配器 `#nc更新`<br><br>
Q: 为什么我装了`napcat-adapter`，`ws-plugin`会报错？<br>
A: 在`ws-plugin`插件文件夹中，按以下路径找到文件`components/Version.js`，将`const isTrss = !!Array.isArray(Bot.uin)`修改为`const isTrss = isMiao ? false : true`。可以使用`ctrl+h`快速替换<br><br>
Q: 如何连接多个Napcat？<br>
A: 在锅巴的插件配置中打开`多Bot`选项，随后按照选项下提示在对应文件进行配置即可。

#### 致谢
  - NapCat 魔法猫娘（？）
  - node-napcat-ts 本适配器的依赖
  - Lain-plugin 铃音插件，CV了部分消息处理源码（不然进度不会这么快）

#### 赞助
  - [爱发电](https://afdian.com/a/qiannqq)