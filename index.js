const Discord = require('discord.js')
const client = new Discord.Client()
const nodemailer = require("nodemailer")

const url = process.env.URL || "localhost:80"

const mysql = require('mysql')
const sha1 = require('sha1')
const { v4: uuidv4 } = require('uuid')

const fs = require('fs')
const secureData = (fs.existsSync(`./token.json`)) ? require('./token.json') : {
  "token": process.env.token,
  "user": process.env.user,
  "pass": process.env.pass,
  "host": process.env.host,
  "port": process.env.smtp_port,
  "guildID": process.env.guildID
}

let queryDB = (query) => new Promise((resolve, reject) => {
  const connection = mysql.createConnection(process.env.CLEARDB_DATABASE_URL || {
    host: secureData.DBhost,
    user: secureData.DBuser,
    password: secureData.DBpassword,
    database: secureData.DBdatabase
  })

  connection.connect()
  connection.query(query, (error, results, fields) => {
    if (error) reject(error)
    else resolve({results, fields})
  })
  connection.end()
})

//
// DISCORD
//
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)

  //create db
  let res = queryDB('CREATE TABLE IF NOT EXISTS verification(user varchar(100), code varchar(100), guild varchar(100))')
})

client.on('message', async msg => {
  // ignore bot messages
  if (msg.author.bot) return

  // Responses to DMs
  if (msg.channel.type === 'dm') {
    try {
      const guildObj = client.guilds.cache.find(g => g.id === secureData.guildID)
      if (!guildObj) throw new Error("Bad fetch: guild not found")
      const verifiedRole = guildObj.roles.cache.find(id => id.name === "Verified")
      const author = guildObj.members.cache.find(m => m.id === msg.author.id)

      // verifying UNSW id validity
      const zID = RegExp('((z)([0-9]{6}))')
      if (!author.roles.cache.has(verifiedRole.id)) {
        if (zID.test(msg.content)) {
          try {
            let transporter = nodemailer.createTransport({
              host: secureData.host,
              port: secureData.port,
              secure: true,
              auth: {
                user: secureData.user, 
                pass: secureData.pass, 
              }
            })
            
            let code = sha1(author.id + uuidv4())
            try {
              await queryDB(`DELETE FROM verification WHERE user='${author.id}'`)
              await queryDB(`INSERT INTO verification (user, code, guild) VALUES('${author.id}', '${code}', '${guildObj.id}')`)  

              let link = `${url}/verify/${code}`

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
      }
    } catch (error) {
      console.error(error)
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
