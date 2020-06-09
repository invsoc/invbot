const Discord = require('discord.js')
const client = new Discord.Client()
const nodemailer = require("nodemailer")

const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const url = process.env.URL || "https://invsoc.herokuapp.com"

const sqlite3 = require('sqlite3').verbose()
const sha1 = require('sha1')
const { v4: uuidv4 } = require('uuid')

const fs = require('fs')
const secureData = (fs.existsSync(`./token.json`)) ? require('./token.json') : {
  "token": process.env.token,
  "user": process.env.user,
  "pass": process.env.pass,
  "host": process.env.host,
  "port": process.env.smtp_port
}
const DB_LOCATION = './bot.db'

app.get('/', (req, res) => res.send('tryna be a haxor lmao get a life!'))

app.get('/verify/:code', (req, res) => {
  const code = req.params.code
  let id, guild
  const db = new sqlite3.Database(DB_LOCATION, sqlite3.OPEN_READWRITE)
  db.serialize(() => {
    db.each(`SELECT * FROM verification WHERE 'code'='${code}'`, (err, row) => {
      id = row.id
      guild = row.guild
    })
  })
  db.close()
  if (!id) res.send("Invalid ID!")

  const guildObj = client.guilds?.cache.first()
  const member = guildObj?.members?.cache.find(m => m.id === id)
  const verifiedRole = guildObj?.roles?.cache?.find(id => id.name === "Verified") || {
    id: "719161072640196648",
    name: "Verified"
  }

  member.setRoles([verifiedRole])
  member.send("You have been successfully verified!")

})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

//
// DISCORD
//

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)

  //create db
  const db = new sqlite3.Database(DB_LOCATION, sqlite3.OPEN_READWRITE)
  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS verification(id PRIMARY KEY, code, guild)')
    console.log("added db table")
  })
   
  db.close()
})

client.on('message', async msg => {
  // Responses to DMs
  if (msg.channel.type === 'dm') {
    const guildObj = client.guilds?.cache.first()
    const verifiedRole = guildObj?.roles?.cache?.find(id => id.name === "Verified") || {
      id: "719161072640196648",
      name: "Verified"
    }
  
    const author = msg.author

    // verifying UNSW id validity
    const zID = RegExp('((z)([0-9]{6}))')
    if (!author?._roles?.includes(verifiedRole.id)) {
      if (zID.test(msg.content)) {
        try {
          let transporter = nodemailer.createTransport({
            host: secureData.host,
            port: secureData.port,
            secure: true, // true for 465, false for other ports
            auth: {
              user: secureData.user, // generated ethereal user
              pass: secureData.pass, // generated ethereal password
            }
          })
          
          let code = sha1(author.id + uuidv4())

          const db = new sqlite3.Database(DB_LOCATION, sqlite3.OPEN_READWRITE)
          db.serialize(() => {
            db.run(`INSERT INTO verification (id, code, guild) VALUES('${author.id}', '${code}', '${guildObj.id}')`)
          })
          db.close()

          let link = `https://invsoc.herokuapp.com/verify/${code}`

          let info = await transporter.sendMail({
            from: `UNSW Investment Society`, // sender address
            to: `${msg.content}@ad.unsw.edu.au`, // list of receivers
            subject: "InvSoc Discord Verification", // Subject line
            text: `Hello, please verify your account with this link: ${link}`, // plain text body
            html: `<b>Verify your discord account <a href="${link}">here</a></b>`, // html body
          })
        } catch (error) {
          console.error(error)
        }
        
      } else {
        await msg.reply(`Please type in a valid zID (format: zXXXXXXX)!`)
      }
    }
    // non-DM msgs
  } else {
    const verifiedRole = msg.guild?.roles?.cache?.find(id => id.name === "Verified") || {
      id: "719161072640196648",
      name: "Verified"
    }
  
    const author = msg.guild?.members?.cache?.find(mem => mem.id === msg.author.id)

    if (msg.content === '!verify') {
      try {
        if (!author._roles.includes(verifiedRole.id)) {
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

client.login(secureData.token)
