import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { exec, execSync } = require("child_process");
import lodash from 'lodash'


let updateStatus = false

export class update extends plugin {
    constructor() {
        super({
            name: 'nc更新',
            dsc: '',
            event: 'message',
            priority: -500,
            rule: [
                {
                    reg: /^(#|\/)?(nc)(强制)?更新$/i,
                    fnc: 'nc更新',
                    //Permission: 'master'
                }
            ]
        });
        this.task = {
            cron: '0 30 0 * * ?',
            name: '自动更新',
            fnc: this.自动更新.bind(this)
          }
    }
    async 自动更新(){
        if(updateStatus) return false
        updateStatus = true
        try {
            let oldCommitId = await getcommitId(`napcat-adapter`)
            const gitPullCmd = 'git -C ./plugins/napcat-adapter/ pull --no-rebase';
            let ret = await execSyncc(gitPullCmd)
            const pnpmCmd = 'cd ./plugins/napcat-adapter&& pnpm i --registry=https://registry.npmmirror.com'
            await execSyncc(pnpmCmd)

            if (ret.error) {
                let stdout = ret.stdout.toString()
                let errMsg = ret.error.toString()
                let errmsgs;
                if (errMsg.includes("Timed out")) {
                    errmsgs = `连接超时`
                }
                if (/Failed to connect|unable to access/g.test(errMsg)) {
                    errmsgs = `连接失败`
                }
                if (errMsg.includes("be overwritten by merge")) {
                    errmsgs = `存在冲突，请解决冲突后再更新，或者执行#nc强制更新，放弃本地修改`
                }
                if (stdout.includes("CONFLICT")) {
                    errmsgs = `存在冲突，请解决冲突后再更新，或者执行#nc强制更新，放弃本地修改`
                }
                logger.error(`nc适配器：自动更新失败！\n${ret.error}\n${errmsgs}`)
                updateStatus = false
                return true;
            }
            let Newtime = await getTime(`napcat-adapter`)
            if (/(Already up[ -]to[ -]date|已经是最新的)/.test(ret.stdout)) {
                logger.mark(`nc适配器：自动更新未发现新版本\n最后更新时间:${Newtime}`)
                updateStatus = false
                return true;
            }
            logger.mark(`nc适配器：自动更新成功\n最后更新时间:${Newtime}`)
            let updateLog = await getLog(`napcat-adapter`, oldCommitId, {}, true)
            updateLog.join(`\n\n`)
            logger.mark(updateLog)
            updateStatus = false
            return true
        } catch {
            updateStatus = false
            return false
        }
    }
    async nc更新(e) {
        if (!e.isMaster) {
            e.reply(`暂无权限，只有主人才能操作`)
            return true;
        }

        if(updateStatus) {
            await e.reply('[napcat-adapter]操作频繁')
            return true
        }
        updateStatus = true
        try {
            const gitPullCmd = 'git -C ./plugins/napcat-adapter/ pull --no-rebase';

            let command = gitPullCmd;

            if (e.msg.includes("强制")) {
                e.reply(`[napcat-adapter]正在执行强制更新操作，请稍等`)
                command = `git -C ./plugins/napcat-adapter/ checkout . && ${gitPullCmd}`
            } else {
                e.reply(`[napcat-adapter]正在执行更新操作，请稍等`)
            }
            let oldCommitId = await getcommitId(`napcat-adapter`)


            let ret = await execSyncc(command)
            const pnpmCmd = 'cd ./plugins/napcat-adapter&& pnpm i --registry=https://registry.npmmirror.com'
            await execSyncc(pnpmCmd)

            if (ret.error) {
                gitErr(ret.error, ret.stdout, e);
                updateStatus = false
                return true;
            }

            let msgList = [];
            let time = await getTime(`napcat-adapter`)
            if (/(Already up[ -]to[ -]date|已经是最新的)/.test(ret.stdout)) {
                await e.reply(`nc适配器已经是最新的了\n最后更新时间:${time}`)
            } else {
                await e.reply(`[napcat-adapter]nc适配器 更新成功\n最后更新时间:${time}`)
                let log = await getLog(`napcat-adapter`, oldCommitId, e)
                for (let item of log) {
                    msgList.push({
                        user_id: Bot.uin,
                        nickname: Bot.nickname,
                        message: item
                    })
                }
                try {
                    msgList = await e.group.makeForwardMsg(msgList)
                } catch (err) {
                    msgList = await e.friend.makeForwardMsg(msgList)
                }
                await e.reply(msgList)
                await e.reply(`请重启Yunzai以应用更新\n【#重启】`)
            }
            updateStatus = false
        } catch {

        }
    }
}


async function getLog(plugin, oldCommitId, e, autoUpdate = false) {
    let cm = `cd ./plugins/${plugin}/ && git log  -20 --oneline --pretty=format:"%h||[%cd]  %s" --date=format:"%m-%d %H:%M"`;
    let logAll;

    try {
        logAll = await execSync(cm, { encoding: "utf-8" });
    } catch (error) {
        logger.error(error.toString());
        //e.reply(error.toString());
    }

    if (!logAll) return false;

    logAll = logAll.split("\n");

    let log = [];
    for (let str of logAll) {
        str = str.split("||");
        if (str[0] == oldCommitId) break;
        if (str[1].includes("Merge branch")) continue;
        log.push(str[1]);
    }
    if(!autoUpdate) {
        if(Bot[e.self_id].adapter != `QQBot` && Bot[e.self_id].adapter != `QQGuild`) {
            log.push(`更多详细信息，请前往gitee查看\nhttps://gitee.com/qiannqq/napcat-adapter/commits/master\n或者前往github查看\nhttps://github.com/qiannqq/napcat-adapter/commits/master`)
        }
    }
    return log;
}
/**
 * 获取上次提交的commitId
 * @param {string} plugin 插件名称
 * @returns 
 */
async function getcommitId(plugin) {
    let cm = `git -C ./plugins/${plugin}/ rev-parse --short HEAD`;

    let commitId = await execSync(cm, { encoding: "utf-8" });
    commitId = lodash.trim(commitId);

    return commitId;
}

async function execSyncc(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr });
      });
    });
}

async function gitErr(err, stdout, e) {
    let msg = "更新失败！";
    let errMsg = err.toString();
    stdout = stdout.toString();

    if (errMsg.includes("Timed out")) {
      let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, "");
      await e.reply(msg + `\n连接超时：${remote}`);
      return;
    }

    if (/Failed to connect|unable to access/g.test(errMsg)) {
      let remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, "");
      await e.reply(msg + `\n连接失败：${remote}`);
      return;
    }

    if (errMsg.includes("be overwritten by merge")) {
      await e.reply(
        msg +
        `存在冲突：\n${errMsg}\n` +
        "请解决冲突后再更新，或者执行#强制更新，放弃本地修改"
      );
      return;
    }

    if (stdout.includes("CONFLICT")) {
      await e.reply([
        msg + "存在冲突\n",
        errMsg,
        stdout,
        "\n请解决冲突后再更新，或者执行#强制更新，放弃本地修改",
      ]);
      return;
    }

    await e.reply([errMsg, stdout]);
}

async function getTime(plugin){
    let cm = `cd ./plugins/${plugin}/ && git log -1 --oneline --pretty=format:"%cd" --date=format:"%m-%d %H:%M"`;

    let time = "";
    try {
      time = await execSync(cm, { encoding: "utf-8" });
      time = lodash.trim(time);
    } catch (error) {
      logger.error(error.toString());
      time = "获取时间失败";
    }
    return time;
}