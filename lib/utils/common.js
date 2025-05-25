import { faceMap, pokeMap } from "../index.js"
import { Structs } from "node-napcat-ts"
import fs from 'fs'
import path from "path"
import { fileURLToPath } from 'url';
import os from 'os'

export default new class nccommon {
    /**
     * 输出Info日志
     * @param botInfo BotInfo
     * @param args 
     */
    info(botInfo = '未登录', ...args) {
        logger.info(logger.blue('[NapCat]'), botInfo.nickname+ `(${botInfo.uin})`, ...args)
    }
    /**
     * 输出Mark日志
     * @param botInfo BotInfo
     * @param args 
     */
    mark(botInfo = '未登录', ...args) {
        logger.mark(logger.blue('[NapCat]'), botInfo.nickname+ `(${botInfo.uin})`, ...args)
    }
    /**
     * 输出Warn日志
     * @param botInfo BotInfo
     * @param args 
     */
    warn(botInfo = '未登录', ...args) {
        logger.warn(logger.blue('[NapCat]'), botInfo.nickname+ `(${botInfo.uin})`, ...args)
    }
    /**
     * 输出Error日志
     * @param botInfo BotInfo
     * @param args 
     */
    error(botInfo = '未登录', ...args) {
        logger.error(logger.blue('[NapCat]'), botInfo.nickname+ `(${botInfo.uin})`, ...args)
    }
    /**
     * 输出Debug日志
     * @param botInfo BotInfo
     * @param args 
     */
    debug(botInfo = '未登录', ...args) {
        logger.debug(logger.blue('[NapCat]'), botInfo.nickname+ `(${botInfo.uin})`, ...args)
    }
    /**
     * 睡觉
     * @param ms 睡多久
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
    /**
     * 标准化NC消息
     * @param msg 
     * @param message_id 是否引用
     * @param isNode 是否为合并转发内的消息
     * @returns 
     */
    async format(msg, message_id, isNode = false) {
        /** 标准化ic消息 */
        let icmsg = this.array(msg)
        /** 标准化nc消息 */
        let ncmsg = []
        /** 日志信息 */
        let raw_msg = []
        /** 是否合并转发 */
        let node = msg?.test || false
        /** 处理引用消息，API要求reply必须放在第一位 */
        if (message_id) {
            ncmsg.push(Structs.reply(message_id))
        }

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
                    if(this.isLocalPath(i?.file)) {
                        ncmsg.push(Structs.video(this.getFilePath(i.file)))
                    } else {
                        ncmsg.push(Structs.video(i?.file))
                    }
                    break
                case 'image':
                    if (this.isLocalPath(i.file) && !i.url) {
                        let file = fs.readFileSync(this.getFilePath(i.file), 'base64url')
                        i.file = `base64://${file}`
                    }
                    if(isNode) {
                        ncmsg.push(Structs.image(i.url ? i.url : i.file)) //合并转发内的图片不能传入summary、sub_type
                    } else {
                        ncmsg.push(Structs.image(i.url ? i.url : i.file, i.summary || `[图片]`, i.asface ? 1 : 0))
                    }
                    raw_msg.push(`[图片]`)
                    break
                default:
                    if (!i?.type || !i?.data) break
                    ncmsg.push({ type: i.type, data: { ...i.data } })
                    raw_msg.push(`{${i?.type}:${(JSON.stringify(i?.data))?.slice(0, 300)}}`)
                    break
            }
        }
        return { ncmsg, raw_msg, node }
    }
    /**
     * 判断是否本地路径
     * @param input 
     * @returns 
     */
    isLocalPath(input) {
        // 类型检查：非字符串直接返回 false
        if (typeof input !== 'string') return false;

        // 排除网络协议和 base64
        if (/^(?:https?|ftp|base64):\/\//i.test(input)) return false;

        // 识别 file:// 协议
        if (/^file:\/\/+/i.test(input)) return true;

        // 跨平台绝对路径检测
        const isAbsolutePath = path.posix.isAbsolute(input) || path.win32.isAbsolute(input);
        if (isAbsolutePath) return true;

        // 相对路径检测（./ 或 ../）
        if (/^\.\.?\//.test(input)) return true;

        // Windows 盘符路径检测（如 C:\）
        if (/^[a-zA-Z]:[/\\]/i.test(input)) return true;

        // 排除含冒号的非路径字符串（如 mailto:）
        if (input.includes(':')) return false;

        // 剩余情况视为本地相对路径
        return true;
    }
    /**
     * 获取标准路径
     * @param {*} filePath 
     * @returns 
     */
    getFilePath(inputPath) {
        // 处理URI协议和解码
        if (inputPath.toLowerCase().startsWith('file://')) {
            inputPath = decodeURIComponent(inputPath.slice(7));
        }
    
        // 统一替换所有路径分隔符为当前系统分隔符
        inputPath = inputPath.replace(/[\\/]+/g, path.sep);
    
        // 处理Windows特殊路径格式
        if (os.platform() === 'win32') {
            // 转换类Unix风格的绝对路径为Windows格式 (e.g. /C:/ → C:\)
            const winRootMatch = inputPath.match(/^[/\\]+([A-Za-z]):[/\\]/i);
            if (winRootMatch) {
                inputPath = `${winRootMatch[1]}:${path.sep}${inputPath.slice(winRootMatch[0].length)}`;
            }
    
            // 保留网络路径格式 (\\server\share)
            if (inputPath.startsWith('\\\\')) {
                inputPath = inputPath.replace(/\//g, '\\');
            }
        }
    
        // 标准化路径（处理..、.和多余分隔符）
        let normalized = path.normalize(inputPath);
    
        // 解析为绝对路径（自动处理相对路径）
        let absolutePath = path.resolve(normalized);
    
        // 处理Windows下的盘符大写问题
        if (os.platform() === 'win32') {
            // 确保盘符大写
            if (/^[a-z]:\\/.test(absolutePath)) {
                absolutePath = absolutePath[0].toUpperCase() + absolutePath.slice(1);
            }
            // 保留网络路径的双反斜杠
            absolutePath = absolutePath.replace(/^\\\\(?=\w)/, '\\\\');
        }
    
        return absolutePath;
    }
    /**
     * 处理合并转发消息
     * @param msg 
     */
    async dealNode(msg) {
        let nmsg = []
        for (let item of msg) {
            try {
                let { ncmsg: content } = await this.format(item.data.content, null, true)
                let otherSet = {}
                if (content[0].type === 'node') {
                    content = await this.dealNode(content)
                    otherSet.summary = '聊天记录' //嵌套消息不传入summary会导致发送失败
                    if (item.data?.news[0]?.text) otherSet.news = item.data.news
                    delete item.data?.news //删除嵌套消息中的news参数，避免消息显示异常。news参数由otherSet传入
                }

                nmsg.push({
                    type: item.type,
                    data: {
                        ...item.data,
                        content,
                        ...otherSet
                    }
                })
            } catch (error) {
                this.error(``, error)
            }
        }
        return nmsg
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
     * 获取被引用的消息
     * @param {object} i
     * @param {number} group_id
     * @return {array|false} -
     */
    async source(i, group_id, napcat) {
        /** 引用消息的id */
        const msg_id = i.data.id
        /** id不存在滚犊子... */
        if (!msg_id) return false
        let source
        try {
            let retryCount = 0

            while (retryCount < 2) {
                source = await napcat.get_msg({ message_id: msg_id })
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
     * 处理云崽的message
     * @param msg
     * @param group_id
     * @param reply 是否处理引用消息，默认处理
     * @return {Promise<{source: (*&{user_id, raw_message: string, reply: *, seq}), message: *[]}|{source: string, message: *[]}>}
     */
    async getMessage(msg, group_id, reply = true, botid, napcat) {
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
                    let minfo = Bot[Bot.uin].gml.get(group_id)?.get(Number(i.data.qq))
                    message.push({ type: 'at', qq: Number(i.data.qq), text: `@${minfo?.card || minfo?.nickname}` })
                    try {
                        let qq = Number(i.data.qq)
                        ToString.push(`{at:${qq}}`)
                        let groupMemberList = Bot[Bot.uin].gml.get(group_id)?.get(qq)
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
                        source = await this.source(i, group_id, napcat)
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
                    message.push({ ...i.data, type: 'image', md5: i.data.file.match(/([0-9A-F]{32})/i)[1] })
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
                    // redis.set(i.data.id, JSON.stringify(i.data))
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

}