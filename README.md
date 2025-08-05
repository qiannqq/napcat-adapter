# Yunzai NapCat 适配器 NapCat-Adapter

<p align="center">
  <img src="./other/logo.png" width="30%">
</p>

#### 简介

兼容 Miao-Yunzai 的 NapCat 适配器，旨在最大程度地兼容所有插件
[加入官方群聊](https://qm.qq.com/q/DP6Y6UxIqc) \~

#### 警告

* **重要！** 请勿将 `napcat-adapter（即本项目）` 和 `NapCat.OneBot` 项目发布到“bilibili、抖音、快手”等国内平台（评论留言也不行！）

#### 注意事项

* 本适配器虽然已趋于稳定，但并不保证完美兼容。我会持续优化该适配器，目的是做到接近 icqq 的使用感受，接近 icqq 的兼容性。

#### 兼容的 Yunzai 版本

| Yunzai 版本           | 兼容情况 |
| ------------------- | ---- |
| Miao-Yunzai         | ✅    |
| TRSS-Yunzai         | ✅    |
| Yunzai-Next         | ✅    |
| Yunzai-Bot          | ✅    |
| 理论上支持 V3 插件的 Yunzai | ✅\*  |

#### 反馈

* 遇到任何 “ICQQ 可用，但本适配器会报错” 的问题，请 [创建 issue](https://gitee.com/qiannqq/napcat-adapter/issues/new/choose)，选择 `Bug 报告`，然后提交即可，开发者有空就会回复。
* 开发者非常需要这些反馈以尽最大努力完善适配器！请提供正确的反馈信息。

#### 安装方式

**Gitee 源（国内网络环境推荐）**

```bash
git clone --depth=1 https://gitee.com/qiannqq/napcat-adapter.git ./plugins/napcat-adapter
```

**GitHub 源**

```bash
git clone --depth=1 https://github.com/qiannqq/napcat-adapter.git ./plugins/napcat-adapter
```

**安装依赖**

```bash
pnpm install --filter=napcat-adapter
# Yunzai-Next 等使用yarn管理依赖的请使用以下指令安装依赖
# yarn install
```

#### Napcat-Adapter 文档地址
* [Napcat-Adapter-Docs](https://ncadoc.yilx.cc/)
* 由 **皮梦 & 空间站「星旅」** 提供

**注意：README.md的文档后续将不再更新，请前往[Napcat-Adapter-Docs](https://ncadoc.yilx.cc/)查看文档**

#### 连接方式

[前往 Napcat-Adapter-Docs 查看](https://ncadoc.yilx.cc/get-started.html#%F0%9F%94%A8%E5%AE%89%E8%A3%85)


#### 关于文件

* WebSocket 支持小文件（图片、视频、音频、文件等任何形式的数据）传输，但单帧最大为 16MB，因此文件传输大小被限制为 10MB。超过 10MB 的文件将调用Bot.uploadFile尝试上传并获取URL，若Bot.uploadFile不存在则直接让 NapCat 读取本地文件。
* 如果有大文件传输需求，请确保 NapCat.OneBot 可以访问 Miao-Yunzai 的目录，因使用绝对路径，需让 NapCat.OneBot 访问的路径与真实路径一致。

[前往 Napcat-Adapter-Docs 查看](https://ncadoc.yilx.cc/qa/file.html)


#### 支持

| 功能                | 支持情况 |
| ----------------- | ---- |
| 收发消息              | ✅    |
| 戳一戳               | ✅    |
| 合并转发、嵌套转发         | ✅    |
| 图片、图文混排、语音、视频     | ✅    |
| 文件相关              | \*✅  |
| 椰奶发表说说、公告等 API 操作 | ✅    |
| 发音乐卡片、赞我等         | ✅    |
| 事件接受              | \*✅  |

#### 常见问题

[前往 Napcat-Adapter-Docs 查看](https://ncadoc.yilx.cc/qa/)



#### 致谢

* NapCat 魔法猫娘（？）
* node-napcat-ts 本适配器依赖
* Lain-plugin 铃音插件，借鉴部分消息处理源码

#### 参与贡献

* 部分事件监听尚未编写，欢迎反馈。
* 在 `bot.yaml` 中开启 debug 日志，收到事件后将打印日志和包体。
* 可创建 issue 并附上事件包，或直接提交 PR，开发者会尽快处理。

#### 赞助

* [爱发电](https://afdian.com/a/qiannqq)
