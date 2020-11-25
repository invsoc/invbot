# UNSW Investment Society Discord Bot

## Uses
 - Verify if discord user is a real uni student through official email

## Running the instance
### Node.JS
Run `npm start`

### Container
Use container by 
 - `docker build -t sauravyash/invsoc-discord-bot .`
 - `docker run -t -p 80:80 sauravyash/invsoc-discord-bot`

Don't forget to pass env vars.

### Docker-Compose
Add file `docker-compose.yml`

```YML
version: "3.8"

services:
  app:
    build: .
    ports:
      - 80:80
    environment:
      token: ""
      guildID: ""
      DBhost: ""
      DBuser: ""
      DBpassword: ""
      DBdatabase: ""
      user: ""
      port: 80
      clientId: ""
      clientSecret: ""
      accessToken: ""
      refreshToken: ""
      URL: "invsoc-verify.sauravyash.com"
```

## Environment Variables
 - from Client ID to Refresh token must be generated with the google API for Gmail.
 - `token` is for Discord bot
 - DB is for ClearDB instance
 - user is the Gmail email
 - URL is the url used for the server
