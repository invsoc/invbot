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
  "port": process.env.smtp_port,
  "guildID": process.env.guildID
}
const DB_LOCATION = './bot.db'

app.get('/', (req, res) => res.send('You must be a wannabe hacker hahaha'))

app.get('/verify/:code', (req, res) => {
  const code = req.params.code
  console.log("Verifying:", code)

  const guildObj = client.guilds.cache.find(g => g.id === secureData.guildID)
  const verifiedRole = guildObj.roles.cache.find(id => id.name === "Verified")

  let foundUser = false

  const db = new sqlite3.Database(DB_LOCATION, sqlite3.OPEN_READWRITE)
  db.serialize(async () => {
    db.each(`SELECT * FROM verification WHERE code='${code}'`, (err, row) => {
      console.log(row, err)
      if (!!row) {
        foundUser = true
        const member = guildObj.members.cache.find(m => m.id === row.user)
        
        member.roles.add(verifiedRole.id)
        member.send("You have been successfully verified!")
        res.send("Successfully verified!")
      }
    })
    if (!foundUser) {
      res.send("Invalid ID!")
    }
  })
  db.close()
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

//
// DISCORD
//

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)

  //create db
  //fs.writeFile(DB_LOCATION, '', function(){console.log('Cleared the DB!')})

  const db = new sqlite3.Database(DB_LOCATION, sqlite3.OPEN_READWRITE)
  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS verification(user PRIMARY KEY, code, guild)')
    console.log("added db table")
  })
   
  db.close()
})

client.on('message', async msg => {
  // ignore bot messages
  if (msg.author.bot) return

  // Responses to DMs
  if (msg.channel.type === 'dm') {
    try {
      console.log(client.guilds);
      
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

            const db = new sqlite3.Database(DB_LOCATION, sqlite3.OPEN_READWRITE)
            db.serialize(() => {
              db.run(`DELETE FROM verification WHERE user='${author.id}'`)
              db.run(`INSERT INTO verification (user, code, guild) VALUES('${author.id}', '${code}', '${guildObj.id}')`)
            })
            db.close()

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

client.login(secureData.token)
