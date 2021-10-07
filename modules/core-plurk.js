"use strict";
if (!process.env.PLURK_SWITCH) {
    return;
}
var plurkID = '';
const { PlurkClient } = require('plurk2');
const EXPUP = require('./level').EXPUP || function () { };
const courtMessage = require('./logs').courtMessage || function () { };

const msgSplitor = (/\S+/ig);
const Plurk_Client = new PlurkClient(process.env.PLURK_APPKEY, process.env.PLURK_APPSECRET, process.env.PLURK_TOKENKEY, process.env.PLURK_TOKENSECRET);
exports.analytics = require('./core-analytics');
Plurk_Client.request('Users/me')
    .then(profile => {
        console.log(`Plurk 名稱: ${profile.full_name}`);
        plurkID = profile.id;
    })
    .catch(err => console.error(err.error_text));



Plurk_Client.startComet();
Plurk_Client.request('Alerts/addAllAsFriends')
function intervalFunc() {
    Plurk_Client.request('Alerts/addAllAsFriends');
    Plurk_Client.stopComet();
    Plurk_Client.startComet();
}

setInterval(intervalFunc, 60 * 1000 * 10);


Plurk_Client.on('new_plurk', async response => {
    if (response.type != 'new_plurk') return;
    //   if (response.limited_to && response.limited_to.length == 1 && response.limited_to[0] == 0) return;

    let groupid = response.owner_id,
        userid = response.user_id,
        displayname = "",
        channelid = response.owner_id,
        userrole = (response.owner_id == response.user_id) ? 3 : 1,
        message = response.content_raw,
        inputStr = message.replace(/^\s*@hktrpg\s+/i, '');

    let target = await exports.analytics.findRollList(inputStr.match(msgSplitor));

    if (!target) {
        await nonDice(groupid, userid, displayname, response.plurk_id)
        return null
    }

    if (!message) return;
    let mainMsg = message.match(msgSplitor); // 定義輸入字串
    if (mainMsg && mainMsg.length > 1) {
        if (!mainMsg[0].match(/@HKTRPG/i)) return;
        mainMsg.shift();
    }
    else return;

    // 訊息來到後, 會自動跳到analytics.js進行骰組分析
    // 如希望增加修改骰組,只要修改analytics.js的條件式 和ROLL內的骰組檔案即可,然後在HELP.JS 增加說明.
    let rplyVal = await exports.analytics.parseInput({
        inputStr: message.replace(/^\s*@hktrpg\s+/i, ''),
        groupid: groupid,
        userid: userid,
        userrole: userrole,
        botname: "Plurk",
        displayname: displayname,
        channelid: channelid,
    });
    if (!rplyVal.text && !rplyVal.LevelUp) {
        return;
    }

    let rplyText = '';
    if (displayname) rplyText += `${displayname}\n`
    if (rplyVal.text) rplyText += `${rplyVal.text}\n`
    if (rplyVal.LevelUp) rplyText += `${rplyVal.LevelUp}`

    return sendMessage(response.plurk_id, rplyText);

});

Plurk_Client.on('new_response', async response => {
    //防止自己回應自己
    if (response.user[plurkID]) return;
    if (response.type != 'new_response') return;
    // if (response.limited_to && response.limited_to.length == 1 && response.limited_to[0] == 0) return;
    let message = response.response.content_raw;

    let groupid = response.plurk.owner_id,
        userid = response.response.user_id,
        displayname = response.user[userid].display_name,
        channelid = response.plurk.owner_id,
        userrole = (response.plurk.owner_id == response.response.user_id) ? 3 : 1,
        inputStr = message.replace(/^\s*@hktrpg\s+/i, '');

    let target = await exports.analytics.findRollList(inputStr.match(msgSplitor));

    if (!target) {
        await nonDice(groupid, userid, displayname, response.plurk_id)
        return null
    }
    if (!message) return;
    let mainMsg = message.match(msgSplitor); // 定義輸入字串


    if (mainMsg && mainMsg.length > 1) {
        if (!mainMsg[0].match(/@HKTRPG/i)) return;
        mainMsg.shift();
    }
    else return;


    // 訊息來到後, 會自動跳到analytics.js進行骰組分析
    // 如希望增加修改骰組,只要修改analytics.js的條件式 和ROLL內的骰組檔案即可,然後在HELP.JS 增加說明.
    let rplyVal = await exports.analytics.parseInput({
        inputStr: inputStr,
        groupid: groupid,
        userid: userid,
        userrole: userrole,
        botname: "Plurk",
        displayname: displayname,
        channelid: channelid,
    });
    if (!rplyVal.text && !rplyVal.LevelUp) {
        return;
    }

    let displayName = '';
    for (let i in response.user) {
        if (i == response.response.user_id)
            displayName = `${response.user[i].display_name}`

    }
    let rplyText = '';
    if (displayName) rplyText += `${displayName}\n`
    if (rplyVal.text) rplyText += `${rplyVal.text}\n`
    if (rplyVal.LevelUp) rplyText += `${rplyVal.LevelUp}`
    return sendMessage(response.plurk.plurk_id, rplyText);

})

function sendMessage(response, rplyVal) {
    try {
        Plurk_Client.request('Responses/responseAdd', { plurk_id: response, content: rplyVal.toString().match(/[\s\S]{1,300}/g)[0], qualifier: 'says' })
    } catch (error) {
        return;
    }
    return;

}
async function nonDice(groupid, userid, displayname, plurk_id) {
    await courtMessage({ result: "", botname: "Plurk", inputStr: "" })
    if (!groupid || !userid) return;
    let LevelUp = await EXPUP(groupid, userid, displayname, "", null);
    if (groupid && LevelUp && LevelUp.text) {
        sendMessage(plurk_id, LevelUp.text);
    }

    return null;
}