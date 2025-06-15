let orgUin = Bot.uin

Bot.uin = Object.assign([], {
    toString() {
        return this[0]
    },
    toJSON() {
        return this[0]
    },
    valueOf() {
        return this[0]
    }
})

if(Bot?.isOnline()) Bot.uin.push(orgUin)