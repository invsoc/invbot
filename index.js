const Discord = require('discord.js')
const client = new Discord.Client()
const nodemailer = require("nodemailer")
var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('./bot.db')

const secureData = require('./token.json')

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)

  //create db
  db.serialize(() => {
    db.each("SELECT name FROM sqlite_master WHERE type='table' AND name='verification';", (err, row) => {
        if (!row) db.run('CREATE TABLE verification(user_id code)')
        else console.log("Table exists.")
    })
  })
   
  db.close()
})

client.on('message', async msg => {
  // find verified role
  const verifiedRole = msg.guild?.roles?.cache?.find(id => id.name === "Verified") || {
    id: "719161072640196648",
    name: "Verified"
  }

  const author = msg.guild?.members?.cache?.find(mem => mem.id === msg.author.id)

  // Responses to DMs
  if (msg.channel.type === 'dm') {

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

          let link = "https://sauravyash.com"
          
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
