import { NCWebsocket } from "node-napcat-ts";
import { nccommon } from "../lib/index.js";
import path from 'path'
import fs from 'fs'

class ncadapter {
    constructor(cfg) {
        this.cfg = cfg
        const napcat = new NCWebsocket(cfg)
        this.napcat = napcat
        this.isLoadingComple = false
    }
    /**
     * NC初始化
     */
    async init() {
        nccommon.mark({ nickname: 'NapCat', uin: '未连接' }, `NC初始化`)
        await this.napcat.connect()
        const { nickname, user_id } = await this.napcat.get_login_info()
        /** 事件监听 */
        this.napcat.on('message', (data) => {
            if(data?.group_id) return this.dealEvent(data, ['message', 'message.group'])
            return this.dealEvent(data, ['message', 'message.private'])
         })
        this.napcat.on('request', (data) => this.dealRequest(data))
        this.napcat.on('notice', (data) => this.dealNotice(data))

        this.bot = {
            nickname,
            uin: user_id
        }
        nccommon.mark(this.bot, `已连接`)
        // 调试，全局声明napcat
        global.napcat = this.napcat
        
        await this.pb()
        await this.BotInit()
    }
    /** 开启一个可以自己编写新魔法的奇妙魔法阵 */
    async pb() {
        let icqq
        for (const i of ["Model", "node_modules"]) try {
            const dir = `${path.resolve(process.cwd(), i)}/icqq/`
            fs.statSync(dir)
            icqq = (await import(`file://${dir}lib/core/index.js`)).default
            break
        } catch (err) {
            icqq = err
        }
        Bot.icqq = icqq
    }
    domain() {
        return [
            "aq.qq.com",
            "buluo.qq.com",
            "connect.qq.com",
            "docs.qq.com",
            "game.qq.com",
            "gamecenter.qq.com",
            "haoma.qq.com",
            "id.qq.com",
            "kg.qq.com",
            "mail.qq.com",
            "mma.qq.com",
            "office.qq.com",
            "openmobile.qq.com",
            "qqweb.qq.com",
            "qun.qq.com",
            "qzone.qq.com",
            "ti.qq.com",
            "v.qq.com",
            "vip.qq.com",
            "y.qq.com"
        ]
    }
    async BotInit() {

        Bot[this.bot.uin] = {
            bkn: '',
            cookies: {},
            fl: new Map(),
            gl: new Map(),
            gml: new Map(),
            guilds: new Map(),
            adapter: 'OneBotv11',
            uin: this.bot.uin,
            nickname: this.bot.nickname,
            tiny_id: '',
            avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${this.bot.uin}`,
            pickGroup: (group_id) => this.pickGroup(Number(group_id)),
            makeForwardMsg: (msgList) => this.makeForwardMsg(msgList),
            pickUser: (user_id) => this.pickUser(user_id),
            pickFriend: (user_id) => this.pickFriend(user_id),
            pickMember: (gid, uid) => this.pickMember(gid, uid),
            setEssenceMessage: (message_id) => this.addEssence(message_id),
            removeEssenceMessage: (message_id) => this.removeEssence(message_id),
            getMsg: async (message_id) => {
                let info = await this.napcat.get_msg({ message_id });
                if(!info) throw new Error(`消息不存在`);
                if(info?.group_id) {
                    if(info.message?.length == 0) info.message_id = Math.random().toString().slice(2,12); // 消息不存在则随机生成一个msgid
                    let group = await Bot[this.bot.uin].gl.get(info.group_id)
                    info.group_name = group?.group_name || info.group_id
                    info.atme = !!info.message.find(i => i.type === 'at' && i.data?.qq === this.bot.uin)
                }
                let res = await nccommon.getMessage(info.message, null, true, this.bot.uin, this.napcat)
                info = Object.assign(info, res)
                return info
            },
            getSystemMsg: async () => {
                let info = await this.napcat.get_group_system_msg()
                let gjr = []
                let joinlist = [...info.InvitedRequest, ...info.join_requests]
                for (let item of joinlist) {
                    if(joinlist.checked) continue
                    gjr.push({
                        post_type: 'request',
                        request_type: 'group',
                        sub_type: 'add',
                        time: 0,
                        group_id: item.group_id,
                        user_id: item.invitor_uin,
                        comment: item.message,
                        flag: item.request_id,
                        seq: item.request_id,
                        approve: async(approve = true) => {
                            try {
                                await this.napcat.set_group_add_request({ flag: item.request_id, approve })
                            } catch (error) {
                                return false
                            }
                            return true
                        },
                        group_name: item.group_name,
                        tips: '',
                        inviter_id: undefined,
                        nickname: item.invitor_nick
                    })
                }
                return gjr
            },
            stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
            version: {
                ...(await this.napcat.get_version_info()),
                id: `QQ`,
                name: `OneBotv11`,
                get version() {
                    return `${this.app_name} v${this.app_version}`
                }
            },
            hookSendMsg: async (group_id, msg, msgid = false, user_id, recall, isHook) => { return { isNext: true, data: { group_id, msg, msgid, user_id, recall, isHook } } }
        }


        /** 合并Bot，兼容老旧不规范插件 */
        /** 或许有其他解决方法 */
        // for (let i in Bot[this.bot.uin]) {
        //     try {
        //         delete Bot[i]
        //         Bot[i] = Bot[this.bot.uin][i]
        //     } catch (error) { }
        // }

        Bot.nickname = this.bot.nickname
        Bot.uin = this.bot.uin

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
     * 处理request事件
     * @param data
     */
    async dealRequest(data) {
        nccommon.debug(this.bot, `收到request事件`)
        nccommon.debug(this.bot, data)
        let event
        switch (data.request_type) {
            case 'friend':
                event = ['request', 'request.friend']
                nccommon.info(this.bot, `收到好友请求`, `${data.user_id}`)
                data.sub_type = 'add'
                data.seq = data.flag
                break
            case 'group':
                event = ['request', 'request.group']
                if(data.sub_type === 'add') {
                    event.push('request.group.add')
                    nccommon.info(this.bot, `收到加群申请`, `${data.user_id}申请加入${data.group_id}`)
                } else {
                    event.push('request.group.invite')
                    nccommon.info(this.bot, `收到邀请加群`, `${data.user_id}邀请机器人加入${data.group_id}`)
                }
                let ginfo = await this.napcat.get_group_info({ group_id: data.group_id })
                if(ginfo) data = Object.assign({}, ginfo, data)
                data.seq = data.flag
                break
        }
        return this.dealEvent(data, event)
    }
    /**
     * 处理通知事件
     * @param data 
     */
    async dealNotice(data) {
        nccommon.debug(this.bot, `收到通知事件`)
        nccommon.debug(this.bot, data)
        let minfo = {}
        let event  = []
        let body
        switch (data.notice_type) {
            case 'friend_add':
                event = ['notice', 'notice.friend', 'notice.friend.increase'];
                nccommon.info(this.bot, `好友增加`, `${data.user_id}`);
                let finfo = await this.napcat.get_friend_list({ no_cache: true });
                finfo = finfo.find((f) => f.user_id == data.user_id);
                if(!finfo) break; //单向好友
                body = {
                    class_id: 0,
                    nickname: finfo.nickname,
                    remark: finfo.remark || finfo.nickname,
                    sex: finfo.sex,
                    user_id: finfo.user_id,
                    user_uid: ''
                };
                Bot[this.bot.uin].fl.set(data.user_id, body);
                Bot.fl.set(data.user_id, body);
                break;
            case 'group_admin':
                event = ['notice', 'notice.group', 'notice.group.admin'];
                nccommon.info(this.bot, `群管理变更`, `${data.user_id}被${data.sub_type}群${data.group_id}管理员`);
                minfo = await this.napcat.get_group_member_list({ group_id: data.group_id, no_cache: true });

                minfo = minfo.find(m => m.user_id == data.user_id);

                body = {
                    ...minfo,
                    shutup: minfo.shut_up_timestamp,
                    user_uid: '',
                    update_time: 0
                };
                Bot[this.bot.uin].gml.get(data.group_id).set(data.user_id, body);
                Bot.gml.get(data.group_id).set(data.user_id, body);
                data.sub_type = 'admin';
                break;
            case 'group_increase':
                event = ['notice', 'notice.group', 'notice.group.increase'];
                nccommon.info(this.bot, `群员增加`, `${data.user_id}加入群${data.group_id}，处理人：${data.operator_id}`);
                minfo = await this.napcat.get_group_member_list({ group_id: data.group_id, no_cache: true });

                minfo = minfo.find(m => m.user_id == data.user_id);
                body = {
                    ...minfo,
                    shutup: minfo.shut_up_timestamp,
                    user_uid: '',
                    update_time: 0
                };

                Bot[this.bot.uin].gml.get(data.group_id).set(data.user_id, body);
                Bot.gml.get(data.group_id).set(data.user_id, body);

                data.sub_type = 'increase';
                break;
            case 'group_decrease':
                event = ['notice', 'notice.group', 'notice.group.decrease'];
                let quitMsg;
                if(data.sub_type == 'leave') {
                    quitMsg = `退出`
                } else {
                    quitMsg = `被${data.operator_id}踢出`
                };
                nccommon.info(this.bot, `群员减少`, `${data.user_id}${quitMsg}群${data.group_id}`);
                Bot[this.bot.uin].gml.get(data.group_id).delete(data.user_id);
                Bot.gml.get(data.group_id).delete(data.user_id);
                data.sub_type = 'decrease';
                break;
            case 'group_ban':
                if(data.sub_type) {
                    nccommon.info(this.bot, `群${data.group_id}成员${data.user_id}被${data.operator_id}禁言${data.duration}秒`)
                } else {
                    nccommon.info(this.bot, `群${data.group_id}成员${data.user_id}被${data.operator_id}解除禁言`)
                };
                minfo = Bot[this.bot.uin].gml.get(data.group_id).get(data.user_id);
                minfo.shut_up_timestamp = (Date.now() / 1000) + data.duration;
                minfo.shutup_time = (Date.now() / 1000) + data.duration;
                minfo.shutup = data.duration;
                break;
            case 'notify':
                if(data.sub_type == 'poke') {
                    if(data?.group_id) {
                        data.notice_type == 'group'
                        nccommon.info(this.bot, `群${data.group_id}成员${data.target_id}被${data.user_id}戳一戳`)
                    } else { 
                        data.notice_type == 'friend'
                        nccommon.info(this.bot, `好友${data.target_id}被${data.user_id}戳一戳`)
                    }
                }
                event = ['notice', `notice.${data.notice_type}`, `notice.${data.notice_type}.poke`]
                break
        };
        this.dealEvent(data, event)
    }
    /**
     * 处理事件
     * 感谢止语姐姐留下的遗产(bushi)
     * @param data 
     * @returns 
     */
    async dealEvent(data, event = []) {
        if(event?.length == 0) return;
        const { post_type, group_id, user_id, message_type, message_id, sender } = data
        /** 初始化e */
        let e = data
        e.bot = Bot[this.bot.uin]
        if(event.includes('message')) {
            e.sub_type = message_type
        }

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
                e.seq = seq || message_id
                e.group_name = raw_group_name
                e.operator_id = user_id
                nccommon.info(this.bot, `${raw_group_name}(${group_id})`, `<=`, `${e.nickname}(${user_id})：${data.raw_message}`)
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
                        let res = true
                        try {
                            await this.napcat.set_group_ban({ group_id, user_id, duration: time })
                        } catch (error) { res = false } //报错不处理
                        return res
                    }
                }
                e.sender.getAvatarUrl = (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`
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
                e.log_message && nccommon.info(this.bot, `<=`, `私聊:${sender?.nickname || sender?.card}(${user_id})：${e.log_message}`)
                e.friend = { ...this.pickFriend(user_id) }
            }
        }
        /** 通知事件 */
        const noticePostType = async function () {
            if (e.sub_type === 'poke') {
                e.action = e?.poke_detail?.action || `戳了戳`
                e.raw_message = `${e.operator_id} ${e.action} ${e.user_id}`
                e.operator_id = e.user_id
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
                            // return await api.set_friend_add_request(this.bot.uin, e.flag, approve)
                            return await this.napcat.set_friend_add_request({ flag: e.flag, approve, remark: '' })
                        } else {
                            return false
                        }
                    }
                    break
                }
                case 'group': {
                    try {
                        let gl = Bot[this.bot.uin].gl.get(e.group_id)
                        let fl = await this.napcat.get_stranger_info({ user_id: e.user_id })
                        e = { ...e, ...gl, ...fl }
                        e.group_id = Number(data.group_id)
                        e.user_id = Number(data.user_id)
                    } catch { }
                    e.approve = async (approve = true) => {
                        // if (e.flag) return await api.set_group_add_request(this.bot.uin, e.flag, e.sub_type, approve)
                        if(e.flag) return await this.napcat.set_group_add_request({ flag: e.flag, approve, reason: '' })
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
        e.reply = async (msg, quote, recall = {}) => {
            if (quote) {
                return await this.sendMsg(group_id, msg, message_id, user_id, recall)
            } else {
                return await this.sendMsg(group_id, msg, null, user_id, recall)
            }
        }
        /** 获取对应用户头像 */
        e.getAvatarUrl = (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`

        /** 添加适配器标识 */
        e.adapter = 'NapCat'

        /** 某些事件需要e.bot，走监听器没有。 */
        e.bot = Bot[this.bot.uin]

        /** 资源未完成加载可能存在问题，提示一下 */
        if(typeof this.isLoadingComple === 'boolean' && !this.isLoadingComple) {
            nccommon.warn(this.bot, logger.yellow(`资源未完成加载，可能会存在问题`))
        }

        Promise.all(event.map(i => {
            Bot.emit(i, e)
        }))
    }
    pickUser(user_id) {
        return {
            makeForwardMsg: (msgs) => this.makeForwardMsg(msgs),
            getAvatarUrl: (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`,
            recallMsg: async (msg_id) => await this.recallMsg(msg_id),
            addFriendBack: async (seq, remark = '') => await this.addFriendBack(seq, remark),
            sendMsg: async (msg) => await this.sendMsg(null, msg, null, user_id),
            getChatHistory: async (seq, c) => await this.getChatHistory(user_id, seq, c, true),
            thumbUp: async(times) => await this.thumbUp(user_id, times),
            getSimpleInfo: async() => await this.getSimpleInfo(user_id),
            markRead: async(times) => await this.makeRead(user_id),
            setFriendReq: async(seq, yes = true, remark = '', block = false) => await this.setFriendReq(seq, yes, remark),
            setGroupReq: async(gid, seq, yes = true, reason = '', block = false) => await this.setGroupReq(seq, yes, reason),
            setGroupInvite: async(gid, seq, yes = true, block = false) => await this.setGroupReq(seq, yes, ''),
            user_id,
        }
    }
    pickFriend(user_id) {
        let pickUser = this.pickUser(user_id)
        let finfo = Bot[this.bot.uin].fl.get(user_id)
        return {
            ...pickUser,
            makeForwardMsg: (msgs) => this.makeForwardMsg(msgs),
            poke: async() => await this.pokeMember(null, user_id),
            delete: async(block = true) => {
                let res = true
                try {
                    await this.napcat.delete_friend({ user_id, temp_block: block, temp_both_del: true })
                } catch (error) {
                    res = false
                }
                return res
            },
            searchSameGroup: async() => {
                let gls = Array.from(Bot[this.bot.uin].gl.keys())
                let gtq = Promise.all(gls.map( i => {
                    let info = Bot[this.bot.uin].gml.get(i).get(user_id)
                    let groupName = Bot[this.bot.uin].gl.get(i).group_name
                    if(info) {
                        return {
                            groupName: groupName,
                            Group_Id: info.group_id
                        }
                    }
                } ))
                return (await gtq).filter(item => item !== undefined)
            },
            ...finfo
        }
    }
    /**
     * 群对象
     * @param group_id 
     */
    pickGroup(group_id) {
        let is_admin = Bot[this.bot.uin]?.gml.get(group_id)?.get(this.bot.uin)?.role === 'admin'
        let is_owner = Bot[this.bot.uin]?.gml.get(group_id)?.get(this.bot.uin)?.role === 'owner'
        let name = (Bot[this.bot.uin]?.gl.get(group_id))?.group_name || group_id
        let ginfo = Bot[this.bot.uin]?.gl.get(group_id)
        let meinfo = Bot[this.bot.uin]?.gml.get(group_id).get(this.bot.uin)
        let mute_left = meinfo?.shut_up_timestamp - Date.now() / 1000
        return {
            name,
            is_admin,
            is_owner,
            ...ginfo,
            sendMsg: async (msg, isHook = false) => await this.sendMsg(group_id, msg, null, null, null, isHook),
            makeForwardMsg: (msgs) => this.makeForwardMsg(msgs),
            recallMsg: async (msg_id) => await this.recallMsg(msg_id),
            setName: async (name) => await this.setName(group_id, name),
            setAvatar: async (image) => await this.setAvatar(group_id, image),
            muteAll: async (enable) => await this.muteAll(group_id, enable),
            muteMember: async (user_id, enable = 600) => await this.muteMember(group_id, user_id, enable),
            muteAnony: async (uid) => false, // 无效功能
            kickMember: async (user_id, msg, block) => await this.kickMember(group_id, user_id, block),
            pokeMember: async (user_id) => await this.pokeMember(group_id, user_id),
            setCard: async (uid, card) => await this.setCard(group_id, uid, card),
            setAdmin: async (uid, yes) => await this.setAdmin(group_id, uid, yes),
            setTitle: async (uid, title, duration = -1) => await this.setTitle(group_id, uid, title, duration),
            invite: async (uid) => false, // 无效功能
            quit: async () => await this.groupQuit(group_id),
            getAnonyInfo: async () => false, // 无效功能
            allowAnony: async () => false, // 无效功能
            getChatHistory: async(seq, c) => await this.getChatHistory(group_id, seq, c),
            markRead: async(seq = 0) => await this.makeRead({ group_id }),
            // getFileUrl, 没整明白，暂时不写
            // shareMusic, 没整明白，暂时不写
            getMemberMap: async(no_cache = false) => await this.getMemberMap(group_id, no_cache),
            getAvatarUrl: (size = 0, history = 0) => this.getAvatarUrl(group_id, size, history),
            pickMember: (uid) => this.pickMember(group_id, uid),
            getAtAllRemainder: async () => await this.getAtAllRemainder(group_id),
            renew: async () => Bot[this.bot.uin].gl.get(group_id), // 无效功能，用gl代替
            addEssence: async (seq, rand) => await this.addEssence(seq, rand),
            removeEssence: async (seq, rand) => await this.removeEssence(seq, rand),
            announce: async(content) => await this.announce(group_id, content),
            mute_left,
        }
    }
    /**
     * 处理加群请求
     * @param flag 
     * @param approve 
     * @param reason 
     */
    async setGroupReq(flag, approve, reason) {
        let res = true
        try {
            await this.napcat.set_group_add_request({ flag, approve, reason })
        } catch (error) {
            res = false
        }
        return res
    }
    /**
     * 处理好友请求
     * @param flag 
     * @param approve 
     * @param remark 
     * @returns 
     */
    async setFriendReq(flag, approve, remark) {
        let res = true
        try {
            await this.napcat.set_friend_add_request({ flag, approve, remark })
        } catch(err) {
            res = false
        }
        return res
    }
    /**
     * 已读
     * @param user_id 
     * @param times 
     * @returns 
     */
    async markRead(user_id, times) {
        let res = true
        try {
            await this.napcat.mark_private_msg_as_read({ user_id })
        } catch (error) {
            res = false
        }
        return res
    }
    /**
     * 你谁
     * @param user_id 
     * @returns 
     */
    async getSimpleInfo(user_id){
        let res
        try {
            res = await this.napcat.get_stranger_info({ user_id })
        } catch (error) {
            return
        }
        return {
            class_id: 0,
            ...res,
            user_uid: ''
        }
    }
    /**
     * 赞
     * @param user_id 
     * @param times 
     * @returns 
     */
    async thumbUp(user_id, times) {
        let res = true
        try {
            await this.napcat.send_like({ user_id, times })
        } catch (error) {
            res = false
        }
        return res
    }
    /**
     * 回添双向好友（不建议开启允许任何人添加或填写答案自动同意，napcat没有针对单向好友的事件通知，拿不到seq，这是通过发包来实现的，因为我也拿不到seq所以我没做测试不知道能不能用）
     * @param seq 好友申请序号
     * @param remark 备注
     * @returns 
     */
    async addFriendBack(seq, remark = '') {
        let body = Buffer.from(Bot.icqq.pb.encode({
            1: 1,
            2: Number(seq),
            3: Number(this.bot.uin),
            4: 10,
            5: 2004,
            6: 1,
            7: 0,
            8: {
                1: 2,
                52: String(remark)
            }
        })).toString('hex')
        let res = await this.napcat.send_packet({ cmd: 'ProfileService.Pb.ReqSystemMsgAction.Friend', data: body });
        return (Bot.icqq.pb.decode(Buffer.from(res, 'hex')))[1][1] === 0;
    }
    /**
     * 发送群公告
     * @param group_id 
     * @param content 
     * @returns 
     */
    async announce(group_id, content) {
        let res = true
        try {
            await this.napcat._send_group_notice({ group_id, content })
        } catch(error) {
            res = false
            throw error
        }
        return res
    }
    /**
     * 移除群精华
     * @param seq 
     * @param rand 
     * @returns 
     */
    async removeEssence(seq, rand) {
        let res = `移除群精华成功`
        try {
            await this.napcat.delete_essence_msg({ message_id: seq })
        } catch (error) {
            res = `移除群精华失败`
            nccommon.error(this.bot.uin, res)
            nccommon.error(this.bot.uin, error)
            throw error
        }
        return res
    }
    /**
     * 群加精化
     * @param seq
     * @param rand 
     * @returns 
     */
    async addEssence(seq, rand) {
        let res = `设置精华成功`
        try {
            await this.napcat.set_essence_msg({ message_id: seq })
        } catch (error) {
            nccommon.error(this.bot.uin, `设置精华失败`)
            nccommon.error(this.bot.uin, error)
            throw error
        }
        return res
    }
    /**
     * 获取at全体成员 剩余次数
     * @param group_id 
     * @returns 
     */
    async getAtAllRemainder(group_id) {
        let res
        try {
            res = await this.napcat.get_group_at_all_remain({ group_id })
        } catch (error) { }
        return res.remain_at_all_count_for_uin
    }

    /**
     * 取群头
     * @param group_id 
     * @param size 
     * @param history 
     * @returns 
     */
    getAvatarUrl(group_id, size, history) {
        let history_url = group_id
        if(history !== 0) {
            history_url = `${group_id}_${history}`
        }
        return `https://p.qlogo.cn/gh/${group_id}/${history_url}/${size}`
    }
    /**
     * 获取群成员列表
     * @param gid 
     * @param no_cache 
     * @returns 
     */
    async getMemberMap(gid, no_cache = false) {
        let gml = Bot[this.bot.uin].gml.get(gid)
        if(no_cache) {
            let minfo = await this.napcat.get_group_member_list({ group_id: gid, no_cache })
            await Promise.all(minfo.map(i => {
                let body = {
                    ...i,
                    shutup_time: i.shut_up_timestamp,
                    user_uid: ``,
                    update_time: 0
                }
                Bot[this.bot.uin].gml.get(gid).set(i.user_id, body);
                Bot.gml.get(gid).set(i.user_id, body);
            }))
            gml = Bot[this.bot.uin].gml.get(gid)
        }
        return gml
    }
    /**
     * 标记消息为已读
     * @param id 为对象，其中包含group_id或user_id
     */
    async makeRead(id) {
        try {
            await this.napcat.mark_msg_as_read(id)
        } catch (error) {
            throw error
        }
    }
    /**
     * 获取历史消息
     * @param group_id 
     * @param message_seq 
     * @param count 
     * @returns 
     */
    async getChatHistory(group_id, message_seq = 0, count = 20, isPrivate = false) {
        let forg
        if(isPrivate) {
            forg = {
                body: {
                    user_id: group_id,
                },
                api: 'get_friend_msg_history'
            }            
        } else {
            forg = {
                body: {
                    group_id,
                },
                api: 'get_group_msg_history'
            }
        }
        let messages = []
        try {
            messages = await this.napcat[forg.api]({ ...forg.body, message_seq, count })
        } catch (error) { }
        if(messages.length === 0) return messages

        let group
        if(!isPrivate) group = Bot[this.bot.uin].gl.get(group_id)

        messages = messages.messages

        messages = messages.map(async m => {
         if(!isPrivate) m.group_name = group?.group_name || group_id
          m.atme = !!m.message.find(msg => msg.type === 'at' && msg.data?.qq == this.bot.uin)
          let result = await nccommon.getMessage(m.message, group_id, true, this.bot.uin, this.napcat)
          m = Object.assign(m, result)
          return m
        })
        return await Promise.all(messages)
    }
    /**
     * 退群 解散群聊
     * @param group_id 
     * @returns 
     */
    async groupQuit(group_id) {
        let res = true
        try {
            await this.napcat.set_group_leave({ group_id, is_dismiss: true })
        } catch(error) {
            res = false
            throw error
        }
        return res
    }
    /**
     * 设置头衔
     * @param group_id 
     * @param user_id 
     * @param title 
     * @param duration 无效参数
     * @returns 
     */
    async setTitle(group_id, user_id, title, duration = -1) {
        let res = true
        try {
            await this.napcat.set_group_special_title({ group_id, user_id, special_title: title })
        } catch (error) {
            res = false
            throw error
        }
        return res
    }
    /**
     * 设置管理员
     * @param group_id 群ID
     * @param user_id 用户ID
     * @param enable true or false
     */
    async setAdmin(group_id, user_id, enable = true) {
        let res = true
        try {
            await this.napcat.set_group_admin({ group_id, user_id, enable })
        } catch (error) {
            res = false
            throw error
        }
        return res
    }
    /**
     * 改群名片
     * @param group_id 
     * @param user_id 
     * @param card 
     * @returns 
     */
    async setCard(group_id, user_id, card) {
        let res = true
        try {
            await this.napcat.set_group_card({ group_id, user_id, card })
        } catch (error) {
            res = false
            throw error
        }
        return res
    }
    /**
     * 戳一戳
     * @param group_id 
     * @param user_id 
     * @returns 
     */
    async pokeMember(group_id, user_id) {
        let res = true
        let gid = {}
        if(group_id) gid.group_id = group_id
        try {
            await this.napcat.send_poke({ ...gid, user_id })
        } catch (error) {
            res = false
            throw error
        }
        return res
    }
    /**
     * 改群头像
     * @param group_id 
     * @param image buffer、base64、url、file
     * @returns 
     */
    async setAvatar(group_id, image) {
        if(Buffer.isBuffer(image)) {
            image = image.toString('base64')
        } else if(typeof image == 'string' && nccommon.isLocalPath(image)) {
            image = fs.readFileSync(image, 'base64url')
            image = `base64://${image}`
        }
        let res = true
        try {
            res = await this.napcat.set_group_portrait({ group_id, file: image })
        } catch (error) {
            res = false
            throw error
        }
        return res
    }
    /**
     * 改群名
     * @param group_id 
     * @param name 
     * @returns 
     */
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
        let info = Bot[this.bot.uin].gml?.get(gid)?.get(uid)
        return {
            info,
            ...info
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
     * 发送消息
     * @param group_id 群聊填此
     * @param msg 
     * @param msgid 引用的消息ID，node等特殊消息无效
     * @param user_id 私聊填此
     * @param recall 暂时无用
     * @param isHook 是否绕过hook
     * @returns { message_id }
     */
    async sendMsg(group_id, msg, msgid = false, user_id, recall, isHook) {
        /**执行hookSendMsg，是否交由hook处理 */
        let hook
        if(!isHook) hook = await Bot[this.bot.uin].hookSendMsg(group_id, msg, msgid, user_id, recall)
        if(!hook?.isNext && !isHook) {
            return hook.res
        };
        ({ group_id, msg, msgid, user_id, recall } = hook.data);

        if(Promise.resolve(msg) === msg) {
            msg = await msg
        }
        if(!msg) return
        let { ncmsg, raw_msg, node } = await nccommon.format(msg, msgid)

        let forg
        if(group_id) {
            forg = {
                msg: `Group(${group_id})`,
                api: 'send_group_msg',
                forward: 'send_group_forward_msg',
                apiBody: {
                    group_id
                }
            }
        } else {
            forg = {
                msg: `Private(${user_id})`,
                api: 'send_private_msg',
                forward: 'send_private_forward_msg',
                apiBody: {
                    user_id
                }
            }
        }

        if (node) {
            ncmsg = await nccommon.dealNode(ncmsg)
        }

        let res
        try {
            if (node) {
                let news = {}
                if (msg.data.meta.detail.news[0].text) news = { news: msg.data.meta.detail.news } // 当news不存在时，不传递news避免显示异常
                let body = { ...forg.apiBody, message: ncmsg, ...news }
                res = await this.napcat[forg.forward](body)
            } else {
                res = await this.napcat[forg.api]({ ...forg.apiBody, message: ncmsg })
            }
        } catch (error) {
            nccommon.error(this.bot, `发送消息错误`)
            throw error
        }
        if (res) {
            nccommon.info(this.bot, `send ${forg.msg}:`, raw_msg.join(' '))
        }
        return res
    }
    async LoadAll() {
        await Promise.all([this.loadGroups(), this.loadFriends(), this.loadCookies()])
        nccommon.mark(this.bot, `Welcome, ${this.bot.nickname}`)
        nccommon.mark(this.bot, `资源加载完成，加载了${Bot[this.bot.uin].fl.size}个好友，${Bot[this.bot.uin].gl.size}个群`)
        this.isLoadingComple = true
        /**设置2h30m自动刷新ck */
        setInterval(async () => {
            await this.loadCookies()
        }, 2.5 * 60 * 60 * 1000)
    }
    async loadCookies() {
        /** 并发，不然慢的要死 */
        nccommon.debug(this.bot, '加载cookies...')
        await Promise.all(this.domain().map(async (i) => {
            const ck = await this.napcat.get_cookies({ domain: i });
            Bot[this.bot.uin].cookies[i] = ck.cookies;
            if (ck.bkn) {
                Bot[this.bot.uin].bkn = ck.bkn;
            }
        }));
        nccommon.debug(this.bot, '加载cookies完成')
    }
    /**
     * 加载群列表 加载群成员缓存列表
     */
    async loadGroups() {
        let groups = await this.napcat.get_group_list({ no_cache: true })
        let _minfo = await Promise.all(groups.map(async (i) => {
            return await this.napcat.get_group_member_list({ group_id: i.group_id, no_cache: true })
        }))
        /**剔除空数组 */
        _minfo = _minfo.filter(subArray => subArray.length > 0);
        for (let i of groups) {
            /**群成员列表 */
            let memberInfo = _minfo.find(a => a[0].group_id == i.group_id )
            /**不知道为什么napcat会返回一堆不存在的群，memberInfo为空则该群不存在不再处理 */
            if(!memberInfo) continue;
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
            let body = {
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
            }
            Bot[this.bot.uin].gl.set(i.group_id, body)
            Bot.gl.set(i.group_id, body)
            /**存储成员列表 */
            for (let item of memberInfo) {
                icMemberInfo.set(item.user_id, {
                    ...item,
                    card: item.card || item.nickname,
                    shutup_time: item.shut_up_timestamp,
                    user_uid: ``,
                    update_time: 0
                })
            }
            Bot[this.bot.uin].gml.set(i.group_id, icMemberInfo)
            Bot.gml.set(i.group_id, icMemberInfo)
        }
        nccommon.debug(this.bot, `加载群成员列表完成`)
    }
    /**
     * 加载好友列表
     */
    async loadFriends() {
        let friends = await this.napcat.get_friend_list({ no_cache: true })
        for (let i of friends) {
            let body = {
                class_id: 0,
                nickname: i.nickname,
                remark: i.remark || i.nickname,
                sex: i.sex,
                user_id: i.user_id,
                user_uid: ''
            }
            Bot[this.bot.uin].fl.set(i.user_id, body)
            Bot.fl.set(i.user_id, body)
        }
        nccommon.debug(this.bot, `好友列表加载完成`)
    }
}

export default ncadapter