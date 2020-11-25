const Discord = require('discord.js')
const nodemailer = require("nodemailer")
const mysql = require('mysql')
const fs = require('fs')
const express = require('express')
const sha1 = require('sha1')
const { v4: uuidv4 } = require('uuid')
const {google} = require('googleapis')

const app = express()
const client = new Discord.Client()

const secureData = (fs.existsSync(`./token.json`)) ? require('./token.json') : {
  "token": process.env.token,
  "guildID": process.env.guildID,
  "user": process.env.user,
  "port": process.env.port,
  "clientId": process.env.clientId,
  "clientSecret": process.env.clientSecret,
  "accessToken": process.env.accessToken,
  "refreshToken": process.env.refreshToken,
  "url": process.env.URL,
}

secureData.port = process.env.PORT || 80
secureData.url = secureData.URL || `localhost`

const connection = mysql.createPool(process.env.CLEARDB_DATABASE_URL || {
  host: secureData.DBhost,
  user: secureData.DBuser,
  password: secureData.DBpassword,
  database: secureData.DBdatabase
})

// https://stackoverflow.com/questions/45653149/receive-mail-with-nodemailer-without-setting-allow-less-secure-apps-to-access
let MAIL_AUTH = {
  service: "Gmail",
  auth: {
    type: "OAuth2",
    user: secureData.user,
    clientId: secureData.clientId,
    clientSecret: secureData.clientSecret,
    accessToken: secureData.accessToken,
    refreshToken: secureData.refreshToken
  }
}

const getGmailAccess = () => {
  const oauth2Client = new google.auth.OAuth2(
    secureData.clientId,
    secureData.clientSecret,
    "https://sauravyash.com"
  );
  
  const SCOPE = [
    'https://www.googleapis.com/auth/gmail.compose'
  ]
  
  // const authUrl = 
  oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPE,
    prompt: 'consent'
  })

  oauth2Client.setCredentials({
    refresh_token: secureData.refreshToken
  })

  secureData.accessToken = oauth2Client.getAccessToken()

  MAIL_AUTH = {
    service: "Gmail",
    auth: {
      type: "OAuth2",
      user: secureData.user,
      clientId: secureData.clientId,
      clientSecret: secureData.clientSecret,
      accessToken: secureData.accessToken,
      refreshToken: secureData.refreshToken
    }
  }
}

let queryDB = (query) => new Promise((resolve, reject) => {
  connection.query(query, (error, results, fields) => {
    if (error) reject(error)
    else resolve({results, fields})
  })
})

//
// DISCORD
//
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)

  // create db
  try {
    queryDB('CREATE TABLE IF NOT EXISTS verification(user varchar(100), code varchar(100), guild varchar(100))')
  } catch (err) {
    console.error(err)
  }

  app.get('/', (req, res) => res.send('You must be a wannabe hacker hahaha'))
  
  app.get('/verify/:code', async (req, res) => {
    const code = req.params.code
    console.log("Verifying:", code)
  
    const guildObj = client.guilds.cache.find(g => g.id === secureData.guildID)
    const verifiedRole = guildObj.roles.cache.find(id => id.name === "Verified")
    
    await queryDB(`SELECT * FROM verification WHERE code=${connection.escape(code)}`)
      .then(async re => {
        const member = guildObj.members.cache.find(m => m.id === re.results[0].user)
          
        await member.roles.add(verifiedRole.id)
        member.send("You have been successfully verified!")
        res.send("Successfully verified!")
      }).catch(err => {
        console.error(err)
        res.send("Error: Invalid ID!")
      })
  })
  
  app.listen(secureData.port, () => console.log(`Example app listening at http://${secureData.url}:${secureData.port}`))
})

client.on('message', async msg => {
  // ignore bot messages
  if (msg.author.bot) return

  // Responses to DMs
  if (msg.channel.type === 'dm') {
    try {
      const guild = await client.guilds.resolve(secureData.guildID, true)
      // console.log("guildObj:", guildObj)
      if (!!guild !== true) throw new Error("Bad fetch: guild not found")
      const verifiedRole = guild.roles.cache.find(id => id.name === "Verified")
      if (!!verifiedRole !== true) throw new Error("Bad fetch: verified role not found")
      const author = await guild.members.fetch(msg.author)
      if (!!author !== true) {
        console.log(guild.members, author)
        throw new Error(`Bad fetch: author not found. dm_id: ${msg.author.id}`)
      }

      const isVerified = author.roles.cache.has(verifiedRole.id)
      console.log(isVerified)
      // author.roles.holds(verifiedRole.id)
      // verifying UNSW id validity
      const zID = RegExp('((z)([0-9]{6}))')
      if (!!isVerified == false) {
        if (zID.test(msg.content)) {
          try {
            getGmailAccess()
            let transporter = nodemailer.createTransport(MAIL_AUTH)
            
            let code = sha1(author.id + uuidv4())
            try {
              await queryDB(`DELETE FROM verification WHERE user='${author.id}'`)
              await queryDB(`INSERT INTO verification (user, code, guild) VALUES('${author.id}', '${code}', '${guild.id}')`)  

              let link = `${secureData.url}/verify/${code}`

              let info = await transporter.sendMail({
                from: `UNSW Investment Society`, // sender address
                to: `${msg.content}@ad.unsw.edu.au`, // list of receivers
                subject: "InvSoc Discord Verification", // Subject line
                text: `Hello, please verify your account with this link: ${link}`, // plain text body
                html: `<b>Verify your discord account <a href="${link}">here</a></b>`, // html body
              })

              msg.author.send(`Thanks! You should have a verification link in your UNSW email!`)
            } catch (error) {
              console.error(error)
              msg.author.send(`Sorry, but there's an error :( Please ping @admin on the server for help!`)
            }
          } catch (error) {
            console.error(error)
          }
          
        } else {
          await msg.reply(`Please type in a valid zID (format: zXXXXXXX)!`)
        }
      } else {
        await msg.author.send(`You have already been verified!`)
      }
    } catch (error) {
      console.error(error)
      msg.author.send(`Sorry, but there's an error :( Please ping @admin on the server for help!`)
    }
    // non-DM msgs
  } else {
    const verifiedRole = msg.guild.roles.cache.find(id => id.name === "Verified")
    const author = msg.guild.members.cache.find(m => m.id === msg.author.id)

    if (msg.content === '!v') {
      try {
        if (!author.roles.cache.has(verifiedRole.id)) {
          await msg.author.send(`Hello there!\nIn order to verify this account, please type your zID (zXXXXXXX)!`)
        } else {
          await msg.author.send(`You have already been verified!`)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
})

client.on('guildMemberAdd', member => {
  try {
    member.send(`Hello there!\nIn order to verify this account, please type your zID (zXXXXXXX)!`)
  } catch (e) {
    console.error(e)
  }
})

client.login(secureData.token)
