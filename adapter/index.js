import { NCWebsocket, Structs } from "node-napcat-ts";
import { nccommon } from "../lib/index.js";
import { faceMap, pokeMap } from "../lib/face.js";
import fs from 'fs'

class ncadapter {
    constructor(cfg) {
        this.cfg = cfg
        const napcat = new NCWebsocket({
            baseUrl: cfg.baseUrl,
            throwPromise: true,
            reconnection: {
                enable: true,
                attempts: 10,
                delay: 5000
            }
        })
        this.napcat = napcat
    }
    /**
     * NC初始化
     */
    async init() {
        nccommon.info(`未登录`, `NC初始化`)
        await this.napcat.connect()
        const { nickname, user_id } = await this.napcat.get_login_info()
        this.napcat.on('message', async (data) => Bot.emit('message', await this.dealEvent(data)))
        this.bot = {
            nickname,
            uin: user_id
        }
        nccommon.info(`${nickname}${user_id}`, `已连接`)
        // 调试，全局声明napcat
        global.napcat = this.napcat
        await this.BotInit()
    }
    async BotInit() {
        Bot[this.bot.uin] = {
            bkn: 0,
            fl: new Map(),
            gl: new Map(),
            gml: new Map(),
            guilds: new Map(),
            adapter: 'napcat',
            uin: this.bot.uin,
            nickname: this.bot.nickname,
            tiny_id: '',
            avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${this.bot.uin}`,
            pickGroup: (group_id) => this.pickGroup(Number(group_id)),
            makeForwardMsg: (msgList) => this.makeForwardMsg(msgList),
            pickUser: this.pickUser.bind(this)
        }

        /** 合并Bot，暴力覆盖 */
        for (let i in Bot[this.bot.uin]) {
            try {
                delete Bot[i]
                Bot[i] = Bot[this.bot.uin][i]
            } catch (error) { }
        }

        /** 加载资源 */
        await this.LoadAll()
    }
    makeForwardMsg(data) {
        if (!Array.isArray(data)) data = [data];
        const forwardMsg = {
            test: true, // 标记下，视为转发消息，防止套娃
            message: [],
            data: { type: 'test', text: 'forward', app: 'com.tencent.multimsg', meta: { detail: { news: [{ text: '' }] }, resid: '', uniseq: '', summary: '' } }
        };

        // 收集需要处理的原始数据项（包含 nickname 和 user_id）
        const itemsToProcess = [];

        for (const item of data) {
            if (item?.message) {
                itemsToProcess.push(item);
            }
        }

        for (const item of itemsToProcess) {
            try {
                // 关键修改：使用 item.nickname 和 item.user_id 替换原来的 this.nickname 和 this.id
                forwardMsg.message.push({
                    type: 'node',
                    data: {
                        nickname: item.nickname || this.nickname, // 使用传入的 nickname
                        user_id: String(item.user_id || this.id), // 使用传入的 user_id 并转为字符串
                        content: item.message,
                        news: item.message.data?.meta?.detail?.news || '聊天记录'
                    }
                });
            } catch (err) {
                nccommon.error(this.id, err);
            }
        }

        return forwardMsg;
    }
    async dealEvent(data) {
        const { post_type, group_id, user_id, message_type, message_id, sender } = data
        /** 初始化e */
        let e = data
        e.bot = Bot[this.bot.uin]

        /** 消息事件 */
        const messagePostType = async function () {
            /** 处理message、引用消息、toString、raw_message */
            const { message, ToString, raw_message, log_message, source, file } = await this.getMessage(data.message, group_id)

            /** 通用数据 */
            e.message = message
            e.raw_message = raw_message
            e.log_message = log_message
            e.toString = () => ToString
            if (file) e.file = file
            if (source) e.source = source

            /** 群消息 */
            if (message_type === 'group') {
                let group_name
                let raw_group_name
                try {
                    group_name = Bot[this.bot.uin].gl.get(group_id).group_name
                    raw_group_name = group_name
                    group_name = group_name ? `${group_name}(${group_id})` : group_id
                } catch {
                    group_name = group_id
                }

                /**笨比止语姐姐，nickname、seq、group_name 都没添加！ */
                e.nickname = sender?.nickname || sender?.card
                e.seq = message_id
                e.group_name = raw_group_name
                e.operator_id = user_id
                nccommon.info(`${raw_group_name}(${group_id})`, `<=`, `${e.nickname}(${user_id})：${data.raw_message}`)
                /** 手动构建member */
                e.member = {
                    info: {
                        group_id,
                        user_id,
                        nickname: sender?.card,
                        last_sent_time: data?.time
                    },
                    card: sender?.card,
                    nickname: sender?.nickname,
                    group_id,
                    is_admin: sender?.role === 'admin' || false,
                    is_owner: sender?.role === 'owner' || false,
                    /** 获取头像 */
                    getAvatarUrl: (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`,
                    /** 禁言 */
                    mute: async (time) => await api.set_group_ban(this.bot.uin, group_id, user_id, time)
                }
                e.group = { ...this.pickGroup(group_id) }
                // let { role } = await api.get_group_member_info(this.bot.uin, group_id, this.bot.uin)
                // if (role == 'admin') e.group.is_admin = true
                // if (role == 'owner') e.group.is_owner = true
            } else {
                /** 私聊消息 */
                e.log_message && nccommon.info(this.bot.uin, `<好友:${sender?.nickname || sender?.card}(${user_id})> -> ${e.log_message}`)
                e.friend = { ...this.pickFriend(user_id) }
            }
        }
        /** 通知事件 */
        const noticePostType = async function () {
            if (e.sub_type === 'poke') {
                e.action = e?.poke_detail?.action || `戳了戳`
                e.raw_message = `${e.operator_id} ${e.action} ${e.user_id}`
            }

            if (e.group_id) {
                e.notice_type = 'group'
                e.group = { ...this.pickGroup(group_id) }
                let fl = await Bot[this.bot.uin].api.get_stranger_info(Number(e.user_id))
                e.member = {
                    ...fl,
                    card: fl?.nickname,
                    nickname: fl?.nickname
                }
            } else {
                e.notice_type = 'friend'
                e.friend = { ...this.pickFriend(user_id) }
            }
        }

        /** 请求事件 */
        const requestPostType = async function () {
            switch (e.request_type) {
                case 'friend': {
                    e.approve = async (approve = true) => {
                        if (e.flag) {
                            return await api.set_friend_add_request(this.bot.uin, e.flag, approve)
                        } else {
                            return false
                        }
                    }
                    break
                }
                case 'group': {
                    try {
                        let gl = Bot[this.bot.uin].gl.get(e.group_id)
                        let fl = await Bot[this.bot.uin].api.get_stranger_info(Number(e.user_id))
                        e = { ...e, ...gl, ...fl }
                        e.group_id = Number(data.group_id)
                        e.user_id = Number(data.user_id)
                    } catch { }
                    e.approve = async (approve = true) => {
                        if (e.flag) return await api.set_group_add_request(this.bot.uin, e.flag, e.sub_type, approve)
                        if (e.sub_type === 'add') {
                        } else {
                            // invite
                        }
                        return false
                    }
                    break
                }
                default:
            }
        }

        switch (post_type) {
            /** 消息事件 */
            case 'message':
                await messagePostType.call(this)
                break
            /** 通知事件 */
            case 'notice':
                await noticePostType.call(this)
                break
            /** 请求事件 */
            case 'request':
                await requestPostType.call(this)
                break
        }
        /** 快速回复 */
        e.reply = async (msg, quote) => await this.GsendMsg(group_id, msg)
        /** 获取对应用户头像 */
        e.getAvatarUrl = (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`

        /** 添加适配器标识 */
        e.adapter = 'NapCat'

        /** 某些事件需要e.bot，走监听器没有。 */
        e.bot = Bot[this.bot.uin]
        return e
    }
    /**
* 处理云崽的message
* @param msg
* @param group_id
* @param reply 是否处理引用消息，默认处理
* @return {Promise<{source: (*&{user_id, raw_message: string, reply: *, seq}), message: *[]}|{source: string, message: *[]}>}
*/
    async getMessage(msg, group_id, reply = true) {
        let file
        let source
        let message = []
        let ToString = []
        let log_message = []
        let raw_message = []

        for (let i of msg) {
            switch (i.type) {
                /** AT 某人 */
                case 'at':
                    message.push({ type: 'at', qq: Number(i.data.qq), text: i.data.name })
                    try {
                        let qq = i.data.qq
                        ToString.push(`{at:${qq}}`)
                        let groupMemberList = Bot[this.bot.uin].gml.get(group_id)?.[qq]
                        let at = groupMemberList?.nickname || groupMemberList?.card || qq
                        raw_message.push(`@${at}`)
                        log_message.push(at == qq ? `@${qq}` : `<@${at}:${qq}>`)
                    } catch (err) {
                        raw_message.push(`@${i.data.qq}`)
                        log_message.push(`@${i.data.qq}`)
                    }
                    break
                case 'text':
                    message.push({ type: 'text', text: i.data.text })
                    raw_message.push(i.data.text)
                    log_message.push(i.data.text)
                    ToString.push(i.data.text)
                    break
                /** 表情 */
                case 'face':
                    message.push({ type: 'face', ...i.data })
                    raw_message.push(`[${faceMap[Number(i.data.id)] || '动画表情'}]`)
                    log_message.push(`<${faceMap[Number(i.data.id)] || `动画表情:${i.data.id}`}>`)
                    ToString.push(`{face:${i.data.id}}`)
                    break
                /** 回复 */
                case 'reply':
                    if (reply) {
                        source = await this.source(i, group_id)
                        if (source && group_id) {
                            let qq = Number(source.sender.user_id)
                            let text = source.sender.nickname
                            message.unshift({ type: 'at', qq, text })
                            raw_message.unshift(`@${text}`)
                            log_message.unshift(`<回复:${text}(${qq})>`)
                        }
                    }
                    break
                /** 图片 */
                case 'image':
                    message.push({ ...i.data, type: 'image' })
                    raw_message.push('[图片]')
                    log_message.push(`<图片:${i.data?.url || i.data.file}>`)
                    ToString.push(`{image:${i.data.file}}`)
                    break
                /** 语音 */
                case 'record':
                    message.push({ type: 'record', ...i.data })
                    raw_message.push('[语音]')
                    log_message.push(`<语音:${i.data?.url || i.data.file}>`)
                    ToString.push(`{record:${i.data.file}}`)
                    break
                /** 视频 */
                case 'video':
                    message.push({ type: 'video', ...i.data })
                    raw_message.push('[视频]')
                    log_message.push(`<视频:${i.data?.url || i.data.file}>`)
                    ToString.push(`{video:${i.data.file}}`)
                    break
                /** 文件 */
                case 'file':
                    file = { ...i.data, fid: i.data.id }
                    message.push({ type: 'file', ...i.data, fid: i.data.id })
                    raw_message.push('[文件]')
                    log_message.push(`<视频:${i.data?.url || i.data.file}>`)
                    ToString.push(`{file:${i.data.id}}`)
                    /** 存一手，给获取函数 */
                    redis.set(i.data.id, JSON.stringify(i.data))
                    break
                /** 转发 */
                case 'forward':
                    message.push({ type: 'node', ...i.data })
                    raw_message.push('[转发消息]')
                    log_message.push(`<转发消息:${JSON.stringify(i.data)}>`)
                    ToString.push(`{forward:${i.data.id}}`)
                    break
                /** JSON 消息 */
                case 'json':
                    message.push({ type: 'json', ...i.data })
                    raw_message.push('[json消息]')
                    log_message.push(`<json消息:${i.data.data}>`)
                    ToString.push(i.data.data)
                    break
                /** XML消息 */
                case 'xml':
                    message.push({ type: 'xml', ...i.data })
                    raw_message.push('[xml消息]')
                    log_message.push(`<xml消息:${i.data}>`)
                    ToString.push(i.data.data)
                    break
                /** 篮球 */
                case 'basketball':
                    message.push({ type: 'basketball', ...i.data })
                    raw_message.push('[篮球]')
                    log_message.push(`<篮球:${i.data.id}>`)
                    ToString.push(`{basketball:${i.data.id}}`)
                    break
                /** 新猜拳 */
                case 'new_rps':
                    message.push({ type: 'new_rps', ...i.data })
                    raw_message.push('[猜拳]')
                    log_message.push(`<猜拳:${i.data.id}>`)
                    ToString.push(`{new_rps:${i.data.id}}`)
                    break
                /** 新骰子 */
                case 'new_dice':
                    message.push({ type: 'new_dice', ...i.data })
                    raw_message.push('[骰子]')
                    log_message.push(`<骰子:${i.data.id}>`)
                    ToString.push(`{new_dice:${i.data.id}}`)
                    break
                /** 骰子 (NTQQ废弃) */
                case 'dice':
                    message.push({ type: 'dice', ...i.data })
                    raw_message.push('[骰子]')
                    log_message.push(`<骰子:${i.data.id}>`)
                    ToString.push(`{dice:${i.data}}`)
                    break
                /** 剪刀石头布 (NTQQ废弃) */
                case 'rps':
                    message.push({ type: 'rps', ...i.data })
                    raw_message.push('[剪刀石头布]')
                    log_message.push(`<剪刀石头布:${i.data.id}>`)
                    ToString.push(`{rps:${i.data}}`)
                    break
                /** 戳一戳 */
                case 'poke':
                    message.push({ type: 'poke', ...i.data })
                    raw_message.push(`[${pokeMap[Number(i.data.id)]}]`)
                    log_message.push(`<${pokeMap[Number(i.data.id)]}>`)
                    ToString.push(`{poke:${i.data.id}}`)
                    break
                /** 戳一戳(双击头像) */
                case 'touch':
                    message.push({ type: 'touch', ...i.data })
                    raw_message.push('[双击头像]')
                    log_message.push(`<<双击头像:${i.data.id}>`)
                    ToString.push(`{touch:${i.data.id}}`)
                    break
                /** 音乐 */
                case 'music':
                    message.push({ type: 'music', ...i.data })
                    raw_message.push('[音乐]')
                    log_message.push(`<音乐:${i.data.id}>`)
                    ToString.push(`{music:${i.data.id}}`)
                    break
                /** 音乐(自定义) */
                case 'custom':
                    message.push({ type: 'custom', ...i.data })
                    raw_message.push('[自定义音乐]')
                    log_message.push(`<自定义音乐:${i.data.url}>`)
                    ToString.push(`{custom:${i.data.url}}`)
                    break
                /** 天气 */
                case 'weather':
                    message.push({ type: 'weather', ...i.data })
                    raw_message.push('[天气]')
                    log_message.push(`<天气:${i.data.city}>`)
                    ToString.push(`{weather:${i.data.city}}`)
                    break
                /** 位置 */
                case 'location':
                    message.push({ type: 'location', ...i.data })
                    raw_message.push('[位置分享]')
                    log_message.push(`<位置分享:${i.data.lat}-${i.data.lon}>`)
                    ToString.push(`{location:${i.data.lat}-${i.data.lon}}`)
                    break
                /** 链接分享 */
                case 'share':
                    message.push({ type: 'share', ...i.data })
                    raw_message.push('[链接分享]')
                    log_message.push(`<<链接分享:${i.data.url}>`)
                    ToString.push(`{share:${i.data.url}}`)
                    break
                /** 礼物 */
                case 'gift':
                    message.push({ type: 'gift', ...i.data })
                    raw_message.push('[礼物]')
                    log_message.push(`<礼物:${i.data.id}>`)
                    ToString.push(`{gift:${i.data.id}}`)
                    break
                default:
                    message.push({ type: 'text', ...i.data })
                    i = JSON.stringify(i)
                    raw_message.push(i)
                    log_message.push(i)
                    ToString.push(i)
                    break
            }
        }

        ToString = ToString.join('').trim()
        raw_message = raw_message.join('').trim()
        log_message = log_message.join(' ').trim()
        return { message, ToString, raw_message, log_message, source, file }
    }
    pickUser(user_id) {
        return {
            makeForwardMsg: (msgs) => this.makeForwardMsg(msgs)
        }
    }
    /**
     * 群对象
     * @param group_id 
     */
    pickGroup(group_id) {
        let is_admin = (Bot[this.bot.uin].gml.get(group_id))?.get(this.bot.uin)?.role === 'admin'
        let is_owner = (Bot[this.bot.uin].gml.get(group_id))?.get(this.bot.uin)?.role === 'owner'
        let name = (Bot[this.bot.uin].gl.get(group_id))?.group_name || group_id
        return {
            name,
            is_admin,
            is_owner,
            sendMsg: async (msg) => await this.GsendMsg(group_id, msg),
            makeForwardMsg: (msgs) => this.makeForwardMsg(msgs),
            // recallMsg,
            // setName,
            // setAvatar,
            // muteAll,
            // muteMember,
            // muteAnony,
            // kickMember,
            // pokeMember,
            // setCard,
            // setAdmin,
            // setTitle,
            // invite,
            // quit,
            // getAnonyInfo,
            // allowAnony,
            // getChatHistory,
            // markRead,
            // getFileUrl,
            // shareMusic,
            // getMemberMap,
            // getAvatarUrl,
            // pickMember,
            // getAtAllRemainder,
            // renew
        }
    }
    /**
     * 获取被引用的消息
     * @param {object} i
     * @param {number} group_id
     * @return {array|false} -
     */
    async source(i, group_id) {
        /** 引用消息的id */
        const msg_id = i.data.id
        /** id不存在滚犊子... */
        if (!msg_id) return false
        let source
        try {
            let retryCount = 0

            while (retryCount < 2) {
                source = await this.napcat.get_msg({ message_id: msg_id })
                if (typeof source === 'string') {
                    retryCount++
                } else {
                    break
                }
            }

            if (typeof source === 'string') {
                return false
            }

            let { raw_message } = await this.getMessage(source.message, group_id, false)

            source = {
                ...source,
                time: source.message_id,
                seq: source.message_id,
                user_id: source.sender.user_id,
                message: raw_message,
                raw_message
            }

            return source
        } catch (error) {
            logger.error(error)
            return false
        }
    }
    /**
     * 处理合并转发消息
     * @param msg 
     */
    async dealNode(msg) {
        let nmsg = []
        for (let item of msg) {
            try {
                let { ncmsg: content } = await this.format(item.data.content)
                let isSummary = false
                if (content[0].type === 'node') {
                    content = await this.dealNode(content)
                    isSummary = true
                }
                nmsg.push({
                    type: item.type,
                    data: {
                        ...item.data,
                        content,
                        summary: isSummary ? '聊天记录' : ''
                    }
                })
            } catch (error) {
                nccommon.error(this.id, error)
            }
        }
        return nmsg
    }
    async GsendMsg(group_id, msg, msgid) {
        let { ncmsg, raw_msg, node } = await this.format(msg)

        if (node) {
            ncmsg = await this.dealNode(ncmsg)
        }

        let res
        try {
            if (node) {
                let news = {}
                if(msg.data.meta.detail.news[0].text) news = { news: msg.data.meta.detail.news } // 当news不存在时，不传递news避免显示异常
                let body = { group_id, message: ncmsg, ...news }
                res = await this.napcat.send_group_forward_msg(body)
            } else {
                res = await this.napcat.send_group_msg({ group_id, message: ncmsg })
            }
        } catch (error) {
            nccommon.error(`${this.bot.nickname}(${this.bot.uin})`, `发送消息错误`)
            nccommon.error(`${this.bot.nickname}(${this.bot.uin})`, error)
        }
        if (res) {
            nccommon.info(`${this.bot.nickname}(${this.bot.uin})`, `send Group(${group_id}):`, raw_msg.join(' '))
        }
        return res
    }
    async LoadAll() {
        await Promise.all([this.loadGroups(), this.loadFriends()])
        nccommon.info(`${this.bot.nickname}(${this.bot.uin})`, `欢迎，加载了${Bot[this.bot.uin].fl.size}个好友，${Bot[this.bot.uin].gl.size}个群`)
    }
    async format(msg) {
        /** 标准化ic消息 */
        let icmsg = this.array(msg)
        /** 标准化nc消息 */
        let ncmsg = []
        /** 日志信息 */
        let raw_msg = []
        /** 是否合并转发 */
        let node = msg?.test || false

        for (let i of icmsg) {
            switch (i.type) {
                case 'text':
                    ncmsg.push(Structs.text(i.text))
                    raw_msg.push(i.text)
                    break
                case 'at':
                    ncmsg.push(Structs.at(i.qq))
                    raw_msg.push(`{at:${i.qq}}`)
                    break
                case 'face':
                    ncmsg.push(Structs.face(i.id))
                    raw_msg.push(`{face:${i.id}}`)
                    break
                case 'file':
                    //暂时不写
                    break
                case 'record':
                    ncmsg.push(Structs.record(i.file))
                    raw_msg.push(`{record}`)
                    break
                case 'video':
                    //暂时不写
                    break
                case 'image':
                    ncmsg.push(Structs.image(i.file))
                    raw_msg.push(`[图片]`)
                    break
                default:
                    ncmsg.push({ type: i.type, data: { ...i.data } })
                    raw_msg.push(`{${i.type}:${(JSON.stringify(i.data)).slice(0, 300)}}`)
                    break
            }
        }
        return { ncmsg, raw_msg, node }
    }
    /** CV的Lain-plugin 重新写巨坐牢 */
    /** 将云崽过来的消息全部统一格式存放到数组里面 */
    array(data) {
        let msg = []
        if (typeof data === 'object' && data?.test && data?.data?.type === 'test') return data.message
        /** 将格式统一为对象 随后进行转换成api格式 */
        if (data?.[0]?.data?.type === 'test' || data?.[1]?.data?.type === 'test') {
            msg.push(...(data?.[0].msg || data?.[1].msg))
        } else if (data?.data?.type === 'test') {
            msg.push(...data.msg)
        } else if (Array.isArray(data)) {
            msg = [].concat(...data.map(i => (typeof i === 'string'
                ? [{ type: 'text', text: i }]
                : Array.isArray(i)
                    ? [].concat(...i.map(format => (typeof format === 'string'
                        ? [{ type: 'text', text: format }]
                        : typeof format === 'object' && format !== null ? [format] : [])))
                    : typeof i === 'object' && i !== null ? [i] : []
            )))
        } else if (data instanceof fs.ReadStream) {
            if (fs.existsSync(data.file.path)) {
                msg.push({ type: 'image', file: `file://${data.file.path}` })
            } else {
                msg.push({ type: 'image', file: `file://./${data.file.path}` })
            }
        } else if (data instanceof Uint8Array) {
            msg.push({ type: 'image', file: data })
        } else if (typeof data === 'object') {
            msg.push(data)
        } else {
            msg.push({ type: 'text', text: data })
        }
        return msg
    }
    /**
     * 加载群列表 加载群成员缓存列表
     */
    async loadGroups() {
        let groups = await this.napcat.get_group_list()
        for (let i of groups) {
            await nccommon.sleep(50)
            /**群成员列表 */
            let memberInfo = await this.napcat.get_group_member_list({ group_id: i.group_id })
            /**ICQQ格式群成员列表 */
            let icMemberInfo = new Map()
            let join_time
            let last_sent_time
            let shutup_time_whole = 0
            if (i.group_all_shut == -1) shutup_time_whole = 1
            /**获取该群最后一次相关信息 */
            for (let a of memberInfo) {
                // 比大小来获取该群最后加群时间
                if (!join_time) {
                    join_time = a.join_time
                } else if (a.join_time > join_time) {
                    join_time = a.join_time
                }
                // 比大小来获取该群最后发言时间
                if (!last_sent_time) {
                    last_sent_time = a.last_sent_time
                } else if (a.last_sent_time > last_sent_time) {
                    last_sent_time = a.last_sent_time
                }
            }
            /**机器人在该群的信息 */
            let meInfo = {
                raw_info: memberInfo.find((item) => item.user_id == this.bot.uin),
                admin_flag: false
            }
            meInfo.shutup_time_me = meInfo.raw_info.shut_up_timestamp
            if (meInfo.raw_info.role == 'admin') meInfo.admin_flag = true
            Bot[this.bot.uin].gl.set(i.group_id, {
                group_id: i.group_id,
                group_name: i.group_name,
                member_count: i.member_count,
                max_member_count: i.max_member_count,
                owner_id: (memberInfo.find((item) => item.role === 'owner')).user_id,
                last_join_time: join_time,
                last_sent_time: last_sent_time,
                shutup_time_me: meInfo.shutup_time_me,
                shutup_time_whole,
                admin_flag: meInfo.admin_flag,
                update_time: 0
            })
            /**存储成员列表 */
            for (let item of memberInfo) {
                icMemberInfo.set(item.user_id, {
                    ...item,
                    shutup_time: item.shut_up_timestamp,
                    user_uid: ``,
                    update_time: 0
                })
            }
            Bot[this.bot.uin].gml.set(i.group_id, icMemberInfo)
        }
        nccommon.debug(`${this.bot.nickname}(${this.bot.uin})`, `加载群成员列表完成`)
    }
    /**
     * 加载好友列表
     */
    async loadFriends() {
        let friends = await this.napcat.get_friend_list()
        for (let i of friends) {
            Bot[this.bot.uin].fl.set(i.user_id, {
                class_id: 0,
                nickname: i.nickname,
                remark: i.remark || i.nickname,
                sex: i.sex,
                user_id: i.user_id,
                user_uid: ''
            })
        }
        nccommon.debug(`${this.bot.uin}(${this.bot.nickname})`, `好友列表加载完成`)
    }
}

export default ncadapter