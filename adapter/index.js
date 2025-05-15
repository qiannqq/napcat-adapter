import { NCWebsocket, Structs } from "node-napcat-ts";
import { nccommon } from "../lib/index.js";

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
        /** 事件监听 */
        this.napcat.on('message', async (data) => Bot.emit('message', await this.dealEvent(data)))
        this.napcat.on('notice.friend_add', async (data) => Bot.emit('notice.friend.increase', await this.dealNotice(data, 'notice.friend_add')))
        this.napcat.on('request.friend', async (data) => Bot.emit('request.friend', await this.dealNotice(data, 'request.friend')))
        this.napcat.on('notice.group_admin', async (data) => Bot.emit('notice.group.admin', await this.dealNotice(data, 'notice.group_admin')))
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

        /** 获取协议信息 */
        let version_info = await this.napcat.get_version_info()
        Bot[this.bot.uin].stat = { start_time: Date.now() / 1000, recv_msg_cnt: 0 }
        Bot[this.bot.uin].apk = { display: 'QQNT', version: '0.0.0' } // napcat不传协议版本
        Bot[this.bot.uin].version = { id: 'QQ', name: version_info.app_name, version: version_info.app_version }

        /** 合并Bot，兼容老旧不规范插件 */
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
            test: true, // 标记下，视为转发消息，方便后面处理
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
                // 使用 item.nickname 和 item.user_id
                let news = {}
                if (item.message.data?.meta?.detail?.news) news.news = item.message.data.meta.detail.news
                forwardMsg.message.push({
                    type: 'node',
                    data: {
                        nickname: item.nickname || this.nickname, // 使用传入的 nickname
                        user_id: String(item.user_id || this.id), // 使用传入的 user_id 并转为字符串
                        content: item.message,
                        ...news
                    }
                });
            } catch (err) {
                nccommon.error(this.id, err);
            }
        }

        return forwardMsg;
    }
    /**
     * 处理通知事件
     * @param data 
     */
    async dealNotice(data, noticeType) {
        switch (noticeType) {
            case 'notice.friend_add':
                nccommon.info(`${this.bot.nickname}(${this.bot.uin})`, `好友增加`, `${data.user_id}`)
                let finfo = await this.napcat.get_friend_list()
                finfo = finfo.find((f) => f.user_id == data.user_id)
                Bot[this.bot.uin].fl.set(data.user_id, {
                    class_id: 0,
                    nickname: finfo.nickname,
                    remark: finfo.remark || finfo.nickname,
                    sex: finfo.sex,
                    user_id: finfo.user_id,
                    user_uid: ''
                })
                return this.dealEvent(data)
            case 'notice.group_admin':
                nccommon.info(`${this.bot.nickname}(${this.bot.uin})`, `群管理变更`, `${data.user_id}被${data.sub_type}群${data.group_id}管理员`)
                let minfo = await this.napcat.get_group_member_list({ group_id: data.group_id });

                minfo = minfo.find(m => m.user_id == data.user_id);

                (Bot[this.bot.uin].gml.get(data.group_id)).set(data.user_id, {
                    ...minfo,
                    shutup: minfo.shut_up_timestamp,
                    user_uid: '',
                    update_time: 0
                })
                return this.dealEvent(data)
        }
    }
    /**
     * 处理事件
     * 感谢止语姐姐留下的遗产(bushi)
     * @param data 
     * @returns 
     */
    async dealEvent(data) {
        const { post_type, group_id, user_id, message_type, message_id, sender } = data
        /** 初始化e */
        let e = data
        e.bot = Bot[this.bot.uin]

        /** 消息事件 */
        const messagePostType = async function () {
            /** 处理message、引用消息、toString、raw_message */
            const { message, ToString, raw_message, log_message, source, file, seq } = await nccommon.getMessage(data.message, group_id, true, this.bot.uin, this.napcat)

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

                e.nickname = sender?.nickname || sender?.card
                e.seq = seq
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
                    mute: async (time) => {
                        let res
                        try {
                            res = await this.napcat.set_group_ban({ group_id, user_id, duration: time })
                        } catch (error) { } //报错不处理
                        return res
                    }
                }
                e.group = { ...this.pickGroup(group_id) }
                /** 快速撤回 */
                e.recall = async () => {
                    let res
                    try {
                        res = await this.napcat.delete_msg({ message_id })
                    } catch (error) { } // 报错不处理
                    return res
                }
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
                let fl = await this.napcat.get_stranger_info({ user_id: Number(e.user_id) })
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
        e.reply = async (msg, quote) => {
            if (quote) {
                return await this.GsendMsg(group_id, msg, e.message_id)
            } else {
                return await this.GsendMsg(group_id, msg)
            }
        }
        /** 获取对应用户头像 */
        e.getAvatarUrl = (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`

        /** 添加适配器标识 */
        e.adapter = 'NapCat'

        /** 某些事件需要e.bot，走监听器没有。 */
        e.bot = Bot[this.bot.uin]
        return e
    }
    pickUser(user_id) {
        return {
            makeForwardMsg: (msgs) => this.makeForwardMsg(msgs)
        }
    }
    pickFriend(user_id) {
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
            recallMsg: async (msg_id) => await this.recallMsg(msg_id),
            setName: async (name) => await this.setName(group_id, name),
            // setAvatar,
            muteAll: async (enable) => await this.muteAll(group_id, enable),
            muteMember: async (user_id, enable = 600) => await this.muteMember(group_id, user_id, enable),
            // muteAnony,
            kickMember: async (user_id, msg, block) => await this.kickMember(group_id, user_id, block),
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
            pickMember: (uid) => this.pickMember(group_id, uid),
            // getAtAllRemainder,
            // renew
        }
    }
    async setName(group_id, name) {
        let res = true
        try {
            await this.napcat.set_group_name({ group_id, group_name: name })
        } catch (error) {
            throw error
        }
        return res
    }
    pickMember(gid, uid) {
        let info = (Bot[this.bot.uin].gml.get(gid)).get(uid)
        return {
            info
        }
    }
    async kickMember(group_id, user_id, reject_add_request = false) {
        let res = true
        try {
            await this.napcat.set_group_kick({ group_id, user_id, reject_add_request })
        } catch {
            res = false
        }
        return res
    }
    /**
     * 群禁言
     * @param gid 
     * @param uid 
     * @param duration 
     * @returns 
     */
    async muteMember(gid, uid, duration) {
        let res = true
        try {
            await this.napcat.set_group_ban({ group_id: gid, user_id: uid, duration })
        } catch (error) {
            res = false
        }
        return res
    }
    /**
     * 全体禁言
     * @param gid 
     * @param enable 
     */
    async muteAll(gid, enable) {
        let res = true
        try {
            await this.napcat.set_group_whole_ban({ group_id: gid, enable })
        } catch (error) {
            res = false
        }
        return res
    }
    /**
     * 撤回消息
     * @param msg_id 
     * @returns 
     */
    async recallMsg(msg_id) {
        if (!msg_id) return false
        return await this.napcat.delete_msg({ message_id: msg_id })
    }
    /**
     * 发送群消息
     * @param group_id 群ID
     * @param msg 
     * @param msgid 引用的消息ID，node等特殊消息无效
     * @returns { message_id }
     */
    async GsendMsg(group_id, msg, msgid = false) {
        let { ncmsg, raw_msg, node } = await nccommon.format(msg, msgid)

        if (node) {
            ncmsg = await nccommon.dealNode(ncmsg)
        }

        let res
        try {
            if (node) {
                let news = {}
                if (msg.data.meta.detail.news[0].text) news = { news: msg.data.meta.detail.news } // 当news不存在时，不传递news避免显示异常
                let body = { group_id, message: ncmsg, ...news }
                res = await this.napcat.send_group_forward_msg(body)
            } else {
                res = await this.napcat.send_group_msg({ group_id, message: ncmsg })
            }
        } catch (error) {
            nccommon.error(`${this.bot.nickname}(${this.bot.uin})`, `发送消息错误`)
            throw error
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