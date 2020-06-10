const Discord = require('discord.js')
const client = new Discord.Client()

const express = require('express')
const app = express()
const port = process.env.PORT || 3000

const mysql = require('mysql')

const fs = require('fs')
const secureData = (fs.existsSync(`./token.json`)) ? require('./token.json') : {
  "token": process.env.token,
  "user": process.env.user,
  "pass": process.env.pass,
  "host": process.env.host,
  "port": process.env.smtp_port,
  "guildID": process.env.guildID
}

const connection = mysql.createConnection(process.env.CLEARDB_DATABASE_URL || {
  host: secureData.DBhost,
  user: secureData.DBuser,
  password: secureData.DBpassword,
  database: secureData.DBdatabase
})

let queryDB = (query) => new Promise((resolve, reject) => {
  connection.connect()
  connection.query(query, function (error, results, fields) {
    if (error) reject(error)
    else resolve({results, fields})
  })
  connection.end()
})

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

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
client.login(secureData.token)