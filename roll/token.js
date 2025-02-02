"use strict";
if (!process.env.DISCORD_CHANNEL_SECRET) {
    return;
}
const variables = {};
const sharp = require('sharp');
const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');
const fs = require('fs');


const gameName = function () {
    return '【製作Token】.token'
}

const gameType = function () {
    return 'Tool:Token:hktrpg'
}
const prefixs = function () {
    return [{
        first: /^\.token$/i,
        second: null
    }]
}
const getHelpMessage = function () {
    return `【製作Token】.token
用來製作跑團Token的功能
可以自定兩行名字和圖片內容

使用方法:
reply 或傳送一張圖片時，輸入.token 不然會使用你的頭像 作為token
然後一行一句內容，作為圖片上的名字
如.token 
Sad
HKTRPG

`
}
const initialize = function () {
    return variables;
}

const rollDiceCommand = async function ({
    inputStr,
    mainMsg,
    discordClient,
    discordMessage
}) {
    let rply = {
        default: 'on',
        type: 'text',
        text: ''
    };
    switch (true) {
        case /^help$/i.test(mainMsg[1]): {
            rply.text = this.getHelpMessage();
            rply.quotes = true;
            return rply;
        }
        case /^\S/.test(mainMsg[1]) || !mainMsg[1]: {
            //get avatar  or reply message image
            try {
                const text = await getName(discordMessage, inputStr, mainMsg)
                const avatar = await getAvatar(discordMessage, discordClient)
                if (!avatar) {
                    rply.text = `沒有找到reply 的圖示, 請再次檢查 \n\n${this.getHelpMessage()}`
                }
                const response = await getImage(avatar);

                const d = new Date();
                let time = d.getTime();
                let name = `temp_${time}_${text.text}.png`

                const token = await tokernMaker(response, name);

                let newImage = await addTextOnImage(token, text.text, text.secondLine, name)
                if (!newImage) {
                    rply.text = `製作失敗，可能出現某些錯誤。 \n\n${this.getHelpMessage()}`
                }
                rply.sendImage = `./temp/finally_${name}`;
                return rply;
            } catch (error) {
                console.log('error', error)
            }
            return;
        }
        default: {
            break;
        }
    }
}
const getAvatar = async (discordMessage, discordClient) => {
    if (discordMessage.type == 'DEFAULT' && discordMessage.attachments.size == 0) {
        const member = (discordMessage.guild && await discordMessage.guild.members.fetch(discordMessage.author) || discordMessage.author)
        return member.displayAvatarURL();
    }
    if (discordMessage.type == 'DEFAULT' && discordMessage.attachments.size > 0) {
        const url = discordMessage.attachments.find(data => data.contentType.match(/image/i))
        return (url && url.url) || null;
    }
    if (discordMessage.type == 'REPLY') {
        const channel = await discordClient.channels.fetch(discordMessage.reference.channelId);
        const referenceMessage = await channel.messages.fetch(discordMessage.reference.messageId)
        const url = referenceMessage.attachments.find(data => data.contentType.match(/image/i))
        return (url && url.url) || null;
    }
}

const getName = async (discordMessage, inputStr) => {
    /**  if (!mainMsg[1]) {
          const member = await discordMessage.guild.members.fetch(discordMessage.author)
          let nickname = member ? member.displayName : discordMessage.author.username;
          return { text: nickname, secondLine: '' }
      }
      else */
    {
        let line = inputStr.replace(/^\s?\S+\s?/, '').split("\n");
        if (line[2]) line.shift();
        return { text: line[0], secondLine: line[1] || '' }
    }

}


const getImage = async url => {
    //	const response = await axios(url, { responseType: 'arraybuffer' })
    //	const buffer64 = Buffer.from(response.data, 'binary').toString('base64')
    //	return buffer64
    return (await axios({ url, responseType: "arraybuffer" })).data;
}
const tokernMaker = async (imageLocation, name) => {
    try {

        let image = await sharp(imageLocation).resize({ height: 387, width: 375, fit: 'outside' })
        await image.toFile(`./temp/new_${name}`)
        let newImage = await sharp((`./temp/new_${name}`))
        let metadata = await newImage.metadata();
        const width = (metadata.width < 375) ? metadata.width : 375;
        const height = (metadata.height < 387) ? metadata.height : 387;
        const left = ((metadata.width - 375) / 2) < 0 ? sharp.gravity.center : parseInt((metadata.width - 375) / 2);
        const top = ((metadata.height - 387) / 2) < 0 ? sharp.gravity.center : parseInt((metadata.height - 387) / 2);
        newImage = await newImage.extract({ left, top, width, height }).toBuffer()
        newImage = await sharp('./views/image/ONLINE_TOKEN.png')
            .composite(
                [{ input: newImage, blend: 'saturate', top: 28, left: 73 }
                ]
            )
            .toBuffer()
        fs.unlinkSync(`./temp/new_${name}`);
        return newImage;
    } catch (error) {
        console.log('#token 142 error', error)
    }
}

async function addTextOnImage(token, text = ' ', text2 = ' ', name) {
    try {
        const svgImage = `
	  <svg width="520" height="520">
		<style>
		.outline {     paint-order: stroke;     stroke: black;     stroke-width: 5px; }
		.title { fill: #bbafaf; font-size: 62px; font-weight: bold;}
		.shadow {
			-webkit-filter: drop-shadow( 3px 3px 2px rgba(0, 0, 0, .7));
			filter: drop-shadow( 3px 3px 2px rgba(0, 0, 0, .7));
			/* Similar syntax to box-shadow */
		  }
		</style>
		<text x="50%" y="83%" text-anchor="middle" class="title shadow outline">${text}</text>
		<text x="50%" y="96%" text-anchor="middle" class="title shadow outline">${text2}</text>
	  </svg>
	  `;
        const svgBuffer = Buffer.from(svgImage);
        let image = await sharp(token)
            .composite([
                {
                    input: svgBuffer,
                    top: 0,
                    left: 0,
                },
            ])
        await image.toFile(`./temp/finally_${name}`)
        return true;
    } catch (error) {
        return null;
    }
}


const discordCommand = [

];

module.exports = {
    rollDiceCommand,
    initialize,
    getHelpMessage,
    prefixs,
    gameType,
    gameName,
    discordCommand
};